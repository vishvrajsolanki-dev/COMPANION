import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0003_rate_limiting.sql'), 'utf8');
const compact = sql.replace(/\s+/g, ' ').toLowerCase();

describe('Phase D — 0003 rate limiting (Gap B: brute-force lockout)', () => {
  it('adds the failed_attempts and locked_until columns idempotently', () => {
    expect(compact).toContain('add column if not exists failed_attempts integer not null default 0');
    expect(compact).toContain('add column if not exists locked_until timestamptz');
  });

  it('defines register_failed_attempt as an internal definer helper', () => {
    const start = compact.indexOf('create or replace function public.register_failed_attempt(');
    expect(start, 'register_failed_attempt should be defined').toBeGreaterThanOrEqual(0);

    const nextFn = compact.indexOf('create or replace function public.', start + 1);
    const body = nextFn === -1 ? compact.slice(start) : compact.slice(start, nextFn);

    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
  });

  it('does not grant the internal lockout helper to the browser roles', () => {
    expect(compact).not.toMatch(/grant execute on function public\.register_failed_attempt\(/i);
  });

  it('locks a key for 15 minutes after 5 failed attempts', () => {
    // The threshold: the UPDATE reads the pre-increment counter, so `+ 1` is the
    // new count; >= 5 arms the lock. Guards against a refactor that uses the
    // already-incremented column or a different interval.
    expect(compact).toContain('when failed_attempts + 1 >= 5 then now() + interval \'15 minutes\'');
  });

  it('returns TOO_MANY_ATTEMPTS with a retry_after while a key is locked', () => {
    expect(compact).toContain("if v_key.locked_until is not null and v_key.locked_until > now() then");
    expect(compact).toContain("'error', 'too_many_attempts'");
    expect(compact).toContain("'retry_after'");
  });

  it('auto-clears an expired lock before the next attempt', () => {
    expect(compact).toContain("if v_key.locked_until is not null and v_key.locked_until <= now() then");
    expect(compact).toContain('set failed_attempts = 0, locked_until = null');
  });

  it('counts every existing-key failure toward the lockout', () => {
    // Every rejection for a known key must go through the helper — inactive,
    // expired, and the atomic-consumption miss (KEY_EXHAUSTED).
    const failures = compact.match(/perform public\.register_failed_attempt\(v_key\.id\)/g) || [];
    expect(failures.length).toBe(3);
    expect(compact).toContain("'error', 'inactive_key'");
    expect(compact).toContain("'error', 'expired_key'");
    expect(compact).toContain("'error', 'key_exhausted'");
  });

  it('does not count a successful activation as a failure', () => {
    // Success path resets the counter and lock, and returns before any helper
    // call. The reset must appear AFTER the atomic consumption.
    const resetIdx = compact.indexOf('set failed_attempts = 0, locked_until = null');
    const updateIdx = compact.indexOf('set used_count = used_count + 1');
    expect(resetIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    // The second reset (success path) comes after the atomic UPDATE.
    const secondReset = compact.indexOf('set failed_attempts = 0, locked_until = null', resetIdx + 1);
    expect(secondReset).toBeGreaterThan(updateIdx);
  });
});
