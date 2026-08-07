-- ============================================================================
-- 0001 — Access-key activation (Phase B)
-- ----------------------------------------------------------------------------
-- Access keys gate the app: a student enters a code, Supabase validates it via
-- the SECURITY DEFINER function below, atomically consumes one use, and returns
-- the profile + role. The anon key can call the function but can NOT read either
-- table directly (RLS with no anon policies).
--
-- Run this whole file in the Supabase SQL Editor.
-- ============================================================================

-- ── access_keys ──────────────────────────────────────────────────────────────
create table if not exists public.access_keys (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  role       text not null check (role in ('student', 'admin', 'owner')),
  label      text,                          -- e.g. "Vishvraj" or "Sem 5 batch"
  is_active  boolean not null default true,
  max_uses   integer not null default 1,    -- times this key can activate devices
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                   -- null = never
  created_by text
);

create index if not exists access_keys_code_idx on public.access_keys (code);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One profile per access key. Created on first activation; Phase D sync will
-- fan this out per-user, so keep it minimal here.
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  access_key_id uuid not null unique references public.access_keys (id) on delete cascade,
  name          text,
  email         text,
  role          text not null,
  created_at    timestamptz not null default now()
);

-- ── activate_access_key RPC ───────────────────────────────────────────────────
-- SECURITY DEFINER so it can read the key table + write a profile on the anon
-- user's behalf. The update is atomic — two devices activating the same key can
-- never both win the last use.
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
  if not v_key.is_active then
    return json_build_object('ok', false, 'error', 'INACTIVE_KEY');
  end if;
  if v_key.expires_at is not null and v_key.expires_at < now() then
    return json_build_object('ok', false, 'error', 'EXPIRED_KEY');
  end if;
  -- Atomic consumption: the WHERE guard runs under the row lock, so two
  -- concurrent activations can never both win the last remaining use.
  update public.access_keys
  set used_count = used_count + 1
  where id = v_key.id
    and used_count < max_uses;

  if not found then
    return json_build_object('ok', false, 'error', 'KEY_EXHAUSTED');
  end if;

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

-- Anyone holding the (public) anon key may call the activation function.
grant execute on function public.activate_access_key(text) to anon, authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enforce RLS but grant NO anon/authenticated policies: the only way in is the
-- definer function above. Prevents scraping the key table or other profiles.
alter table public.access_keys enable row level security;
alter table public.profiles   enable row level security;

revoke all on table public.access_keys from anon, authenticated;
revoke all on table public.profiles   from anon, authenticated;
