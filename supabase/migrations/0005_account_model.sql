-- ============================================================================
-- 0005 — Account model rework (Part A+B+C)
-- ----------------------------------------------------------------------------
-- Converts the access-key system from one-key-per-device with a hard use
-- counter to an account-based multi-device model:
--
--   - Each key belongs to an ACCOUNT (not a device). Multiple keys can map to
--     the same account (e.g. replacement keys).
--   - Activation is idempotent per device: sign out + sign in on the same
--     device never consumes a "use." Device sessions are tracked in a new
--     `device_sessions` table.
--   - `max_uses` becomes an optional soft cap on concurrent active sessions,
--     not a hard one-time-use counter.
--   - All profile creation is keyed by account_id (not key_id), so multiple
--     keys sharing an account share the same profile.
--   - `accounts.student_profile` (jsonb) stores student identity fields
--     captured on first activation (Part C).
--
-- Migration plan for existing live data:
--   1. Create `accounts` and `device_sessions` tables.
--   2. Add nullable `account_id` to access_keys and profiles.
--   3. Backfill: for each existing key, create an account + link it.
--   4. Set account_id NOT NULL + FK constraints after backfill.
--   5. Replace the activate_access_key RPC (no more use-count increment).
--   6. Add sign_out_session, admin_list_sessions, save_student_profile RPCs.
--   7. Update admin_generate_key to create an account alongside the key.
--   8. Update admin_list_keys / admin_list_profiles to show student_profile.
--
-- Idempotent (create or replace / add column if not exists / drop-if-exists).
-- The data migration DO block is re-safe: it only backfills keys that still
-- have account_id = null.
--
-- Run with: node scripts/apply-migration.cjs "<db-conn>" supabase/migrations/0005_account_model.sql
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. NEW TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- accounts — one per "user identity." A key points to an account; multiple keys
-- can share an account (replacement keys). Academic data on each device is
-- scoped to the account via client-side per-account IndexedDB databases.
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  name            text,                          -- display name (set from key label at creation)
  role            text not null check (role in ('student', 'admin', 'owner')),
  student_profile jsonb,                         -- { name, department, enrollment_number } filled on first student activation
  created_at      timestamptz not null default now()
);

