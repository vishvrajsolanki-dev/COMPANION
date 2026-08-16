import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, getActiveDB, DB_TABLE_NAMES } from '../index';
import { ensureAccountData } from '../seeds';
import { useAuthStore } from '../../store/authStore';

describe('Account Data Isolation & Empty Workspace Model', () => {
  beforeEach(() => {
    // Reset Zustand auth state before each test
    useAuthStore.setState({
      status: 'unactivated',
      activation: null,
      error: null,
    });
  });

  it('1. Fresh activation initializes an EMPTY academic workspace across all tables', async () => {
    const accountId = 'account-fresh-student-123';
    const role = 'student';

    // Run first-run setup for the fresh student account
    await ensureAccountData(accountId, role);

    const accountDB = getDB(accountId);

    // Verify all 10 domain tables individually have count === 0
    expect(await accountDB.semesters.count(), 'semesters count').toBe(0);
    expect(await accountDB.subjects.count(), 'subjects count').toBe(0);
    expect(await accountDB.teachers.count(), 'teachers count').toBe(0);
    expect(await accountDB.lectureSlots.count(), 'lectureSlots count').toBe(0);
    expect(await accountDB.attendanceRecords.count(), 'attendanceRecords count').toBe(0);
    expect(await accountDB.tasks.count(), 'tasks count').toBe(0);
    expect(await accountDB.notes.count(), 'notes count').toBe(0);
    expect(await accountDB.exams.count(), 'exams count').toBe(0);
    expect(await accountDB.resources.count(), 'resources count').toBe(0);
    expect(await accountDB.calendarEvents.count(), 'calendarEvents count').toBe(0);
  });

  it('2. Preserves existing local data for an activated account', async () => {
    const accountId = 'account-student-with-data-456';
    const role = 'student';

    // Account creates custom data
    const accountDB = getDB(accountId);
    await accountDB.subjects.put({
      id: 'sub-custom-1',
      semester_id: 'sem-custom',
      code: 'CS101',
      name: 'Custom Physics',
      credits: 4,
      color: '#FF0000',
      is_deleted: false,
    });
    await accountDB.tasks.put({
      id: 'task-custom-1',
      title: 'Lab Report 1',
      due_at: '2026-08-20T23:59:00',
      priority: 'high',
      status: 'todo',
      is_deleted: false,
    });

    // Re-running ensureAccountData preserves existing data
    await ensureAccountData(accountId, role);

    const subjectCount = await accountDB.subjects.count();
    const taskCount = await accountDB.tasks.count();

    expect(subjectCount).toBe(1);
    expect(taskCount).toBe(1);

    const savedSubject = await accountDB.subjects.get('sub-custom-1');
    expect(savedSubject?.name).toBe('Custom Physics');
  });

  it('3. Enforces strict Account Isolation: Account A data is NOT visible to Account B', async () => {
    const accountIdA = 'account-A-uuid-789';
    const accountIdB = 'account-B-uuid-999';

    // ── Account A creates data ──────────────────────────────────────────────
    useAuthStore.setState({
      status: 'activated',
      activation: {
        role: 'student',
        accountId: accountIdA,
        profileId: 'prof-A',
        sessionToken: 'token-A',
        codePreview: 'AAA1…',
        activatedAt: new Date().toISOString(),
      },
    });

    await ensureAccountData(accountIdA, 'student');
    const dbA = getActiveDB();
    await dbA.subjects.put({
      id: 'sub-A1',
      semester_id: 'sem-A',
      code: '2AI501',
      name: 'Machine Learning (Account A)',
      credits: 4,
      color: '#3B82F6',
      is_deleted: false,
    });

    expect(await dbA.subjects.count()).toBe(1);

    // ── Account B activates on the same device ──────────────────────────────
    useAuthStore.setState({
      status: 'activated',
      activation: {
        role: 'student',
        accountId: accountIdB,
        profileId: 'prof-B',
        sessionToken: 'token-B',
        codePreview: 'BBB2…',
        activatedAt: new Date().toISOString(),
      },
    });

    await ensureAccountData(accountIdB, 'student');
    const dbB = getActiveDB();

    // Account B must see an empty workspace (0 subjects from Account A)
    expect(await dbB.subjects.count()).toBe(0);

    // Account B creates their own subject
    await dbB.subjects.put({
      id: 'sub-B1',
      semester_id: 'sem-B',
      code: 'MATH101',
      name: 'Calculus (Account B)',
      credits: 3,
      color: '#10B981',
      is_deleted: false,
    });

    expect(await dbB.subjects.count()).toBe(1);

    // ── Switch back to Account A ─────────────────────────────────────────────
    useAuthStore.setState({
      status: 'activated',
      activation: {
        role: 'student',
        accountId: accountIdA,
        profileId: 'prof-A',
        sessionToken: 'token-A',
        codePreview: 'AAA1…',
        activatedAt: new Date().toISOString(),
      },
    });

    const dbAReturned = getActiveDB();
    expect(await dbAReturned.subjects.count()).toBe(1);
    const subA = await dbAReturned.subjects.get('sub-A1');
    expect(subA?.name).toBe('Machine Learning (Account A)');
    expect(await dbAReturned.subjects.get('sub-B1')).toBeUndefined();
  });

  it('4. Sign-out clears auth state and switching accounts does not leak data', async () => {
    const accountIdA = 'account-signout-A';
    const accountIdB = 'account-signout-B';

    // Account A active
    useAuthStore.setState({
      status: 'activated',
      activation: {
        role: 'student',
        accountId: accountIdA,
        profileId: 'prof-A',
        sessionToken: 'token-A',
        codePreview: 'AAA1…',
        activatedAt: new Date().toISOString(),
      },
    });
    const dbA = getActiveDB();
    await dbA.notes.put({
      id: 'note-A1',
      title: 'Secret Notes A',
      body_markdown: 'Private data',
      tags: ['secret'],
      is_deleted: false,
    });

    // Sign out
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().activation).toBeNull();
    expect(useAuthStore.getState().status).toBe('unactivated');

    // Account B activates
    useAuthStore.setState({
      status: 'activated',
      activation: {
        role: 'student',
        accountId: accountIdB,
        profileId: 'prof-B',
        sessionToken: 'token-B',
        codePreview: 'BBB2…',
        activatedAt: new Date().toISOString(),
      },
    });
    const dbB = getActiveDB();
    expect(await dbB.notes.count()).toBe(0);
    expect(await dbB.notes.get('note-A1')).toBeUndefined();
  });

  it('5. Verifies owner legacy data migration copies legacy AcademicOSDB data on upgrade', async () => {
    const ownerAccountId = 'account-owner-legacy-upgrade';
    const legacyDB = getDB(null);

    // Populate legacy database (representing pre-account single-user install)
    await legacyDB.semesters.put({
      id: 'sem-legacy-1',
      label: 'Legacy Semester 1',
      start_date: '2026-01-01',
      end_date: '2026-05-31',
      is_active: true,
      is_deleted: false,
    });
    await legacyDB.subjects.put({
      id: 'sub-legacy-1',
      semester_id: 'sem-legacy-1',
      code: 'LEG101',
      name: 'Legacy Subject',
      credits: 4,
      color: '#000000',
      is_deleted: false,
    });

    // Owner activates -> legacy data is migrated
    await ensureAccountData(ownerAccountId, 'owner');

    const ownerDB = getDB(ownerAccountId);
    expect(await ownerDB.semesters.count()).toBe(1);
    expect(await ownerDB.subjects.count()).toBe(1);

    const migratedSub = await ownerDB.subjects.get('sub-legacy-1');
    expect(migratedSub?.name).toBe('Legacy Subject');
  });

  it('6. Verifies fresh student account NEVER inherits legacy owner database rows', async () => {
    const studentAccountId = 'account-student-fresh-no-legacy';
    const legacyDB = getDB(null);

    // Legacy DB has legacy owner rows
    await legacyDB.semesters.put({
      id: 'sem-legacy-owner-only',
      label: 'Owner Private Semester',
      start_date: '2026-01-01',
      end_date: '2026-05-31',
      is_active: true,
      is_deleted: false,
    });

    // Student activates -> should NOT migrate legacy owner rows
    await ensureAccountData(studentAccountId, 'student');

    const studentDB = getDB(studentAccountId);
    expect(await studentDB.semesters.count()).toBe(0);
  });
});
