import { db } from './index';

export async function seedDatabaseIfEmpty() {
  if (typeof window !== 'undefined' && localStorage.getItem('academic_os_user_cleared') === 'true') {
    return; // User explicitly wiped database to enter real data — do not auto-reseed
  }

  const semesterCount = await db.semesters.count();
  if (semesterCount > 0) return; // Already seeded

  // ── Semester ──────────────────────────────────────────────────────────────
  await db.semesters.add({
    id: 'sem-5',
    label: 'Semester 5 (Odd 2026)',
    start_date: '2026-08-01',
    end_date: '2026-12-15',
    is_active: true,
    is_deleted: false,
  });

  // ── Subjects ─────────────────────────────────────────────────────────────
  // Colors sourced from --subject-1 through --subject-7 in tokens.css
  const subjects = [
    { id: 'sub-1', semester_id: 'sem-5', code: '2AI501', name: 'Machine Learning',           credits: 4, color: '#3B82F6', current_faculty_id: 'teacher-1', is_deleted: false },
    { id: 'sub-2', semester_id: 'sem-5', code: '2AI502', name: 'Data Structures & Algorithms', credits: 4, color: '#8B5CF6', current_faculty_id: 'teacher-2', is_deleted: false },
    { id: 'sub-3', semester_id: 'sem-5', code: '2AI503', name: 'Database Systems',            credits: 3, color: '#10B981', current_faculty_id: 'teacher-3', is_deleted: false },
    { id: 'sub-4', semester_id: 'sem-5', code: '2AI504', name: 'Computer Networks',           credits: 3, color: '#F59E0B', current_faculty_id: 'teacher-4', is_deleted: false },
    { id: 'sub-5', semester_id: 'sem-5', code: '2AI505', name: 'Software Engineering',        credits: 3, color: '#EF4444', current_faculty_id: 'teacher-5', is_deleted: false },
    { id: 'sub-6', semester_id: 'sem-5', code: '2AI506', name: 'AI Lab (Batch A)',             credits: 2, color: '#06B6D4', current_faculty_id: 'teacher-1', is_deleted: false },
  ];
  await db.subjects.bulkAdd(subjects);

  // ── Teachers ─────────────────────────────────────────────────────────────
  const teachers = [
    { id: 'teacher-1', name: 'Prof. Kavita Patel',   email: 'kavita.patel@adit.ac.in',   phone: '+91-98765-11111', cabin: 'AB-214', office_hours: 'Mon–Wed 10:00–12:00', subject_ids: ['sub-1', 'sub-6'], is_deleted: false },
    { id: 'teacher-2', name: 'Prof. Ramesh Shah',    email: 'ramesh.shah@adit.ac.in',    phone: '+91-98765-22222', cabin: 'AB-305', office_hours: 'Tue–Thu 14:00–16:00', subject_ids: ['sub-2'], is_deleted: false },
    { id: 'teacher-3', name: 'Dr. Priya Mehta',      email: 'priya.mehta@adit.ac.in',    phone: '+91-98765-33333', cabin: 'CS-101', office_hours: 'Mon, Fri 09:00–10:00', subject_ids: ['sub-3'], is_deleted: false },
    { id: 'teacher-4', name: 'Prof. Ajay Trivedi',   email: 'ajay.trivedi@adit.ac.in',   phone: '+91-98765-44444', cabin: 'CS-203', office_hours: 'Wed–Thu 11:00–13:00',  subject_ids: ['sub-4'], is_deleted: false },
    { id: 'teacher-5', name: 'Dr. Sneha Joshi',      email: 'sneha.joshi@adit.ac.in',    phone: '+91-98765-55555', cabin: 'AB-412', office_hours: 'Tue, Fri 15:00–17:00', subject_ids: ['sub-5'], is_deleted: false },
  ];
  await db.teachers.bulkAdd(teachers);

  // ── Lecture Slots (Week of Aug 4–9, 2026) ─────────────────────────────────
  // Dates use naive local IST strings (no trailing Z — wall-clock times)
  const lectureSlots = [
    // Monday Aug 4
    { id: 'slot-mon-1', subject_id: 'sub-1', room_id: 'LH-301', start_time: '2026-08-04T09:00:00', end_time: '2026-08-04T10:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-mon-2', subject_id: 'sub-2', room_id: 'LH-302', start_time: '2026-08-04T10:30:00', end_time: '2026-08-04T11:45:00', status: 'scheduled' as const, is_deleted: false },
    // slot-mon-3 was rescheduled to Wednesday — mark cancelled so it doesn't double-count
    { id: 'slot-mon-3', subject_id: 'sub-3', room_id: 'LH-201', start_time: '2026-08-04T13:00:00', end_time: '2026-08-04T14:15:00', status: 'cancelled' as const, linked_slot_id: 'slot-wed-2', is_deleted: false },
    { id: 'slot-mon-4', subject_id: 'sub-4', room_id: 'LH-402', start_time: '2026-08-04T14:30:00', end_time: '2026-08-04T15:45:00', status: 'scheduled' as const, is_deleted: false },

    // Tuesday Aug 5 (today in simulation)
    { id: 'slot-tue-1', subject_id: 'sub-1', room_id: 'LH-301', start_time: '2026-08-05T09:00:00', end_time: '2026-08-05T10:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-tue-2', subject_id: 'sub-5', room_id: 'LH-205', start_time: '2026-08-05T10:30:00', end_time: '2026-08-05T11:45:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-tue-3', subject_id: 'sub-2', room_id: 'LH-302', start_time: '2026-08-05T13:00:00', end_time: '2026-08-05T14:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-tue-4', subject_id: 'sub-4', room_id: 'LH-402', start_time: '2026-08-05T14:30:00', end_time: '2026-08-05T15:45:00', status: 'scheduled' as const, is_deleted: false },

    // Wednesday Aug 6
    { id: 'slot-wed-1', subject_id: 'sub-1', room_id: 'LH-301', start_time: '2026-08-06T09:00:00', end_time: '2026-08-06T10:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-wed-2', subject_id: 'sub-3', room_id: 'LH-201', start_time: '2026-08-06T10:30:00', end_time: '2026-08-06T11:45:00', status: 'rescheduled' as const, linked_slot_id: 'slot-mon-3', is_deleted: false },
    { id: 'slot-wed-3', subject_id: 'sub-5', room_id: 'LH-205', start_time: '2026-08-06T13:00:00', end_time: '2026-08-06T14:15:00', status: 'scheduled' as const, is_deleted: false },

    // Thursday Aug 7
    { id: 'slot-thu-1', subject_id: 'sub-2', room_id: 'LH-302', start_time: '2026-08-07T09:00:00', end_time: '2026-08-07T10:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-thu-2', subject_id: 'sub-3', room_id: 'LH-201', start_time: '2026-08-07T10:30:00', end_time: '2026-08-07T11:45:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-thu-3', subject_id: 'sub-4', room_id: 'LH-402', start_time: '2026-08-07T13:00:00', end_time: '2026-08-07T14:15:00', status: 'scheduled' as const, is_deleted: false },

    // Friday Aug 8
    { id: 'slot-fri-1', subject_id: 'sub-5', room_id: 'LH-205', start_time: '2026-08-08T09:00:00', end_time: '2026-08-08T10:15:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-fri-2', subject_id: 'sub-1', room_id: 'LH-301', start_time: '2026-08-08T10:30:00', end_time: '2026-08-08T11:45:00', status: 'scheduled' as const, is_deleted: false },
    { id: 'slot-fri-3', subject_id: 'sub-3', room_id: 'LH-201', start_time: '2026-08-08T13:00:00', end_time: '2026-08-08T14:15:00', status: 'scheduled' as const, is_deleted: false },

    // Saturday Aug 9 — Lab session
    { id: 'slot-sat-1', subject_id: 'sub-6', room_id: 'CL-101', start_time: '2026-08-09T10:00:00', end_time: '2026-08-09T12:30:00', status: 'scheduled' as const, is_deleted: false },
  ];
  await db.lectureSlots.bulkAdd(lectureSlots);

  // ── Attendance Records (for Monday Aug 4 only — past slots) ──────────────
  // Denominator rule: only count slots with attendance records
  const attendanceRecords = [
    { id: 'att-1', lecture_slot_id: 'slot-mon-1', status: 'present' as const,  marked_at: '2026-08-04T10:20:00', version: 1, is_deleted: false },
    { id: 'att-2', lecture_slot_id: 'slot-mon-2', status: 'present' as const,  marked_at: '2026-08-04T11:50:00', version: 1, is_deleted: false },
    // slot-mon-3 is cancelled — NO attendance record (excluded from denominator)
    { id: 'att-4', lecture_slot_id: 'slot-mon-4', status: 'absent'  as const,  marked_at: '2026-08-04T16:00:00', version: 1, is_deleted: false },
    // slot-wed-2 (rescheduled version of mon-3) — has a present record
    { id: 'att-wed-2', lecture_slot_id: 'slot-wed-2', status: 'present' as const, marked_at: '2026-08-06T12:00:00', version: 1, is_deleted: false },
  ];
  await db.attendanceRecords.bulkAdd(attendanceRecords);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const tasks = [
    { id: 'task-1', subject_id: 'sub-1', title: 'Complete ML Assignment 2 — Regression Models', due_at: '2026-08-05T23:59:00', priority: 'high'   as const, status: 'todo' as const, is_deleted: false },
    { id: 'task-2', subject_id: 'sub-2', title: 'Study AVL Trees & Rotations for Midsem',        due_at: '2026-08-07T23:59:00', priority: 'urgent' as const, status: 'todo' as const, is_deleted: false },
    { id: 'task-3', subject_id: 'sub-3', title: 'ER Diagram for Lab Record',                      due_at: '2026-08-06T14:00:00', priority: 'medium' as const, status: 'todo' as const, is_deleted: false },
    { id: 'task-4', subject_id: 'sub-5', title: 'Software Requirement Specification Draft',       due_at: '2026-08-10T23:59:00', priority: 'medium' as const, status: 'in_progress' as const, is_deleted: false },
    { id: 'task-5',                       title: 'Buy stationery for lab record',                  due_at: '2026-08-05T12:00:00', priority: 'low'    as const, status: 'completed' as const, is_deleted: false },
  ];
  await db.tasks.bulkAdd(tasks);

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notes = [
    {
      id: 'note-1',
      subject_id: 'sub-1',
      title: 'Linear Regression — Key Concepts',
      body_markdown: `# Linear Regression\n\n## Cost Function\n$$J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_\\theta(x^{(i)}) - y^{(i)})^2$$\n\n## Gradient Descent\n- Update rule: $\\theta_j := \\theta_j - \\alpha \\frac{\\partial J}{\\partial \\theta_j}$\n- Learning rate $\\alpha$ must be chosen carefully\n\n## Key Points\n- Assumes linear relationship between features and target\n- Sensitive to outliers\n- Feature scaling (standardization) recommended`,
      tags: ['midsem', 'regression', 'ml'],
      is_deleted: false,
    },
    {
      id: 'note-2',
      subject_id: 'sub-2',
      title: 'AVL Tree Rotations',
      body_markdown: `# AVL Trees\n\n## Balance Factor\nBF = height(left) - height(right). Must be -1, 0, or +1.\n\n## Rotation Cases\n1. **LL** — Right rotate\n2. **RR** — Left rotate\n3. **LR** — Left then Right rotate\n4. **RL** — Right then Left rotate\n\n## Time Complexity\n- Insert: O(log n)\n- Delete: O(log n)\n- Search: O(log n)`,
      tags: ['midsem', 'trees', 'dsa'],
      is_deleted: false,
    },
    {
      id: 'note-3',
      subject_id: 'sub-3',
      title: 'Normalization Forms — 1NF to BCNF',
      body_markdown: `# Database Normalization\n\n## 1NF\n- Atomic column values, no repeating groups\n\n## 2NF\n- Must be 1NF + No partial dependencies on PK\n\n## 3NF\n- Must be 2NF + No transitive dependencies\n\n## BCNF\n- Every determinant must be a candidate key`,
      tags: ['lab', 'normalization', 'db'],
      is_deleted: false,
    },
  ];
  await db.notes.bulkAdd(notes);

  // ── Exams ─────────────────────────────────────────────────────────────────
  const exams = [
    {
      id: 'exam-1',
      subject_id: 'sub-1',
      type: 'midsem',
      date: '2026-08-12T10:00:00',
      syllabus_checklist: [
        { topic: 'Linear Regression',        completed: true  },
        { topic: 'Logistic Regression',       completed: false },
        { topic: 'Decision Trees',            completed: false },
        { topic: 'Bias-Variance Tradeoff',    completed: false },
        { topic: 'Cross Validation',          completed: false },
      ],
      is_deleted: false,
    },
    {
      id: 'exam-2',
      subject_id: 'sub-2',
      type: 'quiz',
      date: '2026-08-07T13:00:00',
      syllabus_checklist: [
        { topic: 'AVL Trees',       completed: false },
        { topic: 'Heaps',           completed: false },
        { topic: 'Graph BFS/DFS',   completed: false },
      ],
      is_deleted: false,
    },
    {
      id: 'exam-3',
      subject_id: 'sub-3',
      type: 'midsem',
      date: '2026-08-13T10:00:00',
      syllabus_checklist: [
        { topic: '1NF to BCNF Normalization', completed: false },
        { topic: 'ER Diagram',                completed: false },
        { topic: 'SQL Joins',                 completed: false },
        { topic: 'Transactions & ACID',       completed: false },
      ],
      is_deleted: false,
    },
  ];
  await db.exams.bulkAdd(exams);

  // ── Resources ─────────────────────────────────────────────────────────────
  const resources = [
    { id: 'res-1', subject_id: 'sub-1', title: 'ML Course Slides — Unit 1',         type: 'drive'  as const, url_or_file_ref: 'https://drive.google.com/ml-unit1',         description: 'Regression & Classification slides', is_deleted: false },
    { id: 'res-2', subject_id: 'sub-1', title: 'Andrew Ng ML Notes PDF',             type: 'pdf'    as const, url_or_file_ref: 'https://cs229.stanford.edu/notes2022fall/', description: 'Stanford CS229 lecture notes',        is_deleted: false },
    { id: 'res-3', subject_id: 'sub-2', title: 'DSA GitHub Reference',               type: 'github' as const, url_or_file_ref: 'https://github.com/williamfiset/Algorithms', description: 'Java implementations reference',     is_deleted: false },
    { id: 'res-4', subject_id: 'sub-2', title: 'Visualgo — AVL Visualization',       type: 'url'    as const, url_or_file_ref: 'https://visualgo.net/en/bst',               description: 'Interactive BST / AVL visualizer',   is_deleted: false },
    { id: 'res-5', subject_id: 'sub-3', title: 'Database Lab Manual — ADIT',         type: 'drive'  as const, url_or_file_ref: 'https://drive.google.com/db-lab-manual',    description: 'Official ADIT lab experiments',      is_deleted: false },
    { id: 'res-6', subject_id: 'sub-4', title: 'Forouzan Textbook PDF',              type: 'pdf'    as const, url_or_file_ref: 'https://drive.google.com/forouzan',          description: 'Data Comm & Networking',             is_deleted: false },
    { id: 'res-7', subject_id: 'sub-5', title: 'Pressman Software Engg. Slides',     type: 'drive'  as const, url_or_file_ref: 'https://drive.google.com/pressman',          description: 'Unit 1–3 presentation decks',       is_deleted: false },
    { id: 'res-8', subject_id: 'sub-6', title: 'Scikit-Learn Quick Reference',       type: 'url'    as const, url_or_file_ref: 'https://scikit-learn.org/stable/user_guide', description: 'Official sklearn documentation',     is_deleted: false },
  ];
  await db.resources.bulkAdd(resources);
}
