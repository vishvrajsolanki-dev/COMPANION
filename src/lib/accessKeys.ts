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
      sessionToken: string;
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
    typeof r.session_token !== 'string' ||
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
    sessionToken: r.session_token,
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
 * Save student identity fields (name, department, enrollment number) to the
 * server-side account record. Authenticated via p_session_token (identity derived
 * server-side from active device_sessions).
 */
export async function saveStudentProfile(
  sessionToken: string,
  name: string,
  department: string,
  enrollmentNumber: string,
): Promise<boolean> {
  if (!supabase || !sessionToken) return false;
  try {
    const { data, error } = await supabase.rpc('save_student_profile', {
      p_session_token: sessionToken,
      p_name: name,
      p_department: department,
      p_enrollment_number: enrollmentNumber,
    });
    if (error) {
      console.error('save_student_profile error:', error);
      return false;
    }
    return data?.ok === true;
  } catch {
    return false;
  }
}

/**
 * Sign out of the current device — removes the device session server-side.
 * Authenticated via p_session_token (identity derived server-side).
 * This is a best-effort cleanup; a network failure is non-fatal.
 */
export async function signOutSession(
  sessionToken: string,
): Promise<void> {
  if (!supabase || !sessionToken) return;
  try {
    await supabase.rpc('sign_out_session', {
      p_session_token: sessionToken,
    });
  } catch {
    /* non-fatal — device stays signed in server-side */
  }
}

