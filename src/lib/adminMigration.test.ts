import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0002_admin_portal.sql'), 'utf8');
const compactSql = sql.replace(/\s+/g, ' ').toLowerCase();
const compactRawSql = sql.replace(/\s+/g, ' ');

describe('Phase C admin portal migration', () => {
  it('defines every admin RPC as a security-definer function pinned to the public search path', () => {
    const functionNames = [
      'admin_identity',
      'admin_generate_key',
      'admin_list_keys',
      'admin_set_key_active',
      'admin_list_profiles',
    ];

    for (const fn of functionNames) {
      const start = compactSql.indexOf(`create or replace function public.${fn}`);
      expect(start, `${fn} should be defined`).toBeGreaterThanOrEqual(0);

      const nextFn = compactSql.indexOf('create or replace function public.', start + 1);
      const body = nextFn === -1 ? compactSql.slice(start) : compactSql.slice(start, nextFn);

      expect(body, `${fn} should run as a definer RPC`).toContain('security definer');
      expect(body, `${fn} should pin search_path`).toContain('set search_path = public');
    }
  });

  it('does not grant direct access to the internal admin identity gate', () => {
    expect(compactSql).toContain('create or replace function public.admin_identity');
    expect(compactSql).not.toMatch(/grant execute on function public\.admin_identity\(/i);
  });

  it('grants only the public admin RPCs to the browser roles', () => {
    expect(compactSql).toContain('grant execute on function public.admin_generate_key(text, text, text, int, timestamptz) to anon, authenticated');
    expect(compactSql).toContain('grant execute on function public.admin_list_keys(text) to anon, authenticated');
    expect(compactSql).toContain('grant execute on function public.admin_set_key_active(text, uuid, boolean) to anon, authenticated');
    expect(compactSql).toContain('grant execute on function public.admin_list_profiles(text) to anon, authenticated');
  });

  it('authorizes admin actions using an active owner/admin key only', () => {
    expect(compactSql).toContain("where code = upper(trim(p_code)) and is_active and role in ('admin', 'owner')");
  });

  it('allows only owners to mint admin/owner keys', () => {
    expect(compactSql).toContain("if (p_role = 'admin' or p_role = 'owner') and v_role <> 'owner' then");
    expect(compactSql).toContain("return json_build_object('ok', false, 'error', 'unauthorized')");
  });

  it('prevents an admin from deactivating their own key', () => {
    expect(compactSql).toContain('if p_key_id = v_admin_id then');
    expect(compactSql).toContain("return json_build_object('ok', false, 'error', 'cannot_modify_self')");
  });

  it('keeps key generation bounded and collision-aware', () => {
    expect(compactSql).toContain('if p_max_uses is null or p_max_uses < 1 then p_max_uses := 1; end if');
    expect(compactSql).toContain('if p_max_uses > 100 then p_max_uses := 100; end if');
    expect(compactSql).toContain('exception when unique_violation then');
    expect(compactSql).toContain('if v_attempt >= 3 then');
    expect(compactSql).toContain("return json_build_object('ok', false, 'error', 'generation_conflict')");
  });
});

describe('Phase C — Gap A: privileged-code masking in admin_list_keys', () => {
  it('defines mask_access_code as an immutable SQL helper', () => {
    const start = compactSql.indexOf('create or replace function public.mask_access_code(');
    expect(start, 'mask_access_code should be defined').toBeGreaterThanOrEqual(0);

    const nextFn = compactSql.indexOf('create or replace function public.', start + 1);
    const body = nextFn === -1 ? compactSql.slice(start) : compactSql.slice(start, nextFn);

    expect(body).toContain('language sql');
    expect(body).toContain('immutable');
  });

  it('masks with the ACAD-****-****-1A2B shape (first + last 4-char groups, literal middle)', () => {
    // Reveals only the first + last 4-char groups; the middle two groups are
    // literal asterisks — visually identifiable and unusable as a credential.
    const start = compactSql.indexOf('create or replace function public.mask_access_code(');
    expect(start).toBeGreaterThanOrEqual(0);
    const body = compactSql.slice(start, compactSql.indexOf('create or replace function public.', start + 1));

    expect(body).toContain("left(coalesce(p_code, ''), 4) || '-****-****-' || right(coalesce(p_code, ''), 4)");
  });

  it('does not leak admin/owner codes to a non-owner admin caller', () => {
    // The CASE: owner callers (or student rows) get the raw code; every other
    // row (admin + owner codes) is masked for anyone who is not the owner.
    expect(compactSql).toContain('case');
    expect(compactSql).toContain("when (v_admin->>'role') = 'owner' or role = 'student' then code");
    expect(compactSql).toContain('else public.mask_access_code(code)');
  });

  it('shows owner callers every full code', () => {
    // The masking branch must be gated on role — an owner reads full codes
    // unconditionally. Guard against a regression that masks everyone.
    const listStart = compactSql.indexOf('create or replace function public.admin_list_keys(');
    expect(listStart).toBeGreaterThanOrEqual(0);
    const listBody = compactSql.slice(listStart, compactSql.indexOf('create or replace function public.', listStart + 1));

    expect(listBody).toContain("(v_admin->>'role') = 'owner'");
    expect(listBody).not.toContain("else public.mask_access_code(code) when (v_admin->>'role') = 'owner'");
  });
});
