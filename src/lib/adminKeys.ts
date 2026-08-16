import { getSupabase } from './supabase';
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

/** Self-declared student identity (name, department, enrollment number). */
export interface StudentProfile {
  name?: string | null;
  department?: string | null;
  enrollment_number?: string | null;
}

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
  account_id: string;
  student_profile?: StudentProfile | null;
}

/** One row from admin_list_profiles. */
export interface AdminProfileRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: AdminRole;
  created_at: string | null;
  key_label: string | null;
  account_id?: string;
  student_profile?: StudentProfile | null;
}

/** One row from admin_list_actions (the action-audit trail). */
export interface AdminActionRecord {
  action: string;
  actor_role: AdminRole;
  target_code: string;
  detail: Record<string, unknown>;
  created_at: string | null;
}

/** One row from admin_list_sessions. */
export interface AdminSessionRecord {
  id: string;
  account_id: string;
  device_id: string;
  device_name: string | null;
  last_seen: string | null;
  created_at: string | null;
  account_name: string | null;
  account_role: AdminRole;
}

export type AdminErrorCode =
  | 'UNAUTHORIZED'
  | 'GENERATION_CONFLICT'
  | 'CANNOT_MODIFY_SELF'
  | 'NOT_FOUND'
  | 'SERVER'
  | 'NETWORK'
  | 'UNKNOWN';

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminErrorCode; detail?: string };

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
  SERVER: 'The server rejected the request.',
  NETWORK: "Couldn't reach the server. Check your connection and try again.",
  UNKNOWN: 'Something went wrong. Please try again.',
};

/**
 * Distinguishes a genuine transport failure from a server-side rejection.
 *
 * supabase-js surfaces PostgREST/Postgres rejections as objects with a `code`
 * (PGRST202 = function not found, PGRST205 = table not found, 42501 =
 * insufficient privilege, ...) plus a human message/details. Real network
 * failures reject with a TypeError (e.g. "Failed to fetch") that carries no
 * code. Collapsing both into 'NETWORK' is what turned "migration never applied
 * (PGRST202)" into the misleading "Couldn't reach the server, check your
 * connection" banner.
 */
export function classifyPostgrestError(err: unknown): { error: 'SERVER' | 'NETWORK'; detail?: string } {
  if (isObj(err)) {
    const code = typeof err.code === 'string' ? err.code : '';
    if (code) {
      const message = typeof err.message === 'string' ? err.message : '';
      const details = typeof err.details === 'string' ? err.details : '';
      return { error: 'SERVER', detail: [code, message, details].filter(Boolean).join(' — ') };
    }
  }
  // No PostgREST/Postgres code → the request never reached a server (offline,
  // DNS, CORS, abort). Genuine network failure.
  return { error: 'NETWORK' };
}

/**
 * Turns an AdminResult failure into a user-facing string, appending the
 * server-side detail (PostgREST code + message) when the failure was a server
 * rejection. Consumers store the returned string directly in their error state.
 */
export function formatAdminError(res: AdminResult<unknown>): string {
  if (res.ok) return '';
  const base = ADMIN_ERROR_MESSAGES[res.error];
  return res.detail ? `${base} (${res.detail})` : base;
}

/* ── small parse helpers ──────────────────────────────────────────────────── */

/** True when a code returned by the server is display-only redacted (mask_access_code). */
export function isMaskedCode(code: string): boolean {
  return typeof code === 'string' && code.includes('****');
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const ROLES: readonly string[] = ['student', 'admin', 'owner'];
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const asBool = (v: unknown, dflt: boolean): boolean => (typeof v === 'boolean' ? v : dflt);
const asNum = (v: unknown, dflt: number): number => (typeof v === 'number' ? v : dflt);
const asRole = (v: unknown): AdminRole => (typeof v === 'string' && ROLES.includes(v) ? (v as AdminRole) : 'student');

const asStudentProfile = (v: unknown): StudentProfile | null => {
  if (!isObj(v)) return null;
  return {
    name: asStr(v.name),
    department: asStr(v.department),
    enrollment_number: asStr(v.enrollment_number),
  };
};

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
    account_id: typeof raw.account_id === 'string' ? raw.account_id : '',
    student_profile: 'student_profile' in raw ? asStudentProfile(raw.student_profile) : null,
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
    account_id: typeof raw.account_id === 'string' ? raw.account_id : undefined,
    student_profile: 'student_profile' in raw ? asStudentProfile(raw.student_profile) : null,
  };
};

