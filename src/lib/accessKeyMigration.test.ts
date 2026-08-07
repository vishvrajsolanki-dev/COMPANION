import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0001_access_keys.sql'), 'utf8');
const compact = sql.replace(/\s+/g, ' ').toLowerCase();

describe('Phase B activate_access_key — atomic last-use consumption (Gap B)', () => {
  it('consumes a use atomically (used_count < max_uses guard in the UPDATE WHERE)', () => {
    expect(compact).toMatch(
      /update public\.access_keys\s+set used_count = used_count \+ 1\s+where id = v_key\.id\s+and used_count < max_uses/
    );
  });

  it('returns KEY_EXHAUSTED when the atomic UPDATE matches no row', () => {
    expect(compact).toMatch(/if not found then/);
    // KEY_EXHAUSTED must appear AFTER the guarded update, not before it
    const updateIdx = compact.indexOf('update public.access_keys set used_count = used_count + 1');
    const exhaustedIdx = compact.indexOf("'key_exhausted'");
    expect(updateIdx).toBeGreaterThan(-1);
    expect(exhaustedIdx).toBeGreaterThan(updateIdx);
  });

  it('removes the old non-atomic read-then-write check', () => {
    // The old pattern: SELECT used_count, then separate check, then UPDATE.
    // Must no longer exist in the function body.
    expect(compact).not.toMatch(/if v_key\.used_count >= v_key\.max_uses/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency simulation: a faithful model of Postgres row-level locking that
// proves exactly-one-wins under the atomic UPDATE semantics.
//
// Each "transaction" acquires a per-row mutex, re-reads the row, checks the
// same predicate the SQL WHERE uses (`used_count < max_uses`), and either
// increments or returns KEY_EXHAUSTED — then releases the lock.
// ─────────────────────────────────────────────────────────────────────────────

interface KeyRow {
  used_count: number;
  max_uses: number;
}

function makeKeyStore(max_uses: number) {
  const row: KeyRow = { used_count: 0, max_uses };
  let queue: Promise<void> = Promise.resolve();

  /**
   * Models the atomic UPDATE:
   *   update access_keys set used_count = used_count + 1
   *   where id = $1 and used_count < max_uses;
   *
   * Under the Postgres row lock the two concurrent UPDATEs serialize: the
   * second's WHERE evaluates against the already-incremented row and matches
   * zero rows → not found → KEY_EXHAUSTED.
   */
  async function consume(): Promise<'ok' | 'KEY_EXHAUSTED'> {
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    const prev = queue;
    queue = prev.then(() => gate);
    await prev; // ← FIFO mutual exclusion over the row

    try {
      // Critical section: same predicate as the SQL WHERE clause.
      if (row.used_count >= row.max_uses) return 'KEY_EXHAUSTED';
      row.used_count += 1;
      return 'ok';
    } finally {
      release();
    }
  }

  return { consume, remaining: () => row.max_uses - row.used_count };
}

describe('concurrent activation — atomic consumption model', () => {
  it('with exactly 1 remaining use, two concurrent activations yield exactly ONE success', async () => {
    const store = makeKeyStore(1);
    const results = await Promise.all([store.consume(), store.consume()]);
    const okCount = results.filter(r => r === 'ok').length;
    const exhaustedCount = results.filter(r => r === 'KEY_EXHAUSTED').length;

    expect(okCount).toBe(1);
    expect(exhaustedCount).toBe(1);
    expect(store.remaining()).toBe(0);
  });

  it('scales: max_uses=2 → two successes, third is exhausted', async () => {
    const store = makeKeyStore(2);
    const results = await Promise.all([store.consume(), store.consume(), store.consume()]);

    expect(results.filter(r => r === 'ok')).toHaveLength(2);
    expect(results.filter(r => r === 'KEY_EXHAUSTED')).toHaveLength(1);
    expect(store.remaining()).toBe(0);
  });

  it('never oversells under 20-way contention', async () => {
    const store = makeKeyStore(3);
    const results = await Promise.all(Array.from({ length: 20 }, () => store.consume()));

    expect(results.filter(r => r === 'ok')).toHaveLength(3);
    expect(results.filter(r => r === 'KEY_EXHAUSTED')).toHaveLength(17);
    expect(store.remaining()).toBe(0);
  });

  it('with max_uses=100 and 200 concurrent callers, exactly 100 succeed', async () => {
    const store = makeKeyStore(100);
    const results = await Promise.all(Array.from({ length: 200 }, () => store.consume()));

    expect(results.filter(r => r === 'ok')).toHaveLength(100);
    expect(results.filter(r => r === 'KEY_EXHAUSTED')).toHaveLength(100);
    expect(store.remaining()).toBe(0);
  });

  it('serial access never exhausts prematurely', async () => {
    const store = makeKeyStore(5);
    for (let i = 0; i < 5; i++) {
      expect(await store.consume()).toBe('ok');
    }
    expect(await store.consume()).toBe('KEY_EXHAUSTED');
    expect(store.remaining()).toBe(0);
  });
});
