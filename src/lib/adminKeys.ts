import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Phase C — admin portal client.
 *
 * Every admin RPC is authorized by the caller's OWN access key: the raw key
 * (stored on-device only when the activation role is admin/owner) is passed as
 * p_admin_code and re-validated server-side on each call. RLS still blocks any
 * direct read — the definer functions are the only path in.
 */

export type AdminRole = 'student' | 'admin' | 'owner';

/** One row from admin_list_keys. */
export interface AdminKeyRecord {
  id: string;
  code: string;
  role: AdminRole;
  label: string | null;
  is_active: boolean;
  max_uses: number;
  used_count: number;
  created_at: string | null;
  expires_at: string | null;
}

/** One row from admin_list_profiles. */
export interface AdminProfileRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: AdminRole;
  created_at: string | null;
  key_label: string | null;
}

export type AdminErrorCode =
  | 'UNAUTHORIZED'
  | 'GENERATION_CONFLICT'
  | 'CANNOT_MODIFY_SELF'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'UNKNOWN';

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminErrorCode };

/** Server-side rejection codes returned by the admin RPCs. */
const RPC_ERROR_CODES: readonly string[] = [
  'UNAUTHORIZED',
  'GENERATION_CONFLICT',
  'CANNOT_MODIFY_SELF',
  'NOT_FOUND',
];

export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  UNAUTHORIZED: "Your key doesn't have admin access.",
  GENERATION_CONFLICT: 'Code collision — try again.',
  CANNOT_MODIFY_SELF: "You can't deactivate your own key.",
  NOT_FOUND: 'That key no longer exists.',
  NETWORK: "Couldn't reach the server. Check your connection and try again.",
  UNKNOWN: 'Something went wrong. Please try again.',
};

/* ── small parse helpers ──────────────────────────────────────────────────── */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const ROLES: readonly string[] = ['student', 'admin', 'owner'];
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const asBool = (v: unknown, dflt: boolean): boolean => (typeof v === 'boolean' ? v : dflt);
const asNum = (v: unknown, dflt: number): number => (typeof v === 'number' ? v : dflt);
const asRole = (v: unknown): AdminRole => (typeof v === 'string' && ROLES.includes(v) ? (v as AdminRole) : 'student');

/** Normalizes any non-ok RPC payload into an AdminErrorCode. */
export function mapAdminError(raw: unknown): AdminErrorCode {
  if (!isObj(raw)) return 'UNKNOWN';
  const e = raw.error;
  return typeof e === 'string' && RPC_ERROR_CODES.includes(e) ? (e as AdminErrorCode) : 'UNKNOWN';
}

const mapKeyRecord = (raw: unknown): AdminKeyRecord | null => {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.code !== 'string') return null;
  return {
    id: raw.id,
    code: raw.code,
    role: asRole(raw.role),
    label: asStr(raw.label),
    is_active: asBool(raw.is_active, true),
    max_uses: asNum(raw.max_uses, 1),
    used_count: asNum(raw.used_count, 0),
    created_at: asStr(raw.created_at),
    expires_at: asStr(raw.expires_at),
  };
};

const mapProfileRecord = (raw: unknown): AdminProfileRecord | null => {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  return {
    id: raw.id,
    name: asStr(raw.name),
    email: asStr(raw.email),
    role: asRole(raw.role),
    created_at: asStr(raw.created_at),
    key_label: asStr(raw.key_label),
  };
};

/* ── pure mappers (unit-tested) ───────────────────────────────────────────── */

export function mapGenerateKeyResult(raw: unknown): AdminResult<AdminKeyRecord> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  const key = mapKeyRecord(raw.key);
  return key ? { ok: true, data: key } : { ok: false, error: 'UNKNOWN' };
}

export function mapKeyListResult(raw: unknown): AdminResult<AdminKeyRecord[]> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  if (!Array.isArray(raw.keys)) return { ok: false, error: 'UNKNOWN' };
  const keys = raw.keys.map(mapKeyRecord).filter((k): k is AdminKeyRecord => k !== null);
  return { ok: true, data: keys };
}

export function mapSetActiveResult(raw: unknown): AdminResult<boolean> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  return { ok: true, data: true };
}

export function mapProfileListResult(raw: unknown): AdminResult<AdminProfileRecord[]> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  if (!Array.isArray(raw.profiles)) return { ok: false, error: 'UNKNOWN' };
  const profiles = raw.profiles.map(mapProfileRecord).filter((p): p is AdminProfileRecord => p !== null);
  return { ok: true, data: profiles };
}

/* ── live RPC calls ───────────────────────────────────────────────────────── */

/** The raw key held by the current device, when its role is admin/owner. */
export function getAdminCredential(): string | null {
  return useAuthStore.getState().activation?.adminCode ?? null;
}

export interface GenerateKeyOptions {
  role?: AdminRole;
  label?: string;
  maxUses?: number;
  /** ISO-8601 string, or null for no expiry. */
  expiresAt?: string | null;
}

async function rpc<T>(name: string, params: Record<string, unknown>, map: (raw: unknown) => AdminResult<T>): Promise<AdminResult<T>> {
  if (!supabase) return { ok: false, error: 'NETWORK' };
  try {
    const { data, error } = await supabase.rpc(name, params);
    if (error) {
      console.error(`Supabase RPC error (${name}):`, error);
      return { ok: false, error: 'NETWORK' };
    }
    return map(data);
  } catch (err) {
    console.error(`${name} failed:`, err);
    return { ok: false, error: 'NETWORK' };
  }
}

export async function listKeys(): Promise<AdminResult<AdminKeyRecord[]>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_list_keys', { p_admin_code: cred }, mapKeyListResult);
}

export async function generateKey(opts: GenerateKeyOptions): Promise<AdminResult<AdminKeyRecord>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc(
    'admin_generate_key',
    {
      p_admin_code: cred,
      p_role: opts.role || 'student',
      p_label: opts.label?.trim() || null,
      p_max_uses: Math.min(100, Math.max(1, Math.round(opts.maxUses ?? 1))),
      p_expires_at: opts.expiresAt || null,
    },
    mapGenerateKeyResult,
  );
}

export async function setKeyActive(id: string, active: boolean): Promise<AdminResult<boolean>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_set_key_active', { p_admin_code: cred, p_key_id: id, p_active: active }, mapSetActiveResult);
}

export async function listProfiles(): Promise<AdminResult<AdminProfileRecord[]>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_list_profiles', { p_admin_code: cred }, mapProfileListResult);
}
