import Dexie, { type Table } from 'dexie';
import { useAuthStore } from '../store/authStore';

/**
 * Dexie schema — ALL academic data lives locally per-account in IndexedDB.
 *
 * Account model (Phase B rework): each account gets its OWN database named
 * `AcademicOSDB_<accountId>`, so there is zero possibility of cross-account
 * leakage — a student's device can never see the owner's rows because they
 * live in a completely different IndexedDB. The pre-account database was
 * `AcademicOSDB`; it is preserved as a legacy fallback and one-time-migrated
 * into the owner's account database on first activation after upgrade.
 */

export interface Semester {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_deleted: boolean;
}

export interface Subject {
  id: string;
  semester_id: string;
  code: string;
  name: string;
  credits: number;
  color: string;
  current_faculty_id?: string;
  is_deleted: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cabin?: string;
  office_hours?: string;
  subject_ids: string[];
  is_deleted: boolean;
}

export interface LectureSlot {
  id: string;
  subject_id: string;
  room_id?: string;
  faculty_name?: string;
  start_time: string;  // Full ISO 8601 string, e.g. "2026-08-03T09:00:00"
  end_time: string;    // Full ISO 8601 string, e.g. "2026-08-03T10:15:00"
  status: 'scheduled' | 'cancelled' | 'rescheduled' | 'extra';
  linked_slot_id?: string;
  is_deleted: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  type: 'holiday' | 'exam_window' | 'college_event' | 'semester_boundary';
  description?: string;
  is_deleted: boolean;
}

export interface AttendanceEditLog {
  changed_at: string;
  old_status: string;
  new_status: string;
  reason?: string;
}

export interface AttendanceRecord {
  id: string;
  lecture_slot_id: string;
  status: 'present' | 'absent' | 'late' | 'medical' | 'onduty';
  marked_at: string;
  edit_history?: AttendanceEditLog[];
  version: number;
  is_deleted: boolean;
}

export interface Task {
  id: string;
  subject_id?: string;
  depends_on_task_id?: string;
  title: string;
  due_at: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  subtasks?: { id: string; title: string; completed: boolean }[];
  is_deleted: boolean;
}

export interface Note {
  id: string;
  subject_id?: string;
  lecture_slot_id?: string;
  title: string;
  body_markdown: string;
  tags: string[];
  is_deleted: boolean;
}

export interface Exam {
  id: string;
  subject_id: string;
  type: string;
  date: string;
  syllabus_checklist: { topic: string; completed: boolean }[];
  is_deleted: boolean;
}

export interface Resource {
  id: string;
  subject_id: string;
  title: string;
  type: 'pdf' | 'drive' | 'github' | 'url' | 'other';
  url_or_file_ref: string;
  description?: string;
  is_deleted: boolean;
}

export class AcademicOSDB extends Dexie {
  semesters!: Table<Semester>;
  subjects!: Table<Subject>;
  teachers!: Table<Teacher>;
  lectureSlots!: Table<LectureSlot>;
  attendanceRecords!: Table<AttendanceRecord>;
  tasks!: Table<Task>;
  notes!: Table<Note>;
  exams!: Table<Exam>;
  resources!: Table<Resource>;
  calendarEvents!: Table<CalendarEvent>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      semesters: 'id, is_active, is_deleted',
      subjects: 'id, semester_id, code, is_deleted',
      teachers: 'id, is_deleted',
      lectureSlots: 'id, subject_id, start_time, status, is_deleted',
      attendanceRecords: 'id, lecture_slot_id, status, is_deleted',
      tasks: 'id, subject_id, due_at, status, is_deleted',
      notes: 'id, subject_id, title, *tags, is_deleted',
      exams: 'id, subject_id, date, is_deleted',
      resources: 'id, subject_id, type, is_deleted',
      calendarEvents: 'id, date, type, is_deleted',
    });
  }
}

const LEGACY_DB_NAME = 'AcademicOSDB';

/** Cache of open DB instances, keyed by database name. */
const dbInstances = new Map<string, AcademicOSDB>();

/**
 * Returns the Dexie database for an account. `accountId` omitted/null returns
 * the legacy default database (`AcademicOSDB`) — used for the pre-account
 * fallback and the one-time migration source.
 */
export function getDB(accountId?: string | null): AcademicOSDB {
  const name = accountId ? `${LEGACY_DB_NAME}_${accountId}` : LEGACY_DB_NAME;
  let inst = dbInstances.get(name);
  if (!inst) {
    inst = new AcademicOSDB(name);
    dbInstances.set(name, inst);
  }
  return inst;
}

/** The active account's database, or the legacy default when not activated. */
export function getActiveDB(): AcademicOSDB {
  const accountId = useAuthStore.getState().activation?.accountId ?? null;
  return getDB(accountId);
}

/**
 * The module-level `db` used throughout the app. It is a Proxy that forwards
 * every property / method access to the ACTIVE account's database, so existing
 * views are account-scoped without per-file changes: `db.semesters.put(...)`
 * always writes to the signed-in account's database. Function properties are
 * bound to the resolved instance so Dexie internals (`transaction`, `version`,
 * `open`, …) keep their `this`.
 */
export const db: AcademicOSDB = new Proxy(
  {} as AcademicOSDB,
  {
    get(_target, prop) {
      const active = getActiveDB();
      const value = Reflect.get(active, prop, active);
      return typeof value === 'function' ? value.bind(active) : value;
    },
    has(_target, prop) {
      return prop in getActiveDB();
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(getActiveDB(), prop);
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(getActiveDB());
    },
    ownKeys() {
      return Reflect.ownKeys(getActiveDB());
    },
  },
);

export const DB_TABLE_NAMES = [
  'semesters',
  'subjects',
  'teachers',
  'lectureSlots',
  'attendanceRecords',
  'tasks',
  'notes',
  'exams',
  'resources',
  'calendarEvents',
] as const;

/**
 * One-time upgrade path: copies all rows from the legacy `AcademicOSDB` (the
 * single device-wide database that existed before the account model) into the
 * caller's account database.
 *
 * Only the OWNER account takes the legacy data. The legacy database on any
 * device predates accounts and in practice belongs to the owner; a student who
 * activates on a device still holding owner rows must NOT inherit them — that
 * is exactly the A2 data-leak this rework closes. Students/admins start from a
 * fresh database (which is then seeded with the standard reference data).
 *
 * Safe to call repeatedly: it is a no-op once the account database has data or
 * when the legacy database is empty. The legacy database is preserved (not
 * deleted) as a safety net.
 */
export async function migrateLegacyDataIfNeeded(
  accountId: string,
  role: 'student' | 'admin' | 'owner' | string,
): Promise<boolean> {
  if (role !== 'owner') return false;

  const accountDB = getDB(accountId);
  const legacyDB = getDB(null);

  // Account database already populated → already migrated / seeded.
  if ((await accountDB.semesters.count()) > 0) return false;
  // Legacy database has nothing to copy → nothing to migrate.
  if ((await legacyDB.semesters.count()) === 0) return false;

  // Read legacy table rows outside accountDB transaction to avoid cross-database transaction errors.
  const legacyDataMap = new Map<string, any[]>();
  for (const name of DB_TABLE_NAMES) {
    const rows = await legacyDB.table(name).toArray();
    if (rows.length > 0) {
      legacyDataMap.set(name, rows);
    }
  }

  if (legacyDataMap.size > 0) {
    await accountDB.transaction('rw', accountDB.tables, async () => {
      for (const [name, rows] of legacyDataMap.entries()) {
        await accountDB.table(name).bulkPut(rows);
      }
    });
  }

  return true;
}
