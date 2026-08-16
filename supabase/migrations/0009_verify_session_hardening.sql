-- ============================================================================
-- 0009 — Verify Device Session Multi-Key Hardening (Batch 2D-1)
-- ----------------------------------------------------------------------------
-- Refactors verify_device_session() to eliminate Cartesian row multiplication
-- when an account possesses multiple access_keys.
--
-- Current Issue:
--   The previous 0008 implementation joined access_keys directly:
--     JOIN public.access_keys ak ON ak.account_id = ds.account_id
--   If an account holds multiple access keys (e.g. key replacement or history),
--   a single session lookup could return multiple join rows, violating the
--   single-session-verification contract and causing non-deterministic
--   assignment during SELECT INTO v_rec.
--
-- Refactored Solution:
--   Join device_sessions ONLY with accounts (1:1 relation on account_id), and
--   evaluate active key presence via a scalar EXISTS subquery on access_keys:
--     EXISTS (
--       SELECT 1 FROM public.access_keys ak
--       WHERE ak.account_id = ds.account_id AND ak.is_active = true
--     )
--   Guarantees at most 1 row returned per session token hash lookup while
--   preserving exact security, expiration, idle timeout, and authorization semantics.
-- ============================================================================

create or replace function public.verify_device_session(p_session_token text)
returns public.session_verification_result
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
  v_res  public.session_verification_result;
  v_rec  record;
begin
  v_res.is_valid := false;

  if p_session_token is null or trim(p_session_token) = '' then
    return v_res;
  end if;

  v_hash := public.hash_session_token(trim(p_session_token));

  -- Query device_sessions joined ONLY with accounts (1:1 relationship),
  -- using an EXISTS subquery on access_keys to eliminate row multiplication
  -- for multi-key accounts.
  select ds.account_id,
         ds.device_id,
         ac.role,
         ds.expires_at,
         ds.last_seen,
         exists (
           select 1
           from public.access_keys ak
           where ak.account_id = ds.account_id
             and ak.is_active = true
         ) as key_active
  into v_rec
  from public.device_sessions ds
  join public.accounts ac on ac.id = ds.account_id
  where ds.session_token_hash = v_hash;

  if not found then
    return v_res;
  end if;

  -- Verify key is active (account must have at least one active access key)
  if not v_rec.key_active then
    return v_res;
  end if;

  -- Absolute expiration check (30 days)
  if v_rec.expires_at < now() then
    return v_res;
  end if;

  -- Idle timeout check (7 days)
  if v_rec.last_seen < (now() - interval '7 days') then
    return v_res;
  end if;

  -- Update last_seen on active session use
  update public.device_sessions
  set last_seen = now()
  where session_token_hash = v_hash;

  v_res.account_id := v_rec.account_id;
  v_res.device_id  := v_rec.device_id;
  v_res.role        := v_rec.role;
  v_res.is_valid    := true;

  return v_res;
end;
$$;

-- Revoke direct execution of internal session verification helper
revoke execute on function public.verify_device_session(text) from public, anon, authenticated;
