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
export type RpcErrorCode = 'INVALID_KEY' | 'INACTIVE_KEY' | 'EXPIRED_KEY' | 'KEY_EXHAUSTED' | 'TOO_MANY_ATTEMPTS';

/** All failure codes the client can surface, incl. transport-level ones. */
export type ActivationErrorCode = RpcErrorCode | 'NETWORK' | 'SUPABASE_NOT_CONFIGURED' | 'UNKNOWN';

export type ActivationResult =
  | { ok: true; role: ActivationRole; profile: ActivationProfile }
  | { ok: false; error: ActivationErrorCode };

const RPC_ERROR_CODES: readonly string[] = ['INVALID_KEY', 'INACTIVE_KEY', 'EXPIRED_KEY', 'KEY_EXHAUSTED', 'TOO_MANY_ATTEMPTS'];

function isRpcErrorCode(v: unknown): v is RpcErrorCode {
  return typeof v === 'string' && RPC_ERROR_CODES.includes(v);
}

/**
 * Normalizes the raw JSON from the activate_access_key RPC into a typed result.
 * Extracted as a pure function so the parse logic is unit-testable.
 */
export function mapRpcResult(raw: unknown): ActivationResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'UNKNOWN' };

  const r = raw as Record<string, unknown>;
  if (r.ok !== true) {
    return { ok: false, error: isRpcErrorCode(r.error) ? r.error : 'UNKNOWN' };
  }

  if (typeof r.role !== 'string' || typeof r.profile !== 'object' || r.profile === null) {
    return { ok: false, error: 'UNKNOWN' };
  }

  const p = r.profile as Record<string, unknown>;
  const role = r.role as ActivationRole;
  return {
    ok: true,
    role,
    profile: {
      id:   typeof p.id === 'string' ? p.id : '',
      name: typeof p.name === 'string' ? p.name : null,
      email: typeof p.email === 'string' ? p.email : null,
      role,
    },
  };
}

/**
 * Validates an access key against Supabase. When unconfigured (no env vars) it
 * fails fast with SUPABASE_NOT_CONFIGURED rather than throwing.
 */
export async function activateAccessKey(code: string): Promise<ActivationResult> {
  if (!supabase) return { ok: false, error: 'SUPABASE_NOT_CONFIGURED' };

  try {
    const { data, error } = await supabase.rpc('activate_access_key', { p_code: code });
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
