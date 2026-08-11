import { describe, it, expect } from 'vitest';
import { formatRefError, REF_ERROR_MESSAGES, type ReferenceDataErrorCode } from './referenceData';

describe('REF_ERROR_MESSAGES', () => {
  it('has a human-readable message for every ReferenceDataErrorCode', () => {
    const codes: ReferenceDataErrorCode[] = ['UNAUTHORIZED', 'SERVER', 'NETWORK', 'EMPTY', 'UNKNOWN'];
    for (const code of codes) {
      expect(REF_ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof REF_ERROR_MESSAGES[code]).toBe('string');
    }
  });

  it('has no extra keys beyond the defined error codes', () => {
    const definedCodes = Object.keys(REF_ERROR_MESSAGES) as ReferenceDataErrorCode[];
    const expectedCodes: ReferenceDataErrorCode[] = ['UNAUTHORIZED', 'SERVER', 'NETWORK', 'EMPTY', 'UNKNOWN'];
    expect(definedCodes.sort()).toEqual(expectedCodes.sort());
  });
});

describe('formatRefError', () => {
  it('returns empty string for a success result', () => {
    expect(formatRefError({ ok: true, data: [] })).toBe('');
  });

  it('returns the base message for an app-level rejection without detail', () => {
    expect(formatRefError({ ok: false, error: 'EMPTY' })).toBe(REF_ERROR_MESSAGES.EMPTY);
  });

  it('returns the base message for UNAUTHORIZED', () => {
    expect(formatRefError({ ok: false, error: 'UNAUTHORIZED' })).toBe(REF_ERROR_MESSAGES.UNAUTHORIZED);
  });

  it('appends the server-side detail for SERVER failures', () => {
    const res = formatRefError({ ok: false, error: 'SERVER', detail: 'PGRST202 — Could not find the function public.admin_upsert_reference_data' });
    expect(res).toBe(
      `${REF_ERROR_MESSAGES.SERVER} (PGRST202 — Could not find the function public.admin_upsert_reference_data)`,
    );
  });

  it('prefers a PostgREST detail over the generic NETWORK message when classified as SERVER', () => {
    const res = formatRefError({ ok: false, error: 'SERVER', detail: '42501 — permission denied for function admin_upsert_reference_data' });
    expect(res).toContain('42501');
    expect(res).not.toContain(REF_ERROR_MESSAGES.NETWORK);
  });
});
