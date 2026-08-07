-- ============================================================================
-- 0002 — Admin portal (Phase C)
-- ----------------------------------------------------------------------------
-- RPCs the admin/owner can call to mint and manage access keys. The caller's
-- own access key IS the credential: every function takes p_admin_code and only
-- acts when that code resolves to an ACTIVE key with role 'admin' or 'owner'.
-- Same model as 0001: anon key can execute, RLS still blocks direct reads.
--
-- Run with: node scripts/apply-migration.cjs "<db-conn>" supabase/migrations/0002_admin_portal.sql
-- ============================================================================

-- ── gen_access_code() — server-side key minting ──────────────────────────────
-- Ambiguity-free alphabet (no 0/O/1/I) → easy to type by hand, same format the
-- Phase B CLI used: XXXX-XXXX-XXXX-XXXX.
create or replace function public.gen_access_code()
returns text
language plpgsql
as $$
declare
  v_chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code   text := '';
  v_group  int;
  v_char   int;
begin
  for v_group in 1..4 loop
    if v_group > 1 then v_code := v_code || '-'; end if;
    for v_char in 1..4 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
  end loop;
  return v_code;
end;
$$;

-- ── admin_identity() — internal gate used by every admin RPC ─────────────────
-- Returns { id, role, code } for the admin/owner key, or NULL if the code is
-- unknown / inactive / not an admin. Kept un-granted: only called by the
-- definer functions below (which already run as the table owner), so it is
-- never directly invocable by the anon key.
create or replace function public.admin_identity(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.access_keys%rowtype;
begin
  select * into v_key
  from public.access_keys
  where code = upper(trim(p_code))
    and is_active
    and role in ('admin', 'owner');
  if not found then
    return null;
  end if;
  return json_build_object('id', v_key.id, 'role', v_key.role, 'code', v_key.code);
end;
$$;

-- ── admin_generate_key ───────────────────────────────────────────────────────
-- Mint a new access key. owner may mint any role; admin may mint student only.
-- Clamps max_uses to [1,100]; retries up to 3x on code collision.
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
  v_admin   json;
  v_role    text;
  v_new     public.access_keys%rowtype;
  v_code    text;
  v_attempt int := 0;
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

  loop
    v_attempt := v_attempt + 1;
    v_code := public.gen_access_code();
    begin
      insert into public.access_keys (code, role, label, max_uses, expires_at, created_by)
      values (
        v_code,
        p_role,
        nullif(trim(coalesce(p_label, '')), ''),
        p_max_uses,
        p_expires_at,
        v_admin->>'code'
      )
      returning * into v_new;
      exit;
    exception when unique_violation then
      if v_attempt >= 3 then
        return json_build_object('ok', false, 'error', 'GENERATION_CONFLICT');
      end if;
    end;
  end loop;

  return json_build_object(
    'ok', true,
    'key', json_build_object(
      'id',       v_new.id,
      'code',     v_new.code,
      'role',     v_new.role,
      'label',    v_new.label,
      'max_uses', v_new.max_uses
    )
  );
end;
$$;

-- ── admin_list_keys ──────────────────────────────────────────────────────────
-- Full codes are returned — the admin is the distributor.
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
    select id, code, role, label, is_active, max_uses, used_count, created_at, expires_at
    from public.access_keys
  ) t;

  return json_build_object('ok', true, 'keys', v_keys);
end;
$$;

-- ── admin_set_key_active ─────────────────────────────────────────────────────
-- Deactivate / reactivate a key. Cannot touch your own key (locks you out);
-- toggling admin/owner keys requires the caller to be the owner.
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

  update public.access_keys
  set is_active = coalesce(p_active, true)
  where id = p_key_id;

  return json_build_object('ok', true);
end;
$$;

-- ── admin_list_profiles ──────────────────────────────────────────────────────
-- Who has activated, with the label of the key they used.
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
           ak.label as key_label
    from public.profiles p
    left join public.access_keys ak on ak.id = p.access_key_id
  ) t;

  return json_build_object('ok', true, 'profiles', v_profiles);
end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The anon key may execute the admin RPCs (which self-authorize via
-- p_admin_code). admin_identity is deliberately NOT granted — internal only.
grant execute on function public.gen_access_code() to anon, authenticated;
grant execute on function public.admin_generate_key(text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_list_keys(text) to anon, authenticated;
grant execute on function public.admin_set_key_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_list_profiles(text) to anon, authenticated;