const mapActionRecord = (raw: unknown): AdminActionRecord | null => {
  if (!isObj(raw) || typeof raw.action !== 'string') return null;
  return {
    action: raw.action,
    actor_role: asRole(raw.actor_role),
    target_code: asStr(raw.target_code) ?? '',
    detail: isObj(raw.detail) ? raw.detail : {},
    created_at: asStr(raw.created_at),
  };
};

const mapSessionRecord = (raw: unknown): AdminSessionRecord | null => {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  return {
    id: raw.id,
    account_id: typeof raw.account_id === 'string' ? raw.account_id : '',
    device_id: typeof raw.device_id === 'string' ? raw.device_id : '',
    device_name: asStr(raw.device_name),
    last_seen: asStr(raw.last_seen),
    created_at: asStr(raw.created_at),
    account_name: asStr(raw.account_name),
    account_role: asRole(raw.account_role),
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

export function mapActionListResult(raw: unknown): AdminResult<AdminActionRecord[]> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  if (!Array.isArray(raw.actions)) return { ok: false, error: 'UNKNOWN' };
  const actions = raw.actions.map(mapActionRecord).filter((a): a is AdminActionRecord => a !== null);
  return { ok: true, data: actions };
}

export function mapSessionListResult(raw: unknown): AdminResult<AdminSessionRecord[]> {
  if (!isObj(raw)) return { ok: false, error: 'UNKNOWN' };
  if (raw.ok !== true) return { ok: false, error: mapAdminError(raw) };
  if (!Array.isArray(raw.sessions)) return { ok: false, error: 'UNKNOWN' };
  const sessions = raw.sessions.map(mapSessionRecord).filter((s): s is AdminSessionRecord => s !== null);
  return { ok: true, data: sessions };
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
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: 'NETWORK' };
  try {
    const { data, error } = await supabase.rpc(name, params);
    if (error) {
      console.error(`Supabase RPC error (${name}):`, error);
      const c = classifyPostgrestError(error);
      return { ok: false, error: c.error, detail: c.detail };
    }
    return map(data);
  } catch (err) {
    console.error(`${name} failed:`, err);
    const c = classifyPostgrestError(err);
    return { ok: false, error: c.error, detail: c.detail };
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

/** Owner-only: adjust the max_uses session cap on an existing key. */
export async function updateKeyLimits(keyId: string, maxUses: number): Promise<AdminResult<boolean>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_update_key_limits', { p_admin_code: cred, p_key_id: keyId, p_max_uses: maxUses }, mapSetActiveResult);
}

export async function listProfiles(): Promise<AdminResult<AdminProfileRecord[]>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_list_profiles', { p_admin_code: cred }, mapProfileListResult);
}

/** Owner-only: the action-audit trail (who deactivated/reactivated/minted what). */
export async function listActions(): Promise<AdminResult<AdminActionRecord[]>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_list_actions', { p_admin_code: cred }, mapActionListResult);
}

/** Owner sees all sessions; admin sees only their own account's sessions. */
export async function listSessions(): Promise<AdminResult<AdminSessionRecord[]>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_list_sessions', { p_admin_code: cred }, mapSessionListResult);
}

/** Revoke a single device session (signs that device out). */
export async function revokeSession(sessionId: string): Promise<AdminResult<boolean>> {
  const cred = getAdminCredential();
  if (!cred) return { ok: false, error: 'UNAUTHORIZED' };
  return rpc('admin_revoke_session', { p_admin_code: cred, p_session_id: sessionId }, mapSetActiveResult);
}
