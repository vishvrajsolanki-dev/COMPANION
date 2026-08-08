import { supabase } from './supabase';
import type { Profile } from '../store/profileStore';

/** Roles assigned by an access key — matches profileStore's Profile.role. */
export type ActivationRole = Profile['role'];

/** Profile payload returned by the activation RPC. */
export interface ActivationProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: ActivationRole;
}

/** Server-side rejection codes returned by activate_access_key(). */
export type RpcErrorCode =
  | 'INVALID_KEY'
  | 'INACTIVE_KEY'
  | 'EXPIRED_KEY'
  | 'KEY_EXHAUSTED'
  | 'TOO_MANY_ATTEMPTS';

/** All failure codes the client can surface, incl. transport-level ones. */
export type ActivationErrorCode =
  | RpcErrorCode
  | 'NETWORK'
  | 'SUPABASE_NOT_CONFIGURED'
  | 'UNKNOWN';

export type ActivationResult =
  | {
      ok: true;
      role: ActivationRole;
      accountId: string;
      profile: ActivationProfile;
      /** First-time student activation — client must show the onboarding form. */
      needsOnboarding: boolean;
    }
  | { ok: false; error: ActivationErrorCode };

const RPC_ERROR_CODES: readonly string[] = [
  'INVALID_KEY',
  'INACTIVE_KEY',
  'EXPIRED_KEY',
  'KEY_EXHAUSTED',
  'TOO_MANY_ATTEMPTS',
];

function isRpcErrorCode(v: unknown): v is RpcErrorCode {
  return typeof v === 'string' && RPC_ERROR_CODES.includes(v);
}

/**
 * Normalizes the raw JSON from the activate_access_key RPC into a typed result.
 * Extracted as a pure function so the parse logic is unit-testable.
 */
export function mapRpcResult(raw: unknown): ActivationResult {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, error: 'UNKNOWN' };

  const r = raw as Record<string, unknown>;
  if (r.ok !== true) {
    return {
      ok: false,
      error: isRpcErrorCode(r.error) ? r.error : 'UNKNOWN',
    };
  }

  if (
    typeof r.role !== 'string' ||
    typeof r.account_id !== 'string' ||
    typeof r.profile !== 'object' ||
    r.profile === null
  ) {
    return { ok: false, error: 'UNKNOWN' };
  }

  const p = r.profile as Record<string, unknown>;
  const role = r.role as ActivationRole;
  return {
    ok: true,
    role,
    accountId: r.account_id,
    profile: {
      id: typeof p.id === 'string' ? p.id : '',
      name: typeof p.name === 'string' ? p.name : null,
      email: typeof p.email === 'string' ? p.email : null,
      role,
    },
    needsOnboarding: r.needs_onboarding === true,
  };
}

/**
 * Validates an access key against Supabase. When unconfigured (no env vars) it
 * fails fast with SUPABASE_NOT_CONFIGURED rather than throwing.
 */
export async function activateAccessKey(
  code: string,
  deviceId: string,
  deviceName?: string | null,
): Promise<ActivationResult> {
  if (!supabase) return { ok: false, error: 'SUPABASE_NOT_CONFIGURED' };

  try {
    const { data, error } = await supabase.rpc('activate_access_key', {
      p_code: code,
      p_device_id: deviceId,
      ...(deviceName ? { p_device_name: deviceName } : {}),
    });
    if (error) {
      console.error('Supabase RPC error:', error);
      return { ok: false, error: 'NETWORK' };
    }
    return mapRpcResult(data);
  } catch (err) {
    console.error('Activation request failed:', err);
    return { ok: false, error: 'NETWORK' };
  }
}

/**
 * Sign out of the current device — removes the device session server-side.
 * Account-keyed (not code-keyed) because students never persist their raw key
 * on-device. This is a best-effort cleanup; a network failure is non-fatal
 * (the device just has a stale session row).
 */
export async function signOutSession(
  accountId: string,
  deviceId: string,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc('sign_out_session', {
      p_account_id: accountId,
      p_device_id: deviceId,
    });
  } catch {
    /* non-fatal — device stays signed in server-side */
  }
}
