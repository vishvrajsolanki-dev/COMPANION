import Dexie, { type Table } from 'dexie';

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
  start_time: string;  // Full ISO 8601 string, e.g. "2026-08-03T09:00:00"
  end_time: string;    // Full ISO 8601 string, e.g. "2026-08-03T10:15:00"
  status: 'scheduled' | 'cancelled' | 'rescheduled' | 'extra';
  linked_slot_id?: string;
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

class AcademicOSDB extends Dexie {
  semesters!: Table<Semester>;
  subjects!: Table<Subject>;
  teachers!: Table<Teacher>;
  lectureSlots!: Table<LectureSlot>;
  attendanceRecords!: Table<AttendanceRecord>;
  tasks!: Table<Task>;
  notes!: Table<Note>;
  exams!: Table<Exam>;
  resources!: Table<Resource>;

  constructor() {
    super('AcademicOSDB');
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
    });
  }
}

export const db = new AcademicOSDB();
