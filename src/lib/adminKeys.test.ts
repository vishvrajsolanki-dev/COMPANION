import { describe, it, expect } from 'vitest';
import {
  mapAdminError,
  mapGenerateKeyResult,
  mapKeyListResult,
  mapSetActiveResult,
  mapProfileListResult,
  isMaskedCode,
  ADMIN_ERROR_MESSAGES,
  type AdminErrorCode,
  type AdminKeyRecord,
  type AdminProfileRecord,
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
        { id: 'p-1', name: 'Vishvraj', email: 'v@x.com', role: 'owner', created_at: '2026-08-06T00:00:00Z', key_label: 'Vishvraj' },
        { id: 'p-2', name: null, email: null, role: 'student', created_at: '2026-08-05T00:00:00Z', key_label: null },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]).toEqual({
        id: 'p-1', name: 'Vishvraj', email: 'v@x.com', role: 'owner',
        created_at: '2026-08-06T00:00:00Z', key_label: 'Vishvraj',
      });
      expect(res.data[1].name).toBeNull();
      expect(res.data[1].email).toBeNull();
      expect(res.data[1].key_label).toBeNull();
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

describe('ADMIN_ERROR_MESSAGES', () => {
  it('has a human-readable message for every AdminErrorCode', () => {
    const codes: AdminErrorCode[] = ['UNAUTHORIZED', 'GENERATION_CONFLICT', 'CANNOT_MODIFY_SELF', 'NOT_FOUND', 'NETWORK', 'UNKNOWN'];
    for (const code of codes) {
      expect(ADMIN_ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ADMIN_ERROR_MESSAGES[code]).toBe('string');
      expect(ADMIN_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('has no extra keys beyond the defined error codes', () => {
    const definedCodes = Object.keys(ADMIN_ERROR_MESSAGES) as AdminErrorCode[];
    const expectedCodes: AdminErrorCode[] = ['UNAUTHORIZED', 'GENERATION_CONFLICT', 'CANNOT_MODIFY_SELF', 'NOT_FOUND', 'NETWORK', 'UNKNOWN'];
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
});
