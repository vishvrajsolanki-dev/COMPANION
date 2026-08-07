import { create } from 'zustand';
import { activateAccessKey, type ActivationErrorCode, type ActivationRole } from '../lib/accessKeys';
import { useProfileStore } from './profileStore';

/**
 * Phase B — access-key activation state.
 *
 * Hydrated synchronously from localStorage (same pattern as uiStore/theme) so
 * App.tsx never flashes the activation gate on a reload of an activated device.
 * Once activated, the device works fully offline — no re-validation needed.
 */
export interface Activation {
  role: ActivationRole;
  profileId: string;
  /** Masked preview of the entered key, e.g. "XK7A…" — never the raw code. */
  codePreview: string;
  activatedAt: string;
  /**
   * Raw key, stored ONLY when the role is admin/owner. It is the credential
   * for the Phase C admin RPCs (passed as p_admin_code and re-validated
   * server-side). Students never persist their raw key.
   */
  adminCode?: string;
}

export type AuthStatus = 'unactivated' | 'activating' | 'activated' | 'error';

const ACTIVATION_KEY = 'academic_os_activation';

const readStoredActivation = (): Activation | null => {
  try {
    const raw = localStorage.getItem(ACTIVATION_KEY);
    return raw ? (JSON.parse(raw) as Activation) : null;
  } catch {
    return null;
  }
};

const storedActivation = typeof window !== 'undefined' ? readStoredActivation() : null;

/** Machine error codes → human-friendly messages shown on the gate screen. */
export const ACTIVATION_ERROR_MESSAGES: Record<ActivationErrorCode, string> = {
  INVALID_KEY: "That access key isn't recognized. Double-check it and try again.",
  INACTIVE_KEY: 'This access key has been deactivated by the admin.',
  EXPIRED_KEY: 'This access key has expired — ask your admin for a new one.',
  KEY_EXHAUSTED: 'This access key has already reached its usage limit.',
  TOO_MANY_ATTEMPTS: "Too many failed attempts. This key is locked for 15 minutes — wait, or ask your admin for a new key.",
  NETWORK: "Couldn't reach the activation server. Check your internet connection and try again.",
  SUPABASE_NOT_CONFIGURED: 'This build has no activation server configured.',
  UNKNOWN: 'Something went wrong while activating. Please try again.',
};

const maskCode = (code: string): string => {
  const first = code.trim().split(/[- ]/)[0];
  return first ? `${first}…` : '…';
};

interface AuthState {
  status: AuthStatus;
  activation: Activation | null;
  error: string | null;
  activate: (code: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: storedActivation ? 'activated' : 'unactivated',
  activation: storedActivation,
  error: null,

  activate: async (code: string) => {
    set({ status: 'activating', error: null });

    const result = await activateAccessKey(code);
    if (!result.ok) {
      set({ status: 'error', error: ACTIVATION_ERROR_MESSAGES[result.error] });
      return;
    }

    const p = result.profile;
    const isAdmin = result.role === 'admin' || result.role === 'owner';
    const activation: Activation = {
      role: result.role,
      profileId: p.id,
      codePreview: maskCode(code),
      activatedAt: new Date().toISOString(),
      // Admin/owner keys double as the credential for the admin portal.
      ...(isAdmin ? { adminCode: code.trim().toUpperCase() } : {}),
    };

    try {
      localStorage.setItem(ACTIVATION_KEY, JSON.stringify(activation));
    } catch {
      /* storage unavailable — keep in-memory activation only */
    }

    // Feed the real profile into the existing profile store (hero greeting, etc.)
    useProfileStore.getState().setProfile({
      id: p.id,
      name: p.name || '',
      email: p.email || undefined,
      role: p.role,
    });

    set({ status: 'activated', activation, error: null });
  },

  signOut: () => {
    try {
      localStorage.removeItem(ACTIVATION_KEY);
    } catch {
      /* ignore */
    }
    useProfileStore.getState().setProfile(null);
    set({ status: 'unactivated', activation: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
