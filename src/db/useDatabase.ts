import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './index';

export function useActiveSemester() {
  return useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(),
    []
  );
}

export function useSubjects() {
  return useLiveQuery(
    () => db.subjects.filter(s => !s.is_deleted).toArray(),
    []
  );
}

export function useTeachers() {
  return useLiveQuery(
    () => db.teachers.filter(t => !t.is_deleted).toArray(),
    []
  );
}

export function useLectureSlots() {
  return useLiveQuery(
    () => db.lectureSlots.filter(s => !s.is_deleted).toArray(),
    []
  );
}

export function useAttendanceRecords() {
  return useLiveQuery(
    () => db.attendanceRecords.filter(r => !r.is_deleted).toArray(),
    []
  );
}

export function useTasks() {
  return useLiveQuery(
    () => db.tasks.filter(t => !t.is_deleted).toArray(),
    []
  );
}

export function useNotes() {
  return useLiveQuery(
    () => db.notes.filter(n => !n.is_deleted).toArray(),
    []
  );
}

export function useExams() {
  return useLiveQuery(
    () => db.exams.filter(e => !e.is_deleted).toArray(),
    []
  );
}

export function useResources() {
  return useLiveQuery(
    () => db.resources.filter(r => !r.is_deleted).toArray(),
    []
  );
}

export function useCalendarEvents() {
  return useLiveQuery(
    () => db.calendarEvents.filter(c => !c.is_deleted).toArray(),
    []
  );
}
