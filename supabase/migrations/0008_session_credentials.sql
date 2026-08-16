-- ============================================================================
-- 0008 — Server-Issued Device Session Credentials (Security Hardening Batch 1)
-- ----------------------------------------------------------------------------
-- Replaces un-validated client-supplied account_id parameter authorization with
-- Server-Issued Session Tokens:
--
--  1. activate_access_key generates a 256-bit CSPRNG token (session_token).
--  2. The server stores ONLY a SHA-256 hash (session_token_hash) in device_sessions.
--  3. The raw session_token is returned once to the client and stored in localStorage.
--  4. save_student_profile and sign_out_session require p_session_token.
--  5. The server derives account_id and device_id from the token hash via
--     verify_device_session(). Client account_id is NEVER trusted as a bearer.
--  6. Enforces 30-day absolute expiration and 7-day idle timeout.
--  7. Explicitly DROPS legacy parameter signatures (save_student_profile with UUID
--     and sign_out_session with 2 args) to eliminate legacy bearer vectors.
--
-- Existing active sessions without a token hash are purged (Policy A: invalidate
-- legacy sessions; student re-activates with key to receive fresh 256-bit token).
-- ============================================================================

-- ── 1. Extensions & Table Schema Updates ─────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;

alter table public.device_sessions
  add column if not exists session_token_hash text,
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

-- Invalidate legacy sessions created prior to 0008 migration
delete from public.device_sessions where session_token_hash is null;

-- Make session_token_hash required
alter table public.device_sessions
  alter column session_token_hash set not null;

-- Compound index for fast token hash lookups
create index if not exists device_sessions_token_hash_idx
  on public.device_sessions (session_token_hash);

-- ── 2. Helper Functions: Token Generation & SHA-256 Hashing ───────────────────
create or replace function public.gen_session_token()
returns text
language sql
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- ── 3. Internal Session Verification Helper ──────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_verification_result') then
    create type public.session_verification_result as (
      account_id  uuid,
      device_id   text,
      role        text,
      is_valid    boolean
    );
  end if;
end $$;

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

  select ds.account_id, ds.device_id, ac.role, ds.expires_at, ds.last_seen, ak.is_active as key_active
  into v_rec
  from public.device_sessions ds
  join public.accounts ac on ac.id = ds.account_id
  join public.access_keys ak on ak.account_id = ds.account_id
  where ds.session_token_hash = v_hash;

  if not found then
    return v_res;
  end if;

  -- Verify key is active
  if not coalesce(v_rec.key_active, true) then
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

