-- ============================================================================
-- 0006 — Reference data (Part D+E: ADIT scraping + subject templates)
-- ----------------------------------------------------------------------------
-- Adds global reference tables for ADIT college-wide faculty and subjects.
-- These are NOT per-account — they are institutional data that the admin
-- populates once per semester via the Admin Portal file-paste or the scraper
-- script, and students read when browsing subject templates.
--
-- Tables:
--   reference_faculty  — faculty members (name, designation, department, email)
--   reference_subjects — curriculum subjects (code, name, department, semester)
--
-- RPCs:
--   get_reference_subjects(p_department)  — read-only, anon-safe
--   get_reference_faculty(p_department)   — read-only, anon-safe
--   admin_upsert_reference_data(p_admin_code, p_faculty, p_subjects) — bulk upsert
--   admin_list_reference_data(p_admin_code) — admin read (counts + sample)
--
-- RLS: SELECT open to anon (public institutional data), all writes via
-- SECURITY DEFINER RPCs only.
--
-- Run with: node scripts/apply-migration.cjs "<db-conn>" supabase/migrations/0006_reference_data.sql
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. NEW TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- reference_faculty — institutional faculty data from adit.ac.in. One row per
-- faculty member, de-duped by (department, name). Soft-deleted with is_deleted.
create table if not exists public.reference_faculty (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  designation text,                    -- e.g. 'Associate Professor', 'Assistant Professor'
  department  text not null,           -- e.g. 'Computer Engineering', 'Information Technology'
  email       text,
  is_deleted  boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (department, name)
);

