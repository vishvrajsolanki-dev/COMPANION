import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Part C — unit tests for saveStudentProfile (onboarding identity capture).
 * The supabase module is mocked so we can exercise every return path:
 * success, RPC error, ok:false payload, transport throw, and unconfigured
 * (supabase client null — the no-env-vars build).
 */

// vi.mock factories are hoisted above imports, so the mock objects must be
// created with vi.hoisted() to be initialized before the factory runs. The
// module's `supabase` export is a getter so tests can flip the client to null
// and back, exercising the unconfigured branch.
const { rpcMock, supabaseHolder, setSupabase } = vi.hoisted(() => {
  const rpcMock = vi.fn();
  const supabaseHolder = {
    current: { rpc: rpcMock } as unknown as SupabaseClient | null,
  };
  return {
    rpcMock,
    supabaseHolder,
    setSupabase: (s: SupabaseClient | null) => {
      supabaseHolder.current = s;
    },
  };
});

vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  // Re-read through the shared holder so tests can null the client out.
  get supabase() {
    return supabaseHolder.current;
  },
}));

import { saveStudentProfile } from './accessKeys';

beforeEach(() => {
  rpcMock.mockReset();
  setSupabase({ rpc: rpcMock } as unknown as SupabaseClient);
});

describe('saveStudentProfile', () => {
  it('calls save_student_profile RPC with account_id + identity fields', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    const ok = await saveStudentProfile('acc-1', 'Drashti Patel', 'Computer Engineering', '2204039');

    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('save_student_profile', {
      p_account_id: 'acc-1',
      p_name: 'Drashti Patel',
      p_department: 'Computer Engineering',
      p_enrollment_number: '2204039',
    });
  });

  it('returns false when the RPC reports an error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const ok = await saveStudentProfile('acc-1', 'A', 'B', 'C');

    expect(ok).toBe(false);
  });

  it('returns false when the payload ok flag is not true', async () => {
    rpcMock.mockResolvedValue({ data: { ok: false }, error: null });

    const ok = await saveStudentProfile('acc-1', 'A', 'B', 'C');

    expect(ok).toBe(false);
  });

  it('returns false when the payload is missing entirely', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const ok = await saveStudentProfile('acc-1', 'A', 'B', 'C');

    expect(ok).toBe(false);
  });

  it('returns false and swallows a transport throw', async () => {
    rpcMock.mockRejectedValue(new Error('network down'));

    const ok = await saveStudentProfile('acc-1', 'A', 'B', 'C');

    expect(ok).toBe(false);
  });

  it('returns false without calling RPC when supabase is unconfigured', async () => {
    setSupabase(null);

    const ok = await saveStudentProfile('acc-1', 'A', 'B', 'C');

    expect(ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
