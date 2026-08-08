import { supabase } from './supabase';
import { getAdminCredential } from './adminKeys';

/**
 * Reference data client — ADIT institutional faculty and subjects.
 *
 * Read path: anon SELECT policies on reference_faculty / reference_subjects
 * tables (public institutional data, no auth required).
 *
 * Write path: admin_upsert_reference_data RPC (owner-only, SECURITY DEFINER).
 */

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ReferenceFaculty {
  id: string;
  name: string;
  designation: string | null;
  department: string;
  email: string | null;
}

export interface ReferenceSubject {
  id: string;
  course_code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  ltp: string | null;
}

export interface ReferenceDataSummary {
  faculty_count: number;
  subjects_count: number;
  departments: string[];
}

export type ReferenceDataErrorCode = 'NETWORK' | 'EMPTY' | 'UNKNOWN';

/* ── Mappers ───────────────────────────────────────────────────────────────── */

export function mapReferenceFaculty(raw: unknown): ReferenceFaculty | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    designation: asStr(raw.designation),
    department: typeof raw.department === 'string' ? raw.department : '',
    email: asStr(raw.email),
  };
}

export function mapReferenceSubject(raw: unknown): ReferenceSubject | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    course_code: typeof raw.course_code === 'string' ? raw.course_code : '',
    name: raw.name,
    department: typeof raw.department === 'string' ? raw.department : '',
    semester: typeof raw.semester === 'number' ? raw.semester : 0,
    credits: typeof raw.credits === 'number' ? raw.credits : 3,
    ltp: asStr(raw.ltp),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/* ── Read queries (direct table access via anon SELECT) ────────────────────── */

/**
 * Fetch reference subjects, optionally filtered by department and semester.
 * Degrades gracefully offline (returns empty array).
 */
export async function getReferenceSubjects(opts?: {
  department?: string;
  semester?: number;
}): Promise<{ data: ReferenceSubject[]; error: ReferenceDataErrorCode | null }> {
  if (!supabase) return { data: [], error: 'NETWORK' };
  try {
    let q = supabase.from('reference_subjects').select('*').eq('is_deleted', false);
    if (opts?.department) q = q.eq('department', opts.department);
    if (opts?.semester) q = q.eq('semester', opts.semester);
    q = q.order('semester').order('course_code');

    const { data, error } = await q;
    if (error) {
      console.error('getReferenceSubjects error:', error);
      return { data: [], error: 'NETWORK' };
    }
    return { data: (data || []).map(mapReferenceSubject).filter(Boolean) as ReferenceSubject[], error: null };
  } catch (err) {
    console.error('getReferenceSubjects failed:', err);
    return { data: [], error: 'NETWORK' };
  }
}

/**
 * Fetch reference faculty, optionally filtered by department.
 * Degrades gracefully offline (returns empty array).
 */
export async function getReferenceFaculty(opts?: {
  department?: string;
}): Promise<{ data: ReferenceFaculty[]; error: ReferenceDataErrorCode | null }> {
  if (!supabase) return { data: [], error: 'NETWORK' };
  try {
    let q = supabase.from('reference_faculty').select('*').eq('is_deleted', false);
    if (opts?.department) q = q.eq('department', opts.department);
    q = q.order('name');

    const { data, error } = await q;
    if (error) {
      console.error('getReferenceFaculty error:', error);
      return { data: [], error: 'NETWORK' };
    }
    return { data: (data || []).map(mapReferenceFaculty).filter(Boolean) as ReferenceFaculty[], error: null };
  } catch (err) {
    console.error('getReferenceFaculty failed:', err);
    return { data: [], error: 'NETWORK' };
  }
}

/* ── Admin write path ──────────────────────────────────────────────────────── */

export interface UpsertResult {
  faculty_inserted: number;
  faculty_updated: number;
  subjects_inserted: number;
  subjects_updated: number;
}

/** Result type for admin operations. */
export type AdminRefResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ReferenceDataErrorCode };

