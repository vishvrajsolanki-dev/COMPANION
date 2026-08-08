import { create } from 'zustand';
import {
  activateAccessKey,
  signOutSession,
  type ActivationErrorCode,
  type ActivationRole,
} from '../lib/accessKeys';
import { getDeviceId, getDeviceName } from '../lib/deviceId';
import { useProfileStore } from './profileStore';
import { ensureAccountData } from '../db/seeds';

/**
 * Phase B — access-key activation state.
 *
 * Hydrated synchronously from localStorage (same pattern as uiStore/theme) so
 * App.tsx never flashes the activation gate on a reload of an activated device.
 * Once activated, the device works fully offline — no re-validation needed.
 *
 * `accountId` is the server-assigned UUID for the activated account; it is used
 * to scope the local IndexedDB database (`AcademicOSDB_<accountId>`).
 */
export interface Activation {
  role: ActivationRole;
  accountId: string;
  profileId: string;
  /** Masked preview of the entered key, e.g. "XK7A…" — never the raw code. */
  codePreview: string;
  activatedAt: string;
  /**
   * When true, the device must show the onboarding form (first-time student
   * activation). Persisted in localStorage so the form appears on reload.
   */
  needsOnboarding?: boolean;
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
  KEY_EXHAUSTED:
    'This device has reached the maximum number of active sessions for this account. Ask your admin to revoke another device first.',
  TOO_MANY_ATTEMPTS:
    'Too many failed attempts. This key is locked for 15 minutes — wait, or ask your admin for a new key.',
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
  signOut: () => Promise<void>;
  clearError: () => void;
  setNeedsOnboarding: (v: boolean) => void;
}

const persistActivation = (activation: Activation) => {
  try {
    localStorage.setItem(ACTIVATION_KEY, JSON.stringify(activation));
  } catch {
    /* storage unavailable — keep in-memory activation only */
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: storedActivation ? 'activated' : 'unactivated',
  activation: storedActivation,
  error: null,

  activate: async (code: string) => {
    set({ status: 'activating', error: null });

    const result = await activateAccessKey(
      code,
      getDeviceId(),
      getDeviceName(),
    );
    if (!result.ok) {
      set({ status: 'error', error: ACTIVATION_ERROR_MESSAGES[result.error] });
      return;
    }

    const { role, accountId, profile: p, needsOnboarding } = result;
    const isAdmin = role === 'admin' || role === 'owner';
    const activation: Activation = {
      role,
      accountId,
      profileId: p.id,
      codePreview: maskCode(code),
      activatedAt: new Date().toISOString(),
      needsOnboarding,
      // Admin/owner keys double as the credential for the admin portal.
      ...(isAdmin ? { adminCode: code.trim().toUpperCase() } : {}),
    };

    // Seed / migrate BEFORE updating state so the DB is ready when views mount.
    await ensureAccountData(accountId, role);

    persistActivation(activation);

    // Feed the real profile into the existing profile store (hero greeting, etc.)
    useProfileStore.getState().setProfile({
      id: p.id,
      name: p.name || '',
      email: p.email || undefined,
      role: p.role,
    });

    set({ status: 'activated', activation, error: null });
  },

  signOut: async () => {
    const { activation } = get();

    // Best-effort server-side sign-out (non-blocking, non-fatal).
    if (activation?.accountId) {
      await signOutSession(activation.accountId, getDeviceId());
    }

    try {
      localStorage.removeItem(ACTIVATION_KEY);
    } catch {
      /* ignore */
    }
    useProfileStore.getState().setProfile(null);
    set({ status: 'unactivated', activation: null, error: null });
  },

  clearError: () => set({ error: null }),

  /** Called after the student completes (or skips) the onboarding form. */
  setNeedsOnboarding: (v: boolean) => {
    const { activation } = get();
    if (!activation) return;
    const updated = { ...activation, needsOnboarding: v };
    persistActivation(updated);
    set({ activation: updated });
  },
}));
