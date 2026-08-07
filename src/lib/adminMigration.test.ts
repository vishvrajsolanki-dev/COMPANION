import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0002_admin_portal.sql'), 'utf8');
const compactSql = sql.replace(/\s+/g, ' ').toLowerCase();

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