-- ── 4. Updated activate_access_key RPC (returns session_token once) ─────────
create or replace function public.activate_access_key(
  p_code        text,
  p_device_id   text default 'unknown',
  p_device_name text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_key           public.access_keys%rowtype;
  v_profile       public.profiles%rowtype;
  v_account       public.accounts%rowtype;
  v_session_count integer;
  v_session_token text;
  v_token_hash    text;
begin
  -- Look up key (normalize to uppercase).
  select * into v_key
  from public.access_keys
  where code = upper(trim(p_code));

  if not found then
    return json_build_object('ok', false, 'error', 'INVALID_KEY');
  end if;

  -- Rate limiting lock check
  if v_key.locked_until is not null and v_key.locked_until > now() then
    return json_build_object(
      'ok', false,
      'error', 'TOO_MANY_ATTEMPTS',
      'retry_after', greatest(0, extract(epoch from (v_key.locked_until - now()))::int)
    );
  end if;

  -- Clear expired lock
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

  -- Session cap check
  if v_key.max_uses is not null and v_key.max_uses > 0 then
    select count(*) into v_session_count
    from public.device_sessions
    where account_id = v_key.account_id;

    if not exists (
      select 1 from public.device_sessions
      where account_id = v_key.account_id and device_id = p_device_id
    ) and v_session_count >= v_key.max_uses then
      perform public.register_failed_attempt(v_key.id);
      return json_build_object('ok', false, 'error', 'KEY_EXHAUSTED');
    end if;
  end if;

  -- Generate 256-bit token & hash
  v_session_token := public.gen_session_token();
  v_token_hash    := public.hash_session_token(v_session_token);

  -- Create or update device session with session_token_hash
  insert into public.device_sessions (
    account_id, device_id, device_name, last_seen, session_token_hash, expires_at
  )
  values (
    v_key.account_id, p_device_id, nullif(trim(p_device_name), ''), now(), v_token_hash, now() + interval '30 days'
  )
  on conflict (account_id, device_id)
  do update set
    last_seen = now(),
    device_name = nullif(trim(p_device_name), ''),
    session_token_hash = v_token_hash,
    expires_at = now() + interval '30 days';

  -- Clear accumulated failures on success
  update public.access_keys
  set failed_attempts = 0, locked_until = null
  where id = v_key.id;

  -- Fetch or create profile
  select * into v_profile
  from public.profiles
  where account_id = v_key.account_id
  limit 1;

  if not found then
    insert into public.profiles (account_id, access_key_id, name, email, role)
    values (v_key.account_id, v_key.id, v_key.label, null, v_key.role)
    returning * into v_profile;
  end if;

  select * into v_account
  from public.accounts
  where id = v_key.account_id;

  return json_build_object(
    'ok', true,
    'role', v_key.role,
    'account_id', v_key.account_id,
    'session_token', v_session_token,
    'profile', json_build_object(
      'id',     v_profile.id,
      'name',   v_profile.name,
      'email',  v_profile.email,
      'role',   v_profile.role
    ),
    'needs_onboarding', (v_account.student_profile is null and v_key.role = 'student')
  );
end;
$$;

-- ── 5. Drop Legacy Signature RPCs ─────────────────────────────────────────────
drop function if exists public.save_student_profile(uuid, text, text, text);
drop function if exists public.sign_out_session(uuid, text);

-- ── 6. Redesigned Token-Based save_student_profile RPC ───────────────────────
create or replace function public.save_student_profile(
  p_session_token     text,
  p_name              text,
  p_department        text,
  p_enrollment_number text
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth public.session_verification_result;
  v_prof jsonb;
begin
  v_auth := public.verify_device_session(p_session_token);
  if not v_auth.is_valid then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED_SESSION');
  end if;

  v_prof := jsonb_build_object(
    'name',              nullif(trim(p_name), ''),
    'department',        nullif(trim(p_department), ''),
    'enrollment_number', nullif(trim(p_enrollment_number), '')
  );

  update public.accounts
  set student_profile = v_prof
  where id = v_auth.account_id;

  return json_build_object('ok', true, 'student_profile', v_prof);
end;
$$;

-- ── 7. Redesigned Token-Based sign_out_session RPC ───────────────────────────
create or replace function public.sign_out_session(p_session_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth public.session_verification_result;
begin
  v_auth := public.verify_device_session(p_session_token);
  if not v_auth.is_valid then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED_SESSION');
  end if;

  delete from public.device_sessions
  where session_token_hash = public.hash_session_token(trim(p_session_token));

  return json_build_object('ok', true);
end;
$$;

-- ── 8. Function Grant Hardening ───────────────────────────────────────────────
-- Revoke direct execution of internal session helper functions from public/anon/authenticated.
revoke execute on function public.gen_session_token() from public, anon, authenticated;
revoke execute on function public.hash_session_token(text) from public, anon, authenticated;
revoke execute on function public.verify_device_session(text) from public, anon, authenticated;

-- Grant execution ONLY to public API RPCs
grant execute on function public.activate_access_key(text, text, text) to anon, authenticated;
grant execute on function public.save_student_profile(text, text, text, text) to anon, authenticated;
grant execute on function public.sign_out_session(text) to anon, authenticated;
