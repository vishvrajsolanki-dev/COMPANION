import { describe, it, expect } from 'vitest';
import {
  mapAdminError,
  mapGenerateKeyResult,
  mapKeyListResult,
  mapSetActiveResult,
  mapProfileListResult,
  mapActionListResult,
  mapSessionListResult,
  isMaskedCode,
  ADMIN_ERROR_MESSAGES,
  classifyPostgrestError,
  formatAdminError,
  type AdminErrorCode,
  type AdminKeyRecord,
  type AdminProfileRecord,
  type AdminActionRecord,
  type AdminSessionRecord,
} from './adminKeys';

describe('isMaskedCode', () => {
  it('flags codes redacted by mask_access_code', () => {
    expect(isMaskedCode('ACAD-****-****-1A2B')).toBe(true);
    expect(isMaskedCode('AAAA-****-****-ZZZZ')).toBe(true);
    expect(isMaskedCode('****-****-****-****')).toBe(true);
  });

  it('does not flag full, usable codes', () => {
    expect(isMaskedCode('ABCD-EFGH-JKLM-NPQR')).toBe(false);
    expect(isMaskedCode('ABCD-EFGH-JKLM-NPQR')).toBe(false);
    expect(isMaskedCode('')).toBe(false);
  });

  it('does not flag non-string values', () => {
    expect(isMaskedCode(null as unknown as string)).toBe(false);
    expect(isMaskedCode(undefined as unknown as string)).toBe(false);
    expect(isMaskedCode(123 as unknown as string)).toBe(false);
    expect(isMaskedCode({} as unknown as string)).toBe(false);
  });
});

describe('mapAdminError', () => {
  it('passes through every known server error code', () => {
    expect(mapAdminError({ ok: false, error: 'UNAUTHORIZED' })).toBe('UNAUTHORIZED');
    expect(mapAdminError({ ok: false, error: 'GENERATION_CONFLICT' })).toBe('GENERATION_CONFLICT');
    expect(mapAdminError({ ok: false, error: 'CANNOT_MODIFY_SELF' })).toBe('CANNOT_MODIFY_SELF');
    expect(mapAdminError({ ok: false, error: 'NOT_FOUND' })).toBe('NOT_FOUND');
  });

  it('falls back to UNKNOWN for unrecognized errors and junk', () => {
    expect(mapAdminError({ ok: false, error: 'SOMETHING_ELSE' })).toBe('UNKNOWN');
    expect(mapAdminError({ ok: false })).toBe('UNKNOWN');
    expect(mapAdminError(null)).toBe('UNKNOWN');
    expect(mapAdminError('nope')).toBe('UNKNOWN');
  });
});

describe('classifyPostgrestError', () => {
  it('classifies a PostgREST error (has code) as SERVER with detail', () => {
    const res = classifyPostgrestError({
      code: 'PGRST202',
      message: 'Could not find the function public.admin_update_key_limits',
      details: 'Searched for the function public.admin_update_key_limits in schema cache',
      hint: null,
    });
    expect(res.error).toBe('SERVER');
    expect(res.detail).toContain('PGRST202');
    expect(res.detail).toContain('Could not find the function');
  });

  it('classifies a Postgres SQL error (SQLSTATE code) as SERVER', () => {
    const res = classifyPostgrestError({
      code: '42501',
      message: 'permission denied for function admin_upsert_reference_data',
    });
    expect(res.error).toBe('SERVER');
    expect(res.detail).toContain('42501');
  });

  it('classifies a network TypeError (no code) as NETWORK', () => {
    const err = new TypeError('Failed to fetch');
    expect(classifyPostgrestError(err).error).toBe('NETWORK');
  });

  it('classifies junk without a code as NETWORK', () => {
    expect(classifyPostgrestError(null).error).toBe('NETWORK');
    expect(classifyPostgrestError(undefined).error).toBe('NETWORK');
    expect(classifyPostgrestError('nope').error).toBe('NETWORK');
    expect(classifyPostgrestError({}).error).toBe('NETWORK');
    expect(classifyPostgrestError({ message: 'Failed to fetch' }).error).toBe('NETWORK');
  });
});

describe('formatAdminError', () => {
  it('returns empty string for a success result', () => {
    expect(formatAdminError({ ok: true, data: [] })).toBe('');
  });

  it('returns the base message for an app-level rejection without detail', () => {
    expect(formatAdminError({ ok: false, error: 'NOT_FOUND' })).toBe(ADMIN_ERROR_MESSAGES.NOT_FOUND);
  });

  it('appends the server-side detail for SERVER failures', () => {
    const res = formatAdminError({ ok: false, error: 'SERVER', detail: 'PGRST202 — Could not find the function' });
    expect(res).toBe(`${ADMIN_ERROR_MESSAGES.SERVER} (PGRST202 — Could not find the function)`);
  });
});

