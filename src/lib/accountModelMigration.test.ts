import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0005_account_model.sql'), 'utf8');
const compact = sql.replace(/\s+/g, ' ').toLowerCase();

/** Slice the body of a single `create or replace function` by name. */
const fnBody = (name: string, haystack = compact): string => {
  const start = haystack.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} should be defined`).toBeGreaterThanOrEqual(0);
  const nextFn = haystack.indexOf('create or replace function public.', start + 1);
  return nextFn === -1 ? haystack.slice(start) : haystack.slice(start, nextFn);
};

describe('Phase B — 0005 account model (Part A+B)', () => {
  it('creates the accounts and device_sessions tables', () => {
    expect(compact).toContain('create table if not exists public.accounts (');
    expect(compact).toContain('create table if not exists public.device_sessions (');
    expect(compact).toContain('unique (account_id, device_id)');
  });

  it('adds account_id to access_keys and profiles, then backfills and constrains', () => {
    expect(compact).toContain('alter table public.access_keys add column if not exists account_id uuid');
    expect(compact).toContain('alter table public.profiles add column if not exists account_id uuid');
    // Backfill only touches keys that still have account_id = null (re-runnable).
    expect(compact).toContain('select id, role, label from public.access_keys where account_id is null');
    // Non-null + FK after the backfill.
    expect(compact).toContain('alter column account_id set not null');
    expect(compact).toContain('foreign key (account_id) references public.accounts (id) on delete cascade');
  });

  it('drops the legacy single-arg activate_access_key(text) so the A1 bug overload can never resolve', () => {
    expect(compact).toContain('revoke execute on function public.activate_access_key(text) from anon, authenticated');
    expect(compact).toContain('drop function if exists public.activate_access_key(text)');
  });

  it('defines the new activate_access_key as a definer RPC with device-id params', () => {
    const body = fnBody('activate_access_key');
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('p_device_id text default');
    expect(body).toContain('p_device_name text default');
  });

  it('A1 fix: activation no longer increments used_count anywhere in the success path', () => {
    const activation = fnBody('activate_access_key');
    // The old atomic-consumption update must be gone from the rewritten RPC.
    expect(activation).not.toContain('used_count = used_count + 1');
    // And the used_count comparison gate must be gone too.
    expect(activation).not.toContain('used_count >= max_uses');
  });

  it('activation is idempotent per device via upsert on (account_id, device_id)', () => {
    const activation = fnBody('activate_access_key');
    expect(activation).toContain('on conflict (account_id, device_id)');
    expect(activation).toContain('do update set last_seen = now()');
  });

  it('treats max_uses as a soft session cap, with re-activation always allowed', () => {
    const activation = fnBody('activate_access_key');
    expect(activation).toContain('if v_key.max_uses is not null and v_key.max_uses > 0 then');
    expect(activation).toContain('select count(*) into v_session_count');
    expect(activation).toContain('and v_session_count >= v_key.max_uses then');
    expect(activation).toContain("'error', 'key_exhausted'");
  });

  it('keys profile creation by account_id and returns account_id + needs_onboarding', () => {
    const activation = fnBody('activate_access_key');
    expect(activation).toContain('from public.profiles where account_id = v_key.account_id');
    expect(activation).toContain("'account_id', v_key.account_id");
    expect(activation).toContain("'needs_onboarding', (v_account.student_profile is null and v_key.role = 'student')");
  });

  it('defines the new student-identity and session RPCs as pinned definer functions', () => {
    for (const fn of ['save_student_profile', 'sign_out_session', 'admin_list_sessions', 'admin_revoke_session']) {
      const body = fnBody(fn);
      expect(body).toContain('security definer');
      expect(body).toContain('set search_path = public');
    }
  });

  it('sign_out_session is keyed by account + device (student has no raw key)', () => {
    const body = fnBody('sign_out_session');
    expect(body).toContain('create or replace function public.sign_out_session(p_account_id uuid, p_device_id text)');
    expect(body).toContain('where account_id = p_account_id');
    expect(body).toContain('and device_id = p_device_id');
  });

  it('admin_list_sessions scopes admins to their own account; owners see all', () => {
    const body = fnBody('admin_list_sessions');
    expect(body).toContain('(v_admin->>\'role\' = \'owner\')');
    expect(body).toContain('or ds.account_id = (');
  });

  it('admin_generate_key mints an account alongside each key', () => {
    const body = fnBody('admin_generate_key');
    expect(body).toContain('insert into public.accounts (role, name)');
    expect(body).toContain('returning id into v_account_id');
    expect(body).toContain("'account_id', v_account_id");
  });

  it('admin_set_key_active revokes all device sessions when deactivating a key', () => {
    const body = fnBody('admin_set_key_active');
    expect(body).toContain('if not v_new_state then');
    expect(body).toContain('delete from public.device_sessions');
    expect(body).toContain('where account_id = v_target.account_id');
  });

  it('grants only the public RPCs to the browser roles', () => {
    expect(compact).toContain('grant execute on function public.activate_access_key(text, text, text) to anon, authenticated');
    expect(compact).toContain('grant execute on function public.save_student_profile(uuid, text, text, text) to anon, authenticated');
    expect(compact).toContain('grant execute on function public.sign_out_session(uuid, text) to anon, authenticated');
    expect(compact).toContain('grant execute on function public.admin_list_sessions(text) to anon, authenticated');
    expect(compact).toContain('grant execute on function public.admin_revoke_session(text, uuid) to anon, authenticated');
    // Internal helpers stay un-granted.
    expect(compact).not.toMatch(/grant execute on function public\.register_failed_attempt\(/i);
    expect(compact).not.toMatch(/grant execute on function public\.admin_identity\(/i);
  });

  it('enables RLS on the new tables with zero anon policies (definer-only access)', () => {
    expect(compact).toContain('alter table public.accounts enable row level security');
    expect(compact).toContain('alter table public.device_sessions enable row level security');
    expect(compact).toContain('revoke all on table public.accounts from anon, authenticated');
    expect(compact).toContain('revoke all on table public.device_sessions from anon, authenticated');
  });
});
