import { describe, expect, it } from 'vitest';
import { shouldRenderActivationGate } from './authGate';

describe('activation gate', () => {
  it.each(['unactivated', 'activating', 'error'] as const)(
    'keeps %s state at the activation gate when Supabase is configured',
    (status) => {
      expect(shouldRenderActivationGate(true, status)).toBe(true);
    },
  );

  it('allows a valid activated session through the gate', () => {
    expect(shouldRenderActivationGate(true, 'activated')).toBe(false);
  });

  it('does not gate local-only builds without Supabase', () => {
    expect(shouldRenderActivationGate(false, 'error')).toBe(false);
  });
});
