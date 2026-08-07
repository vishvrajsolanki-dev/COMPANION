import { describe, it, expect } from 'vitest';
import { mapRpcResult } from './accessKeys';

describe('mapRpcResult (activation RPC → typed result)', () => {
  it('maps a success payload into a typed ActivationResult', () => {
    const res = mapRpcResult({
      ok: true,
      role: 'owner',
      profile: { id: 'p-1', name: 'Vishvraj', email: null, role: 'owner' },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.role).toBe('owner');
      expect(res.profile).toEqual({ id: 'p-1', name: 'Vishvraj', email: null, role: 'owner' });
    }
  });

  it('passes through every known server error code', () => {
    expect(mapRpcResult({ ok: false, error: 'INVALID_KEY' })).toEqual({ ok: false, error: 'INVALID_KEY' });
    expect(mapRpcResult({ ok: false, error: 'INACTIVE_KEY' })).toEqual({ ok: false, error: 'INACTIVE_KEY' });
    expect(mapRpcResult({ ok: false, error: 'EXPIRED_KEY' })).toEqual({ ok: false, error: 'EXPIRED_KEY' });
    expect(mapRpcResult({ ok: false, error: 'KEY_EXHAUSTED' })).toEqual({ ok: false, error: 'KEY_EXHAUSTED' });
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
  });
});