/**
 * Bulk upsert reference data (owner-only). Called from the Admin Portal "Data" tab.
 */
export async function upsertReferenceData(
  faculty: Array<{ name: string; designation?: string | null; department: string; email?: string | null }>,
  subjects: Array<{ course_code: string; name: string; department: string; semester: number; credits?: number; ltp?: string | null }>,
): Promise<AdminRefResult<UpsertResult>> {
  const cred = getAdminCredential();
  if (!cred || !supabase) return { ok: false, error: 'NETWORK' };

  try {
    const { data, error } = await supabase.rpc('admin_upsert_reference_data', {
      p_admin_code: cred,
      p_faculty: faculty,
      p_subjects: subjects,
    });
    if (error) {
      console.error('upsertReferenceData RPC error:', error);
      return { ok: false, error: 'NETWORK' };
    }
    if (!data?.ok) return { ok: false, error: 'NETWORK' };
    return {
      ok: true,
      data: {
        faculty_inserted: data.faculty_inserted || 0,
        faculty_updated: data.faculty_updated || 0,
        subjects_inserted: data.subjects_inserted || 0,
        subjects_updated: data.subjects_updated || 0,
      },
    };
  } catch (err) {
    console.error('upsertReferenceData failed:', err);
    return { ok: false, error: 'NETWORK' };
  }
}

/**
 * List reference data summary (owner-only). Returns counts + department list.
 */
export async function listReferenceDataSummary(): Promise<AdminRefResult<ReferenceDataSummary>> {
  const cred = getAdminCredential();
  if (!cred || !supabase) return { ok: false, error: 'NETWORK' };

  try {
    const { data, error } = await supabase.rpc('admin_list_reference_data', {
      p_admin_code: cred,
    });
    if (error) {
      console.error('listReferenceDataSummary RPC error:', error);
      return { ok: false, error: 'NETWORK' };
    }
    if (!data?.ok) return { ok: false, error: 'NETWORK' };
    return {
      ok: true,
      data: {
        faculty_count: data.faculty_count || 0,
        subjects_count: data.subjects_count || 0,
        departments: Array.isArray(data.departments) ? data.departments : [],
      },
    };
  } catch (err) {
    console.error('listReferenceDataSummary failed:', err);
    return { ok: false, error: 'NETWORK' };
  }
}

/* ── Fuzzy matching helper (for timetable import) ──────────────────────────── */

/**
 * Find the closest matching reference faculty by name. Uses simple
 * case-insensitive substring matching as a first pass, then falls back to
 * Levenshtein-like distance for short names.
 *
 * Returns null when no reasonable match is found (caller should fall back to
 * user-entered name).
 */
export function findBestFacultyMatch(
  inputName: string,
  facultyList: ReferenceFaculty[],
  threshold = 0.6,
): ReferenceFaculty | null {
  if (!inputName.trim() || facultyList.length === 0) return null;
  const normalized = inputName.trim().toLowerCase();

  // Exact match first
  const exact = facultyList.find(f => f.name.toLowerCase() === normalized);
  if (exact) return exact;

  // Substring match
  const substring = facultyList.find(f =>
    f.name.toLowerCase().includes(normalized) ||
    normalized.includes(f.name.toLowerCase())
  );
  if (substring) return substring;

  // Token overlap: check if all words of the input appear in the faculty name
  const inputTokens = normalized.split(/\s+/).filter(t => t.length > 1);
  if (inputTokens.length > 0) {
    let bestScore = 0;
    let bestMatch: ReferenceFaculty | null = null;

    for (const f of facultyList) {
      const nameTokens = f.name.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      if (nameTokens.length === 0) continue;
      const matchingTokens = inputTokens.filter(t =>
        nameTokens.some(nt => nt.includes(t) || t.includes(nt))
      );
      const score = matchingTokens.length / inputTokens.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = f;
      }
    }

    if (bestScore >= threshold) return bestMatch;
  }

  return null;
}
