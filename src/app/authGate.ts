import type { AuthStatus } from '../store/authStore';

export const shouldRenderActivationGate = (
  supabaseConfigured: boolean,
  authStatus: AuthStatus,
): boolean => supabaseConfigured && authStatus !== 'activated';
