-- ============================================================================
-- 0004 — Database cleanup: drop redundant index + action-audit log
-- ----------------------------------------------------------------------------
-- Closes two audit gaps (QA-AUDIT-2026-08-07 §3 Database):
--   1. `access_keys_code_idx` (0001) is redundant — the UNIQUE constraint on
--      `code` already maintains a unique index on the same column, so the
--      extra non-unique index is pure write-path overhead.
--   2. No event log. `access_keys.created_by` records WHO minted a key, but
--      nothing records who deactivated/reactivated what, and when. This adds
--      an `admin_actions` audit table and instruments the two mutating admin
--      RPCs (admin_generate_key, admin_set_key_active) to log every change.
--
-- Idempotent (drop/if not exists/create or replace) so it can be re-run.
--
-- Run with: node scripts/apply-migration.cjs "<db-conn>" supabase/migrations/0004_database_cleanup.sql
-- ============================================================================

-- ── 1. Drop the redundant index ──────────────────────────────────────────────
-- The UNIQUE constraint on access_keys.code already created
-- `access_keys_code_key`; access_keys_code_idx duplicated it.
drop index if exists public.access_keys_code_idx;

-- ── 2. Action-audit table ────────────────────────────────────────────────────
-- One row per privileged mutation. RLS-enabled with NO anon/authenticated
-- policies (same model as access_keys/profiles): the only writers are the
-- SECURITY DEFINER admin RPCs, and the only reader is admin_list_actions()
-- (owner-only). `detail` holds per-action context as jsonb.
create table if not exists public.admin_actions (
  id            uuid primary key default gen_random_uuid(),
  actor_key_id  uuid references public.access_keys (id) on delete set null,
  actor_role    text not null,
  action        text not null,      -- 'generate_key' | 'deactivate_key' | 'reactivate_key'
  target_key_id uuid references public.access_keys (id) on delete set null,
  target_code   text,               -- masked display code of the target key
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- Most-recent-first lookups (used by admin_list_actions).
create index if not exists admin_actions_created_at_idx on public.admin_actions (created_at desc);

-- ── log_admin_action() — internal audit writer ───────────────────────────────
-- Kept un-granted like admin_identity(): only callable by the definer RPCs
-- below (which already run as the table owner and bypass RLS by ownership).
create or replace function public.log_admin_action(
  p_actor_key_id  uuid,
  p_actor_role    text,
  p_action        text,
  p_target_key_id uuid,
  p_target_code   text,
  p_detail        jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_actions (actor_key_id, actor_role, action, target_key_id, target_code, detail)
  values (p_actor_key_id, p_actor_role, p_action, p_target_key_id, p_target_code, p_detail);
$$;

-- ── admin_generate_key (with audit logging) ─────────────────────────────────
-- Same contract as 0002, plus: on success, logs an 'generate_key' row so key
-- distribution is attributable.
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

  -- Audit the mint.
  perform public.log_admin_action(
    (v_admin->>'id')::uuid,
    v_role,
    'generate_key',
    v_new.id,
    public.mask_access_code(v_new.code),
    jsonb_build_object('role', v_new.role, 'label', v_new.label, 'max_uses', v_new.max_uses, 'expires_at', v_new.expires_at)
  );

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

-- ── admin_set_key_active (with audit logging) ───────────────────────────────
-- Same contract as 0002, plus: logs a 'deactivate_key'/'reactivate_key' row
-- so key-state changes are attributable (who did it, to which key, when).
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

  -- Audit the state change (only when it actually flipped).
  if v_target.is_active <> coalesce(p_active, true) then
    perform public.log_admin_action(
      v_admin_id,
      v_role,
      case when coalesce(p_active, true) then 'reactivate_key' else 'deactivate_key' end,
      v_target.id,
      public.mask_access_code(v_target.code),
      jsonb_build_object('was_active', v_target.is_active)
    );
  end if;

  return json_build_object('ok', true);
end;
$$;

-- ── admin_list_actions — owner-only audit read ───────────────────────────────
-- The accountability view: who did what, to which (masked) key, when. Owner
-- only — admins may act but may not read the full audit trail.
create or replace function public.admin_list_actions(p_admin_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin json;
  v_rows  json;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;
  if (v_admin->>'role') <> 'owner' then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]')
  into v_rows
  from (
    select action, actor_role, target_code, detail, created_at
    from public.admin_actions
    limit 200
  ) t;

  return json_build_object('ok', true, 'actions', v_rows);
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Audit rows are privileged; only the definer functions touch them.
alter table public.admin_actions enable row level security;
revoke all on table public.admin_actions from anon, authenticated;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Re-grant the re-created mutating RPCs (grants survive create or replace in
-- Postgres, but re-asserting keeps the file self-contained) and the new
-- owner-only read. log_admin_action stays internal — NOT granted.
grant execute on function public.admin_generate_key(text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_set_key_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_list_actions(text) to anon, authenticated;