-- device_sessions — tracks which devices are signed in per account. Replaces
-- the old "used_count" one-time-use counter. Admin Portal can list/revoke.
create table if not exists public.device_sessions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts (id) on delete cascade,
  device_id    text not null,                    -- client-generated persistent ID (localStorage UUID)
  device_name  text,                             -- optional human-readable label ("Chrome on Windows")
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (account_id, device_id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. ALTER EXISTING TABLES (add nullable account_id first)
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.access_keys
  add column if not exists account_id uuid;

alter table public.profiles
  add column if not exists account_id uuid;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. DATA MIGRATION — backfill account_id for existing rows
-- ══════════════════════════════════════════════════════════════════════════════
-- Safe to re-run: only processes keys that still have account_id = null.

do $$
declare
  v_key       record;
  v_account   uuid;
begin
  for v_key in
    select id, role, label from public.access_keys where account_id is null
  loop
    -- Create an account for this key
    insert into public.accounts (role, name)
    values (v_key.role, v_key.label)
    returning id into v_account;

    -- Link the key to its account
    update public.access_keys set account_id = v_account where id = v_key.id;

    -- Link any existing profile to the same account
    update public.profiles set account_id = v_account where access_key_id = v_key.id;
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. CONSTRAINTS — make account_id non-null + foreign keys
-- ══════════════════════════════════════════════════════════════════════════════

-- access_keys.account_id
alter table public.access_keys
  alter column account_id set not null;

do $$ begin
  alter table public.access_keys
    add constraint access_keys_account_id_fk
    foreign key (account_id) references public.accounts (id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- profiles.account_id
alter table public.profiles
  alter column account_id set not null;

do $$ begin
  alter table public.profiles
    add constraint profiles_account_id_fk
    foreign key (account_id) references public.accounts (id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- Indexes for the new columns
create index if not exists access_keys_account_id_idx on public.access_keys (account_id);
create index if not exists device_sessions_account_id_idx on public.device_sessions (account_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4b. DROP the legacy single-arg activate_access_key(text) from 0001/0003.
-- The new 2-arg version (p_code, p_device_id) is a different Postgres signature;
-- without dropping the old one, a 1-arg call would still resolve to the OLD
-- function with its used_count increment (the A1 bug). Removing it guarantees
-- only the session-based version exists.
-- ══════════════════════════════════════════════════════════════════════════════

revoke execute on function public.activate_access_key(text) from anon, authenticated;
drop function if exists public.activate_access_key(text);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. UPDATED RPC: activate_access_key (idempotent per device, session-based)
-- ══════════════════════════════════════════════════════════════════════════════
-- Key changes from 0003:
--   - Accepts p_device_id (text) for session tracking
--   - No longer increments used_count
--   - Creates/updates a device session (idempotent per account+device)
--   - Profile creation is keyed by account_id (not key_id)
--   - Returns account_id and needs_onboarding flag
--   - Optional session cap via max_uses (soft limit, not hard one-time-use)

create or replace function public.activate_access_key(
  p_code        text,
  p_device_id   text default 'unknown',
  p_device_name text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key          public.access_keys%rowtype;
  v_profile      public.profiles%rowtype;
  v_account      public.accounts%rowtype;
  v_session_count integer;
begin
  -- Look up key (normalize to uppercase).
  select * into v_key
  from public.access_keys
  where code = upper(trim(p_code));

  if not found then
    return json_build_object('ok', false, 'error', 'INVALID_KEY');
  end if;

  -- Rate limiting: while locked, reject.
  if v_key.locked_until is not null and v_key.locked_until > now() then
    return json_build_object(
      'ok', false,
      'error', 'TOO_MANY_ATTEMPTS',
      'retry_after', greatest(0, extract(epoch from (v_key.locked_until - now()))::int)
    );
  end if;

  -- Lock expired: clear the counter.
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

  -- ── Session cap (soft limit via max_uses) ──────────────────────────────────
  -- max_uses = 0 or null means unlimited sessions.
  if v_key.max_uses is not null and v_key.max_uses > 0 then
    select count(*) into v_session_count
    from public.device_sessions
    where account_id = v_key.account_id;

    -- If this device already has a session, it's a re-activation (always OK).
    -- If not, check whether we've hit the cap.
    if not exists (
      select 1 from public.device_sessions
      where account_id = v_key.account_id and device_id = p_device_id
    ) and v_session_count >= v_key.max_uses then
      perform public.register_failed_attempt(v_key.id);
      return json_build_object('ok', false, 'error', 'KEY_EXHAUSTED');
    end if;
  end if;

  -- ── Create / refresh device session (idempotent per device) ────────────────
  insert into public.device_sessions (account_id, device_id, device_name, last_seen)
  values (v_key.account_id, p_device_id, nullif(trim(p_device_name), ''), now())
  on conflict (account_id, device_id)
  do update set last_seen = now(), device_name = nullif(trim(p_device_name), '');

  -- Success clears any accumulated failures.
  update public.access_keys
  set failed_attempts = 0, locked_until = null
  where id = v_key.id;

  -- ── Profile (keyed by account_id, not key_id) ─────────────────────────────
  select * into v_profile
  from public.profiles
  where account_id = v_key.account_id
  limit 1;

  if not found then
    insert into public.profiles (account_id, access_key_id, name, email, role)
    values (v_key.account_id, v_key.id, v_key.label, null, v_key.role)
    returning * into v_profile;
  end if;

  -- ── Account info ───────────────────────────────────────────────────────────
  select * into v_account
  from public.accounts
  where id = v_key.account_id;

  return json_build_object(
    'ok', true,
    'role', v_key.role,
    'account_id', v_key.account_id,
    'profile', json_build_object(
      'id',     v_profile.id,
      'name',   v_profile.name,
      'email',  v_profile.email,
      'role',   v_profile.role
    ),
    -- First-time student activation: student_profile not yet filled.
    'needs_onboarding', (v_account.student_profile is null and v_key.role = 'student')
  );
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. NEW RPC: save_student_profile (Part C — student identity capture)
-- ══════════════════════════════════════════════════════════════════════════════
-- Called by the client after onboarding form submission. Keyed by the caller's
-- account_id (returned by activate_access_key) rather than the raw key — the
-- onboarding flow runs right after activation, when the account_id is known and
-- the student's raw key is deliberately NOT persisted on-device. account_id is
-- an unguessable 128-bit bearer (same trust model as device_id); the payload is
-- self-declared identity (name / department / enrollment number).

create or replace function public.save_student_profile(
  p_account_id        uuid,
  p_name              text,
  p_department        text,
  p_enrollment_number text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile jsonb;
begin
  v_profile := jsonb_build_object(
    'name',               nullif(trim(p_name), ''),
    'department',         nullif(trim(p_department), ''),
    'enrollment_number',  nullif(trim(p_enrollment_number), '')
  );

  update public.accounts
  set student_profile = v_profile
  where id = p_account_id;

  return json_build_object('ok', true, 'student_profile', v_profile);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. NEW RPC: sign_out_session
-- ══════════════════════════════════════════════════════════════════════════════
-- Called by the client on sign-out. Removes exactly one device session,
-- identified by (account_id, device_id) — both are values the client already
-- holds in its activation record. Deleting a session only signs that device
-- back out (re-activation is idempotent), so an anon caller guessing a UUID
-- pair gains nothing beyond a revocable, non-destructive nuisance.

create or replace function public.sign_out_session(p_account_id uuid, p_device_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.device_sessions
  where account_id = p_account_id
    and device_id = p_device_id;

  return json_build_object('ok', true);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. NEW RPC: admin_list_sessions
-- ══════════════════════════════════════════════════════════════════════════════
-- Owner sees all sessions across all accounts. Admin sees sessions for their
-- own account only.

create or replace function public.admin_list_sessions(p_admin_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin     json;
  v_rows      json;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.last_seen desc), '[]')
  into v_rows
  from (
    select ds.id,
           ds.account_id,
           ds.device_id,
           ds.device_name,
           ds.last_seen,
           ds.created_at,
           ac.name   as account_name,
           ac.role   as account_role
    from public.device_sessions ds
    join public.accounts ac on ac.id = ds.account_id
    where (v_admin->>'role' = 'owner')
       or ds.account_id = (
         select account_id from public.access_keys where id = (v_admin->>'id')::uuid
       )
  ) t;

  return json_build_object('ok', true, 'sessions', v_rows);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. NEW RPC: admin_revoke_session
-- ══════════════════════════════════════════════════════════════════════════════
-- Owner can revoke any session; admin can revoke sessions on their own account.
-- Revoking a session signs out that device.

create or replace function public.admin_revoke_session(
  p_admin_code  text,
  p_session_id  uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin    json;
  v_session  public.device_sessions%rowtype;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select * into v_session from public.device_sessions where id = p_session_id;
  if not found then
    return json_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  -- Owner can revoke any session; admin can only revoke own account's sessions.
  if (v_admin->>'role') <> 'owner' then
    if v_session.account_id <> (
      select account_id from public.access_keys where id = (v_admin->>'id')::uuid
    ) then
      return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
    end if;
  end if;

  delete from public.device_sessions where id = p_session_id;

  return json_build_object('ok', true);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. UPDATED RPC: admin_generate_key (creates account alongside key)
-- ══════════════════════════════════════════════════════════════════════════════
-- Same contract as 0004, plus: creates a new account and links the key to it.

create or replace function public.admin_generate_key(
  p_admin_code text,
  p_role       text default 'student',
  p_label      text default null,
  p_max_uses   int  default 1,
  p_expires_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin      json;
  v_role       text;
  v_new        public.access_keys%rowtype;
  v_code       text;
  v_attempt    int := 0;
  v_account_id uuid;
  v_label      text;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;
  v_role := v_admin->>'role';

  -- Normalize the requested role; gate owner/admin minting to the owner.
  p_role := lower(trim(p_role));
  if p_role not in ('student', 'admin', 'owner') then
    p_role := 'student';
  end if;
  if (p_role = 'admin' or p_role = 'owner') and v_role <> 'owner' then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  if p_max_uses is null or p_max_uses < 1 then p_max_uses := 1; end if;
  if p_max_uses > 100 then p_max_uses := 100; end if;

  v_label := nullif(trim(coalesce(p_label, '')), '');

  -- Create the account first (one account per new key).
  insert into public.accounts (role, name)
  values (p_role, v_label)
  returning id into v_account_id;

  -- Mint the key linked to this account.
  loop
    v_attempt := v_attempt + 1;
    v_code := public.gen_access_code();
    begin
      insert into public.access_keys (code, role, label, max_uses, expires_at, created_by, account_id)
      values (
        v_code,
        p_role,
        v_label,
        p_max_uses,
        p_expires_at,
        v_admin->>'code',
        v_account_id
      )
      returning * into v_new;
      exit;
    exception when unique_violation then
      if v_attempt >= 3 then
        -- Clean up the orphaned account on collision.
        delete from public.accounts where id = v_account_id;
        return json_build_object('ok', false, 'error', 'GENERATION_CONFLICT');
      end if;
    end;
  end loop;

  -- Audit the mint.
  perform public.log_admin_action(
    (v_admin->>'id')::uuid,
    v_role,
    'generate_key',
    v_new.id,
    public.mask_access_code(v_new.code),
    jsonb_build_object('role', v_new.role, 'label', v_label, 'max_uses', p_max_uses, 'expires_at', p_expires_at)
  );

  return json_build_object(
    'ok', true,
    'key', json_build_object(
      'id',        v_new.id,
      'code',      v_new.code,
      'role',      v_new.role,
      'label',     v_label,
      'max_uses',  v_new.max_uses,
      'account_id', v_account_id
    )
  );
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. UPDATED RPC: admin_list_keys (shows student_profile from accounts)
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_list_keys(p_admin_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin json;
  v_keys  json;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]')
  into v_keys
  from (
    select ak.id,
           case
             when (v_admin->>'role') = 'owner' or ak.role = 'student'
               then ak.code
             else public.mask_access_code(ak.code)
           end as code,
           ak.role, ak.label, ak.is_active, ak.max_uses,
           -- used_count is legacy; still returned for backwards compat
           ak.used_count, ak.created_at, ak.expires_at,
           ak.account_id,
           ac.student_profile
    from public.access_keys ak
    join public.accounts ac on ac.id = ak.account_id
  ) t;

  return json_build_object('ok', true, 'keys', v_keys);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. UPDATED RPC: admin_list_profiles (shows student_profile from accounts)
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_list_profiles(p_admin_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin    json;
  v_profiles json;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]')
  into v_profiles
  from (
    select p.id, p.name, p.email, p.role, p.created_at,
           ak.label as key_label,
           ac.id    as account_id,
           ac.student_profile
    from public.profiles p
    left join public.access_keys ak on ak.id = p.access_key_id
    left join public.accounts ac on ac.id = p.account_id
  ) t;

  return json_build_object('ok', true, 'profiles', v_profiles);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. UPDATED RPC: admin_set_key_active (log includes account context)
-- ══════════════════════════════════════════════════════════════════════════════
-- When deactivating a key, also revoke all active sessions for that account
-- (forces all devices to re-activate with a fresh key).

create or replace function public.admin_set_key_active(
  p_admin_code text,
  p_key_id     uuid,
  p_active     boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin    json;
  v_role     text;
  v_admin_id uuid;
  v_target   public.access_keys%rowtype;
  v_new_state boolean;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;
  v_role     := v_admin->>'role';
  v_admin_id := (v_admin->>'id')::uuid;

  if p_key_id = v_admin_id then
    return json_build_object('ok', false, 'error', 'CANNOT_MODIFY_SELF');
  end if;

  select * into v_target from public.access_keys where id = p_key_id;
  if not found then
    return json_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_target.role <> 'student' and v_role <> 'owner' then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  v_new_state := coalesce(p_active, true);

  update public.access_keys
  set is_active = v_new_state
  where id = p_key_id;

  -- When deactivating: revoke all active sessions for this account.
  if not v_new_state then
    delete from public.device_sessions
    where account_id = v_target.account_id;
  end if;

  -- Audit the state change (only when it actually flipped).
  if v_target.is_active <> v_new_state then
    perform public.log_admin_action(
      v_admin_id,
      v_role,
      case when v_new_state then 'reactivate_key' else 'deactivate_key' end,
      v_target.id,
      public.mask_access_code(v_target.code),
      jsonb_build_object('was_active', v_target.is_active)
    );
  end if;

  return json_build_object('ok', true);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. GRANTS — new RPCs callable by anon (browser) key
-- ══════════════════════════════════════════════════════════════════════════════
-- Re-grant the updated RPCs and grant the new ones. Internal functions
-- (register_failed_attempt, admin_identity, log_admin_action) stay un-granted.

grant execute on function public.activate_access_key(text, text, text) to anon, authenticated;
grant execute on function public.save_student_profile(uuid, text, text, text) to anon, authenticated;
grant execute on function public.sign_out_session(uuid, text) to anon, authenticated;
grant execute on function public.admin_generate_key(text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_list_keys(text) to anon, authenticated;
grant execute on function public.admin_set_key_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_list_profiles(text) to anon, authenticated;
grant execute on function public.admin_list_sessions(text) to anon, authenticated;
grant execute on function public.admin_revoke_session(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_actions(text) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. RLS — accounts and device_sessions
-- ══════════════════════════════════════════════════════════════════════════════
-- Same model as access_keys/profiles: RLS on, zero anon policies. All reads
-- and writes go through SECURITY DEFINER functions only.

alter table public.accounts         enable row level security;
alter table public.device_sessions  enable row level security;

revoke all on table public.accounts        from anon, authenticated;
revoke all on table public.device_sessions from anon, authenticated;
