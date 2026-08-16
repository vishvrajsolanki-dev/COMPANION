import { describe, it, expect } from 'vitest';
import { mapRpcResult } from './accessKeys';

describe('mapRpcResult (activation RPC → typed result)', () => {
  it('maps a success payload into a typed ActivationResult', () => {
    const res = mapRpcResult({
      ok: true,
      role: 'owner',
      account_id: '9a1c9f1a-0000-4000-8000-000000000001',
      session_token: 'stoken-9a1c9f1a000040008000000000000001',
      needs_onboarding: false,
      profile: { id: 'p-1', name: 'Vishvraj', email: null, role: 'owner' },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.role).toBe('owner');
      expect(res.accountId).toBe('9a1c9f1a-0000-4000-8000-000000000001');
      expect(res.sessionToken).toBe('stoken-9a1c9f1a000040008000000000000001');
      expect(res.needsOnboarding).toBe(false);
      expect(res.profile).toEqual({ id: 'p-1', name: 'Vishvraj', email: null, role: 'owner' });
    }
  });

  it('maps needs_onboarding:true for first-time student activation', () => {
    const res = mapRpcResult({
      ok: true,
      role: 'student',
      account_id: '9a1c9f1a-0000-4000-8000-000000000002',
      session_token: 'stoken-9a1c9f1a000040008000000000000002',
      needs_onboarding: true,
      profile: { id: 'p-2', name: null, email: null, role: 'student' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.needsOnboarding).toBe(true);
      expect(res.sessionToken).toBe('stoken-9a1c9f1a000040008000000000000002');
    }
  });

  it('passes through every known server error code', () => {
    expect(mapRpcResult({ ok: false, error: 'INVALID_KEY' })).toEqual({ ok: false, error: 'INVALID_KEY' });
    expect(mapRpcResult({ ok: false, error: 'INACTIVE_KEY' })).toEqual({ ok: false, error: 'INACTIVE_KEY' });
    expect(mapRpcResult({ ok: false, error: 'EXPIRED_KEY' })).toEqual({ ok: false, error: 'EXPIRED_KEY' });
    expect(mapRpcResult({ ok: false, error: 'KEY_EXHAUSTED' })).toEqual({ ok: false, error: 'KEY_EXHAUSTED' });
    expect(mapRpcResult({ ok: false, error: 'TOO_MANY_ATTEMPTS' })).toEqual({ ok: false, error: 'TOO_MANY_ATTEMPTS' });
  });

  it('falls back to UNKNOWN for unrecognized errors', () => {
    expect(mapRpcResult({ ok: false, error: 'SOMETHING_ELSE' })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapRpcResult({ ok: false })).toEqual({ ok: false, error: 'UNKNOWN' });
  });

  it('rejects malformed payloads', () => {
    expect(mapRpcResult(null)).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapRpcResult('nope')).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapRpcResult({ ok: true })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapRpcResult({ ok: true, role: 'owner', profile: null })).toEqual({ ok: false, error: 'UNKNOWN' });
    // Account model: a success payload MUST carry account_id, session_token, and a profile.
    expect(mapRpcResult({ ok: true, role: 'owner', account_id: 'acc-1' })).toEqual({ ok: false, error: 'UNKNOWN' });
    expect(mapRpcResult({ ok: true, account_id: 'acc-1', profile: { id: 'p-1', name: null, email: null, role: 'owner' } })).toEqual({ ok: false, error: 'UNKNOWN' });
  });
});
