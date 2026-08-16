-- ══════════════════════════════════════════════════════════════════════════════
-- 0007_key_limits.sql
-- Two changes:
--  1. admin_generate_key default max_uses bumped from 1 → 5 so newly minted
--     keys get headroom out of the box.  (CREATE OR REPLACE — overwrites 0005.)
--  2. New admin_update_key_limits RPC lets owners adjust max_uses on an
--     existing key without raw SQL.  Mirrors admin_set_key_active's auth gate.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. admin_generate_key: default max_uses =5 ───────────────────────────────
create or replace function public.admin_generate_key(
  p_admin_code text,
  p_role       text default 'student',
  p_label      text default null,
  p_max_uses   int  default 5,
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

  insert into public.accounts (role, name)
  values (p_role, v_label)
  returning id into v_account_id;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.gen_access_code();
    begin
      insert into public.access_keys (code, role, label, max_uses, expires_at, created_by, account_id)
      values (v_code, p_role, v_label, p_max_uses, p_expires_at, v_admin->>'code', v_account_id)
      returning * into v_new;
      exit;
    exception when unique_violation then
      if v_attempt >= 3 then
        delete from public.accounts where id = v_account_id;
        return json_build_object('ok', false, 'error', 'GENERATION_CONFLICT');
      end if;
    end;
  end loop;

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
      'id',         v_new.id,
      'code',       v_new.code,
      'role',       v_new.role,
      'label',      v_label,
      'max_uses',   v_new.max_uses,
      'account_id', v_account_id
    )
  );
end;
$$;

-- ── 2. NEW RPC: admin_update_key_limits ───────────────────────────────────────
-- Owner-only: update max_uses on any key (student, admin, or owner).
-- Mirrors admin_set_key_active's auth pattern + CANNOT_MODIFY_SELF guard.

create or replace function public.admin_update_key_limits(
  p_admin_code text,
  p_key_id     uuid,
  p_max_uses   int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin  json;
  v_role   text;
  v_admin_id uuid;
  v_target public.access_keys%rowtype;
  v_new_cap int;
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

  -- Only owners may adjust limits on any key (admins can only adjust their own account's keys, which
  -- is not currently a separate path — owner-only gate is the simplest safe default).
  if v_role <> 'owner' then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  v_new_cap := coalesce(p_max_uses, 1);
  if v_new_cap < 1 then v_new_cap := 1; end if;
  if v_new_cap > 100 then v_new_cap := 100; end if;

  update public.access_keys
  set max_uses = v_new_cap
  where id = p_key_id;

  perform public.log_admin_action(
    v_admin_id,
    v_role,
    'update_key_limits',
    v_target.id,
    public.mask_access_code(v_target.code),
    jsonb_build_object('old_max_uses', v_target.max_uses, 'new_max_uses', v_new_cap)
  );

  return json_build_object('ok', true);
end;
$$;

-- ── 3. GRANTS ─────────────────────────────────────────────────────────────────
grant execute on function public.admin_generate_key(text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_update_key_limits(text, uuid, int) to anon, authenticated;
