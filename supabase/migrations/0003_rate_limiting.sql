-- ============================================================================
-- 0003 — Activation rate limiting (brute-force lockout)
-- ----------------------------------------------------------------------------
-- Adds per-key failed-attempt tracking to activate_access_key: 5 failed
-- activations on the same key → 15-minute lockout (TOO_MANY_ATTEMPTS).
--
-- Design notes
--   * Counter + lock live as columns on access_keys (failed_attempts,
--     locked_until) so they die with the row and need no extra table.
--   * Failures are counted for EXISTING keys only (INACTIVE_KEY, EXPIRED_KEY,
--     KEY_EXHAUSTED). A wrong guess (INVALID_KEY) matches no row, so there is
--     nothing per-key to attribute it to — and the 32^16 code space already
--     makes random guessing infeasible. The lockout's real job is stopping a
--     leaked/known code from being hammered (e.g. replayed attempts on an
--     exhausted or deactivated key).
--   * Successful activation resets the counter; an expired lock auto-clears on
--     the next attempt.
--   * Idempotent: add column if not exists + create or replace function, so it
--     can be re-run safely in the SQL Editor.
--
-- Run with: node scripts/apply-migration.cjs "<db-conn>" supabase/migrations/0003_rate_limiting.sql
-- ============================================================================

alter table public.access_keys
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;

-- ── register_failed_attempt() — internal lockout bookkeeping ─────────────────
-- Increments the key's failure counter and arms the 15-minute lock the moment
-- the counter crosses the threshold. Single atomic UPDATE (the CASE reads the
-- pre-increment value for every row in this statement). Kept un-granted, like
-- admin_identity: only callable from the definer functions above it.
create or replace function public.register_failed_attempt(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_keys
  set failed_attempts = failed_attempts + 1,
      locked_until    = case
                          when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
                          else locked_until
                        end
  where id = p_key_id;
end;
$$;

-- ── activate_access_key (rate-limited rewrite) ───────────────────────────────
-- Same contract as 0001, plus:
--   * a locked key returns TOO_MANY_ATTEMPTS (with retry_after seconds)
--   * each failure increments the counter; the 5th arms the lock
--   * success clears the counter and any stale lock
create or replace function public.activate_access_key(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key     public.access_keys%rowtype;
  v_profile public.profiles%rowtype;
begin
  -- Keys are uppercase groups like "ACAD-XXXX-XXXX-XXXX"; normalize input.
  select * into v_key
  from public.access_keys
  where code = upper(trim(p_code));

  if not found then
    return json_build_object('ok', false, 'error', 'INVALID_KEY');
  end if;

  -- Rate limiting: while locked, reject without consuming a use.
  if v_key.locked_until is not null and v_key.locked_until > now() then
    return json_build_object(
      'ok', false,
      'error', 'TOO_MANY_ATTEMPTS',
      'retry_after', greatest(0, extract(epoch from (v_key.locked_until - now()))::int)
    );
  end if;

  -- Lock expired: clear the counter so a legit holder can try again.
  if v_key.locked_until is not null and v_key.locked_until <= now() then
    update public.access_keys
    set failed_attempts = 0, locked_until = null
    where id = v_key.id;
    v_key.failed_attempts := 0;
    v_key.locked_until    := null;
  end if;

  if not v_key.is_active then
    perform public.register_failed_attempt(v_key.id);
    return json_build_object('ok', false, 'error', 'INACTIVE_KEY');
  end if;
  if v_key.expires_at is not null and v_key.expires_at < now() then
    perform public.register_failed_attempt(v_key.id);
    return json_build_object('ok', false, 'error', 'EXPIRED_KEY');
  end if;

  -- Atomic consumption: the WHERE guard runs under the row lock, so two
  -- concurrent activations can never both win the last remaining use.
  update public.access_keys
  set used_count = used_count + 1
  where id = v_key.id
    and used_count < max_uses;

  if not found then
    perform public.register_failed_attempt(v_key.id);
    return json_build_object('ok', false, 'error', 'KEY_EXHAUSTED');
  end if;

  -- Success clears any accumulated failures.
  update public.access_keys
  set failed_attempts = 0, locked_until = null
  where id = v_key.id;

  select * into v_profile
  from public.profiles
  where access_key_id = v_key.id
  limit 1;

  if not found then
    insert into public.profiles (access_key_id, name, email, role)
    values (v_key.id, v_key.label, null, v_key.role)
    returning * into v_profile;
  end if;

  return json_build_object(
    'ok', true,
    'role', v_key.role,
    'profile', json_build_object(
      'id',     v_profile.id,
      'name',   v_profile.name,
      'email',  v_profile.email,
      'role',   v_profile.role
    )
  );
end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The browser (anon) may keep calling the activation RPC. The lockout helper
-- is internal and deliberately NOT granted (mirrors admin_identity in 0002).
grant execute on function public.activate_access_key(text) to anon, authenticated;