-- reference_subjects — curriculum subjects from adit.ac.in. One row per unique
-- (department, semester, course_code). Soft-deleted with is_deleted.
create table if not exists public.reference_subjects (
  id           uuid primary key default gen_random_uuid(),
  course_code  text not null,          -- e.g. '102040304'
  name         text not null,          -- e.g. 'Data Structures'
  department   text not null,          -- e.g. 'Computer Engineering'
  semester     integer not null,       -- 1–8 (what's available from the website)
  credits      integer not null default 3,
  ltp          text,                   -- e.g. '4-0-2' — optional, for display
  is_deleted   boolean not null default false,
  updated_at   timestamptz not null default now(),
  unique (department, semester, course_code)
);

-- Indexes for the common query patterns
create index if not exists reference_faculty_dept_idx
  on public.reference_faculty (department) where is_deleted = false;
create index if not exists reference_subjects_dept_sem_idx
  on public.reference_subjects (department, semester) where is_deleted = false;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RLS — open SELECT to anon (public institutional data), writes via RPCs
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.reference_faculty    enable row level security;
alter table public.reference_subjects   enable row level security;

-- Allow anon (the app's Supabase anon key) to read non-deleted rows.
create policy "reference_faculty_select_anon"
  on public.reference_faculty
  for select
  to anon
  using (is_deleted = false);

create policy "reference_subjects_select_anon"
  on public.reference_subjects
  for select
  to anon
  using (is_deleted = false);

-- No INSERT/UPDATE/DELETE policies for anon — all writes go through the
-- SECURITY DEFINER admin RPC below.

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RPC: admin_upsert_reference_data — bulk insert/update reference data
-- ══════════════════════════════════════════════════════════════════════════════
-- Called by the Admin Portal "Data" tab or the scraper script. Accepts JSONB
-- arrays of faculty and subjects. Upserts by natural key (department+name for
-- faculty, department+semester+course_code for subjects).
--
-- p_faculty format:  [{ "name": "...", "designation": "...", "department": "...", "email": "..." }]
-- p_subjects format: [{ "course_code": "...", "name": "...", "department": "...", "semester": 3, "credits": 4, "ltp": "4-0-2" }]

create or replace function public.admin_upsert_reference_data(
  p_admin_code text,
  p_faculty    jsonb default '[]'::jsonb,
  p_subjects   jsonb default '[]'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin    json;
  v_fac      jsonb;
  v_sub      jsonb;
  v_f_inserted int := 0;
  v_f_updated  int := 0;
  v_s_inserted int := 0;
  v_s_updated  int := 0;
  v_name      text;
  v_dept      text;
  v_existing  uuid;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  -- Only owner may upsert reference data.
  if (v_admin->>'role') <> 'owner' then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  -- ── Faculty upsert ──────────────────────────────────────────────────────
  if jsonb_array_length(p_faculty) > 0 then
    for v_fac in select jsonb_array_elements(p_faculty)
    loop
      v_name := nullif(trim(v_fac->>'name'), '');
      v_dept := nullif(trim(v_fac->>'department'), '');

      if v_name is null or v_dept is null then continue; end if;

      -- Try to find existing (by department + name, ignoring deleted).
      select id into v_existing
      from public.reference_faculty
      where department = v_dept
        and name = v_name
        and is_deleted = false;

      if v_existing is not null then
        update public.reference_faculty
        set designation = nullif(trim(v_fac->>'designation'), ''),
            email       = nullif(trim(v_fac->>'email'), ''),
            updated_at  = now()
        where id = v_existing;
        v_f_updated := v_f_updated + 1;
      else
        insert into public.reference_faculty (name, designation, department, email)
        values (
          v_name,
          nullif(trim(v_fac->>'designation'), ''),
          v_dept,
          nullif(trim(v_fac->>'email'), '')
        );
        v_f_inserted := v_f_inserted + 1;
      end if;
    end loop;
  end if;

  -- ── Subjects upsert ─────────────────────────────────────────────────────
  if jsonb_array_length(p_subjects) > 0 then
    for v_sub in select jsonb_array_elements(p_subjects)
    loop
      v_name := nullif(trim(v_sub->>'name'), '');
      v_dept := nullif(trim(v_sub->>'department'), '');

      if v_name is null or v_dept is null then continue; end if;
      if v_sub->>'course_code' is null then continue; end if;

      -- Try to find existing (by department + semester + course_code).
      select id into v_existing
      from public.reference_subjects
      where department = v_dept
        and course_code = v_sub->>'course_code'
        and semester = (v_sub->>'semester')::int
        and is_deleted = false;

      if v_existing is not null then
        update public.reference_subjects
        set name    = v_name,
            credits = coalesce((v_sub->>'credits')::int, 3),
            ltp     = nullif(trim(v_sub->>'ltp'), ''),
            updated_at = now()
        where id = v_existing;
        v_s_updated := v_s_updated + 1;
      else
        insert into public.reference_subjects (course_code, name, department, semester, credits, ltp)
        values (
          v_sub->>'course_code',
          v_name,
          v_dept,
          (v_sub->>'semester')::int,
          coalesce((v_sub->>'credits')::int, 3),
          nullif(trim(v_sub->>'ltp'), '')
        );
        v_s_inserted := v_s_inserted + 1;
      end if;
    end loop;
  end if;

  return json_build_object(
    'ok', true,
    'faculty_inserted', v_f_inserted,
    'faculty_updated',  v_f_updated,
    'subjects_inserted', v_s_inserted,
    'subjects_updated',  v_s_updated
  );
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: admin_list_reference_data — summary counts for Admin Portal
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_list_reference_data(p_admin_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin      json;
  v_fac_count  int;
  v_sub_count  int;
  v_departments jsonb;
begin
  v_admin := public.admin_identity(p_admin_code);
  if v_admin is null then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select count(*) into v_fac_count
  from public.reference_faculty where is_deleted = false;

  select count(*) into v_sub_count
  from public.reference_subjects where is_deleted = false;

  select coalesce(json_agg(distinct dept order by dept), '[]')
  into v_departments
  from (
    select department as dept from public.reference_faculty where is_deleted = false
    union
    select department as dept from public.reference_subjects where is_deleted = false
  ) d;

  return json_build_object(
    'ok', true,
    'faculty_count', v_fac_count,
    'subjects_count', v_sub_count,
    'departments', v_departments
  );
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. GRANTS — RPCs callable by anon (browser) and authenticated
-- ══════════════════════════════════════════════════════════════════════════════
-- get_reference_subjects/faculty are NOT needed as separate RPCs — the anon
-- SELECT policies handle reads. We only need to grant the admin RPC.

grant execute on function public.admin_upsert_reference_data(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.admin_list_reference_data(text) to anon, authenticated;
