import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0009_verify_session_hardening.sql'), 'utf8');
const compact = sql.replace(/\s+/g, ' ').toLowerCase();

/** Slice function body */
const fnBody = (name: string, haystack = compact): string => {
  const start = haystack.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} should be defined`).toBeGreaterThanOrEqual(0);
  const nextFn = haystack.indexOf('create or replace function public.', start + 1);
  return nextFn === -1 ? haystack.slice(start) : haystack.slice(start, nextFn);
};

describe('Batch 2D-1 — 0009 verify_device_session hardening migration', () => {
  it('defines verify_device_session with security definer and pinned search path', () => {
    const body = fnBody('verify_device_session');
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public, extensions, pg_temp');
  });

  it('eliminates 3-way join on access_keys and uses EXISTS subquery in function body to prevent Cartesian row multiplication', () => {
    const body = fnBody('verify_device_session');
    // Function body must NOT join access_keys directly in the main FROM clause
    expect(body).not.toContain('join public.access_keys');

    // Function body must use EXISTS subquery on access_keys
    expect(body).toContain('exists ( select 1 from public.access_keys ak where ak.account_id = ds.account_id and ak.is_active = true ) as key_active');
  });

  it('joins device_sessions ONLY with accounts', () => {
    const body = fnBody('verify_device_session');
    expect(body).toContain('from public.device_sessions ds join public.accounts ac on ac.id = ds.account_id where ds.session_token_hash = v_hash');
  });

  it('preserves active key check, 30-day absolute expiration, and 7-day idle timeout', () => {
    const body = fnBody('verify_device_session');
    expect(body).toContain('if not v_rec.key_active then');
    expect(body).toContain('if v_rec.expires_at < now() then');
    expect(body).toContain("if v_rec.last_seen < (now() - interval '7 days') then");
  });

  it('revokes direct execution from public, anon, authenticated', () => {
    expect(compact).toContain('revoke execute on function public.verify_device_session(text) from public, anon, authenticated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Behavioral Contract & Multi-Key Simulation Model
// ─────────────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  role: 'student' | 'admin' | 'owner';
}

interface AccessKey {
  id: string;
  account_id: string;
  is_active: boolean;
}

interface DeviceSession {
  id: string;
  account_id: string;
  device_id: string;
  session_token_hash: string;
  expires_at: number; // timestamp
  last_seen: number;  // timestamp
}

function hashToken(token: string): string {
  return `hash_${token.trim()}`;
}

function simulateVerifyDeviceSession(
  token: string,
  accounts: Account[],
  keys: AccessKey[],
  sessions: DeviceSession[],
  now: number = Date.now()
): { is_valid: boolean; account_id?: string; device_id?: string; role?: string; countOfReturnedRows: number } {
  if (!token || token.trim() === '') {
    return { is_valid: false, countOfReturnedRows: 0 };
  }

  const hash = hashToken(token);

  // REVISED LOGIC (Migration 0009):
  // Query device_sessions joined ONLY with accounts (1:1), using EXISTS subquery for active keys
  const joinedRows = sessions
    .filter(ds => ds.session_token_hash === hash)
    .flatMap(ds => {
      const ac = accounts.find(a => a.id === ds.account_id);
      if (!ac) return [];
      const hasActiveKey = keys.some(k => k.account_id === ds.account_id && k.is_active);
      return [{
        account_id: ds.account_id,
        device_id: ds.device_id,
        role: ac.role,
        expires_at: ds.expires_at,
        last_seen: ds.last_seen,
        key_active: hasActiveKey,
      }];
    });

  const countOfReturnedRows = joinedRows.length;
  if (countOfReturnedRows === 0) {
    return { is_valid: false, countOfReturnedRows: 0 };
  }

  const rec = joinedRows[0];

  if (!rec.key_active) {
    return { is_valid: false, countOfReturnedRows };
  }

  // 30 days expiration
  if (rec.expires_at < now) {
    return { is_valid: false, countOfReturnedRows };
  }

  // 7 days idle timeout
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  if (rec.last_seen < now - SEVEN_DAYS_MS) {
    return { is_valid: false, countOfReturnedRows };
  }

  return {
    is_valid: true,
    account_id: rec.account_id,
    device_id: rec.device_id,
    role: rec.role,
    countOfReturnedRows,
  };
}

describe('verify_device_session behavioral contract (multi-key & security checks)', () => {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const accountA: Account = { id: 'acc-a', role: 'student' };
  const validSessionA: DeviceSession = {
    id: 'sess-1',
    account_id: 'acc-a',
    device_id: 'dev-phone',
    session_token_hash: hashToken('valid_token_a'),
    expires_at: now + 30 * ONE_DAY,
    last_seen: now - 1 * ONE_DAY,
  };

  it('1. One account + one active key -> valid session', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [validSessionA], now);

    expect(res.is_valid).toBe(true);
    expect(res.account_id).toBe('acc-a');
    expect(res.device_id).toBe('dev-phone');
    expect(res.role).toBe('student');
    expect(res.countOfReturnedRows).toBe(1);
  });

  it('2. One account + multiple keys -> returns exactly ONE session-verification result (no row multiplication)', () => {
    // Account has 3 keys (e.g. key replacement history)
    const keys = [
      { id: 'k1', account_id: 'acc-a', is_active: false },
      { id: 'k2', account_id: 'acc-a', is_active: true },
      { id: 'k3', account_id: 'acc-a', is_active: false },
    ];
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [validSessionA], now);

    expect(res.is_valid).toBe(true);
    expect(res.countOfReturnedRows).toBe(1); // Crucial: exactly 1 row returned from query
  });

  it('3. Active key present -> authorized', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [validSessionA], now);

    expect(res.is_valid).toBe(true);
  });

  it('4. All account keys inactive -> unauthorized', () => {
    const keys = [
      { id: 'k1', account_id: 'acc-a', is_active: false },
      { id: 'k2', account_id: 'acc-a', is_active: false },
    ];
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [validSessionA], now);

    expect(res.is_valid).toBe(false);
    expect(res.countOfReturnedRows).toBe(1);
  });

  it('5. Expired session (>30 days) -> unauthorized', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const expiredSession: DeviceSession = {
      ...validSessionA,
      expires_at: now - 1000, // expired in past
    };
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [expiredSession], now);

    expect(res.is_valid).toBe(false);
  });

  it('6. Idle-expired session (>7 days since last_seen) -> unauthorized', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const idleSession: DeviceSession = {
      ...validSessionA,
      last_seen: now - 8 * ONE_DAY, // 8 days ago
    };
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [idleSession], now);

    expect(res.is_valid).toBe(false);
  });

  it('7. Invalid token -> unauthorized', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const res = simulateVerifyDeviceSession('invalid_garbage_token', [accountA], keys, [validSessionA], now);

    expect(res.is_valid).toBe(false);
    expect(res.countOfReturnedRows).toBe(0);
  });

  it('8. Revoked session (session row deleted) -> unauthorized', () => {
    const keys = [{ id: 'k1', account_id: 'acc-a', is_active: true }];
    const res = simulateVerifyDeviceSession('valid_token_a', [accountA], keys, [], now);

    expect(res.is_valid).toBe(false);
    expect(res.countOfReturnedRows).toBe(0);
  });
});