describe('mapGenerateKeyResult', () => {
  it('maps a success payload into a typed key with all fields defaulted', () => {
    const res = mapGenerateKeyResult({
      ok: true,
      key: { id: 'k-1', code: 'ABCD-EFGH-JKLM-NPQR', role: 'student', label: 'Tester', max_uses: 2 },
    });
    expect(res).toEqual({
      ok: true,
      data: {
        id: 'k-1',
        code: 'ABCD-EFGH-JKLM-NPQR',
        role: 'student',
        label: 'Tester',
        is_active: true,
        max_uses: 2,
        used_count: 0,
        created_at: null,
        expires_at: null,
        account_id: '',
        student_profile: null,
      },
    });
  });

  it('maps an owner key with all optional fields present', () => {
    const res = mapGenerateKeyResult({
      ok: true,
      key: {
        id: 'k-2',
        code: 'XXXX-YYYY-ZZZZ-WWWW',
        role: 'owner',
        label: 'Vishvraj',
        is_active: true,
        max_uses: 100,
        used_count: 5,
        created_at: '2026-08-06T12:00:00Z',
        expires_at: '2027-08-06T12:00:00Z',
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.role).toBe('owner');
      expect(res.data.max_uses).toBe(100);
      expect(res.data.used_count).toBe(5);
      expect(res.data.created_at).toBe('2026-08-06T12:00:00Z');
      expect(res.data.expires_at).toBe('2027-08-06T12:00:00Z');
    }
  });

  it('maps an UNAUTHORIZED rejection', () => {
    expect(mapGenerateKeyResult({ ok: false, error: 'UNAUTHORIZED' })).toEqual({ ok: false, error: 'UNAUTHORIZED' });
  });

  it('maps a GENERATION_CONFLICT rejection', () => {
    expect(mapGenerateKeyResult({ ok: false, error: 'GENERATION_CONFLICT' })).toEqual({ ok: false, error: 'GENERATION_CONFLICT' });
  });

  it('rejects malformed payloads', () => {
    expect(mapGenerateKeyResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapGenerateKeyResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapGenerateKeyResult({ ok: true, key: { code: 'only-code' } })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapGenerateKeyResult({ ok: true, key: null })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapGenerateKeyResult({ ok: true, key: 'not-an-object' })).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});

describe('mapKeyListResult', () => {
  it('maps a key array and fills in defaults', () => {
    const res = mapKeyListResult({
      ok: true,
      keys: [
        { id: 'k-1', code: 'AAAA-BBBB-CCCC-DDDD', role: 'owner', label: null, is_active: true, max_uses: 10, used_count: 3, created_at: '2026-08-06T00:00:00Z', expires_at: null },
        { id: 'k-2', code: 'EEEE-FFFF-GGGG-HHHH', role: 'student', label: 'Tester', max_uses: 2, used_count: 0 },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0].role).toBe('owner');
      expect(res.data[1].used_count).toBe(0);
    }
  });

  it('drops malformed rows instead of failing the whole list', () => {
    const res = mapKeyListResult({ ok: true, keys: [{ id: 'k-1', code: 'OK-1' }, 'junk', null] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);
  });

  it('returns empty array for empty keys list', () => {
    const res = mapKeyListResult({ ok: true, keys: [] });
    expect(res).toEqual({ ok: true, data: [] });
  });

  it('rejects non-array keys payloads', () => {
    expect(mapKeyListResult({ ok: true, keys: 'nope' })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapKeyListResult({ ok: false, error: 'NOT_FOUND' })).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(mapKeyListResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapKeyListResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});

describe('mapSetActiveResult', () => {
  it('maps success', () => {
    expect(mapSetActiveResult({ ok: true })).toEqual({ ok: true, data: true });
  });
  it('passes through all rejection codes', () => {
    expect(mapSetActiveResult({ ok: false, error: 'CANNOT_MODIFY_SELF' })).toEqual({ ok: false, error: 'CANNOT_MODIFY_SELF' });
    expect(mapSetActiveResult({ ok: false, error: 'UNAUTHORIZED' })).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(mapSetActiveResult({ ok: false, error: 'NOT_FOUND' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('rejects malformed payloads', () => {
    expect(mapSetActiveResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapSetActiveResult({ ok: false })).toEqual({ ok: false, error: 'UNKNOWN' });
    // Current implementation accepts { ok: true, data: true } as valid success
    expect(mapSetActiveResult({ ok: true, data: true })).toEqual({ ok: true, data: true });
  });
});

describe('mapProfileListResult', () => {
  it('maps a profile array with all fields', () => {
    const res = mapProfileListResult({
      ok: true,
      profiles: [
        { id: 'p-1', name: 'Vishvraj', email: 'v@x.com', role: 'owner', created_at: '2026-08-06T00:00:00Z', key_label: 'Vishvraj', account_id: 'acc-1', student_profile: null },
        { id: 'p-2', name: null, email: null, role: 'student', created_at: '2026-08-05T00:00:00Z', key_label: null, account_id: 'acc-2', student_profile: null },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]).toEqual({
        id: 'p-1', name: 'Vishvraj', email: 'v@x.com', role: 'owner',
        created_at: '2026-08-06T00:00:00Z', key_label: 'Vishvraj',
        account_id: 'acc-1', student_profile: null,
      });
      expect(res.data[1].name).toBeNull();
      expect(res.data[1].email).toBeNull();
      expect(res.data[1].key_label).toBeNull();
    }
  });

  it('passes through the account-scoped student profile', () => {
    const res = mapProfileListResult({
      ok: true,
      profiles: [
        {
          id: 'p-3',
          name: 'Drashti',
          email: 'd@x.com',
          role: 'student',
          created_at: '2026-08-06T00:00:00Z',
          key_label: 'Drashti Key',
          account_id: '9a1c9f1a-0000-4000-8000-000000000009',
          student_profile: { name: 'Drashti', department: 'CE', enrollment_number: '2204039' },
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0].account_id).toBe('9a1c9f1a-0000-4000-8000-000000000009');
      expect(res.data[0].student_profile).toEqual({
        name: 'Drashti',
        department: 'CE',
        enrollment_number: '2204039',
      });
    }
  });

  it('returns empty array for empty profiles list', () => {
    const res = mapProfileListResult({ ok: true, profiles: [] });
    expect(res).toEqual({ ok: true, data: [] });
  });

  it('drops malformed rows', () => {
    const res = mapProfileListResult({ ok: true, profiles: [{ id: 'p-1' }, 'junk', null] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);
  });

  it('rejects non-array profiles payloads', () => {
    expect(mapProfileListResult({ ok: true, profiles: {} })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapProfileListResult({ ok: false, error: 'NOT_FOUND' })).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(mapProfileListResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapProfileListResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});

describe('mapActionListResult', () => {
  it('maps an action array with all fields', () => {
    const res = mapActionListResult({
      ok: true,
      actions: [
        {
          action: 'generate_key',
          actor_role: 'owner',
          target_code: 'AAAA-****-****-DDDD',
          detail: { role: 'student', label: 'Tester', max_uses: 1 },
          created_at: '2026-08-07T12:00:00Z',
        },
        {
          action: 'deactivate_key',
          actor_role: 'admin',
          target_code: 'EEEE-****-****-HHHH',
          detail: { was_active: true },
          created_at: '2026-08-07T11:00:00Z',
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]).toEqual({
        action: 'generate_key',
        actor_role: 'owner',
        target_code: 'AAAA-****-****-DDDD',
        detail: { role: 'student', label: 'Tester', max_uses: 1 },
        created_at: '2026-08-07T12:00:00Z',
      });
      expect(res.data[1].action).toBe('deactivate_key');
      expect(res.data[1].actor_role).toBe('admin');
      expect(res.data[1].detail).toEqual({ was_active: true });
    }
  });

  it('defaults missing optional fields', () => {
    const res = mapActionListResult({
      ok: true,
      actions: [{ action: 'reactivate_key' }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toEqual({
        action: 'reactivate_key',
        actor_role: 'student',
        target_code: '',
        detail: {},
        created_at: null,
      });
    }
  });

  it('returns empty array for empty actions list', () => {
    const res = mapActionListResult({ ok: true, actions: [] });
    expect(res).toEqual({ ok: true, data: [] });
  });

  it('drops malformed rows instead of failing the whole list', () => {
    const res = mapActionListResult({
      ok: true,
      actions: [{ action: 'generate_key', target_code: 'OK-1' }, 'junk', null, { no_action: true }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);
  });

  it('rejects non-array actions payloads', () => {
    expect(mapActionListResult({ ok: true, actions: {} })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapActionListResult({ ok: false, error: 'UNAUTHORIZED' })).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(mapActionListResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapActionListResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});

describe('mapSessionListResult', () => {
  it('maps a device-session array with all fields', () => {
    const res = mapSessionListResult({
      ok: true,
      sessions: [
        {
          id: 's-1',
          account_id: '9a1c9f1a-0000-4000-8000-000000000001',
          device_id: 'dev-1',
          device_name: 'Chrome on Windows',
          last_seen: '2026-08-07T09:00:00Z',
          created_at: '2026-08-07T08:00:00Z',
          account_name: 'Vishvraj',
          account_role: 'owner',
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toEqual({
        id: 's-1',
        account_id: '9a1c9f1a-0000-4000-8000-000000000001',
        device_id: 'dev-1',
        device_name: 'Chrome on Windows',
        last_seen: '2026-08-07T09:00:00Z',
        created_at: '2026-08-07T08:00:00Z',
        account_name: 'Vishvraj',
        account_role: 'owner',
      });
    }
  });

  it('defaults missing optional fields', () => {
    const res = mapSessionListResult({
      ok: true,
      sessions: [{ id: 's-2', account_id: 'acc-1', device_id: 'dev-2' }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0]).toEqual({
        id: 's-2',
        account_id: 'acc-1',
        device_id: 'dev-2',
        device_name: null,
        last_seen: null,
        created_at: null,
        account_name: null,
        account_role: 'student',
      });
    }
  });

  it('returns empty array for empty sessions list', () => {
    const res = mapSessionListResult({ ok: true, sessions: [] });
    expect(res).toEqual({ ok: true, data: [] });
  });

  it('drops malformed rows instead of failing the whole list', () => {
    const res = mapSessionListResult({ ok: true, sessions: [{ device_id: 'no-id' }, 'junk', null] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(0);
  });

  it('rejects non-array sessions payloads', () => {
    expect(mapSessionListResult({ ok: true, sessions: {} })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapSessionListResult({ ok: false, error: 'UNAUTHORIZED' })).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(mapSessionListResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapSessionListResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});

describe('ADMIN_ERROR_MESSAGES', () => {
  it('has a human-readable message for every AdminErrorCode', () => {
    const codes: AdminErrorCode[] = ['UNAUTHORIZED', 'GENERATION_CONFLICT', 'CANNOT_MODIFY_SELF', 'NOT_FOUND', 'SERVER', 'NETWORK', 'UNKNOWN'];
    for (const code of codes) {
      expect(ADMIN_ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ADMIN_ERROR_MESSAGES[code]).toBe('string');
      expect(ADMIN_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('has no extra keys beyond the defined error codes', () => {
    const definedCodes = Object.keys(ADMIN_ERROR_MESSAGES) as AdminErrorCode[];
    const expectedCodes: AdminErrorCode[] = ['UNAUTHORIZED', 'GENERATION_CONFLICT', 'CANNOT_MODIFY_SELF', 'NOT_FOUND', 'SERVER', 'NETWORK', 'UNKNOWN'];
    expect(definedCodes.sort()).toEqual(expectedCodes.sort());
  });
});

describe('Type inference sanity', () => {
  it('AdminKeyRecord has all expected fields', () => {
    const key: AdminKeyRecord = {
      id: 'k-1',
      code: 'ABCD-EFGH-IJKL-MNOP',
      role: 'student',
      label: 'Test',
      is_active: true,
      max_uses: 1,
      used_count: 0,
      created_at: '2026-08-06T00:00:00Z',
      expires_at: null,
      account_id: '9a1c9f1a-0000-4000-8000-000000000001',
    };
    expect(key).toBeDefined();
  });

  it('AdminProfileRecord has all expected fields', () => {
    const profile: AdminProfileRecord = {
      id: 'p-1',
      name: 'Test',
      email: 'test@test.com',
      role: 'admin',
      created_at: '2026-08-06T00:00:00Z',
      key_label: 'Test Key',
    };
    expect(profile).toBeDefined();
  });

  it('AdminActionRecord has all expected fields', () => {
    const action: AdminActionRecord = {
      action: 'generate_key',
      actor_role: 'owner',
      target_code: 'AAAA-****-****-DDDD',
      detail: { role: 'student' },
      created_at: '2026-08-07T12:00:00Z',
    };
    expect(action).toBeDefined();
  });

  it('AdminSessionRecord has all expected fields', () => {
    const session: AdminSessionRecord = {
      id: 's-1',
      account_id: '9a1c9f1a-0000-4000-8000-000000000001',
      device_id: 'dev-1',
      device_name: 'Chrome on Windows',
      last_seen: '2026-08-07T09:00:00Z',
      created_at: '2026-08-07T08:00:00Z',
      account_name: 'Vishvraj',
      account_role: 'owner',
    };
    expect(session).toBeDefined();
  });
});
