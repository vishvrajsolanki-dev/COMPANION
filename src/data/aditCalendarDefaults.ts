// Official ADIT Academic Calendar 2026-27 — the app's built-in default calendar.
//
// GROUND TRUTH: all dates below were provided by the user, read directly
// from the source PDF:
//   https://adit.ac.in/uploads/academic/circulars/circular_6a449462c13f6.pdf
//
// IMPORTANT: The original aditCalendarDefaults.ts (prior session) contained
// fabricated dates — the PDF is a scanned image with no text layer, making
// automated extraction impossible. The prior session invented provenance
// ("PDF Row 3", "HIGH confidence") without actually reading the document.
// Every date below was confirmed by the user from the real document.
//
// These are DEFAULTS only — every row is editable in the Calendar Events UI
// and can be reset back to this exact list at any time.

import type { CalendarEvent } from '../db/index';

export interface ADITSemesterDefault {
  label: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
}

// The semester the app ships with. Mirrors the ODD 2026 teaching calendar:
// ODD Sem 3/5/7 commences Mon 6 Jul 2026;
// Practical exams / termwork evaluation ends Thu 5 Nov 2026.
// Teaching period: 2026-07-06 → 2026-11-05 (19 weeks).
export const ADIT_SEMESTER_DEFAULT: ADITSemesterDefault = {
  label: 'Semester 5 (Odd 2026)',
  start_date: '2026-07-06',
  end_date: '2026-11-05',
};

export interface ADITCalendarEventDefault {
  title: string;
  date: string;       // "YYYY-MM-DD"
  type: CalendarEvent['type'];
  description?: string;
}

// Calendar events from the ADIT Academic Calendar 2026-27 ground truth.
// Only dates the user confirmed from the real PDF are included.
// Multi-day events use the START date; the description mentions the full range.
export const ADIT_CALENDAR_EVENT_DEFAULTS: ADITCalendarEventDefault[] = [
  // ── Semester boundaries ──────────────────────────────────────────────────
  {
    title: 'Odd Semester Commencement (Sem 3/5/7)',
    date: '2026-07-06',
    type: 'semester_boundary',
    description: 'Commencement of the ODD semester — Mon 6 Jul 2026',
  },

  // ── Internal Exams (Sem 3/5/7) ──────────────────────────────────────────
  {
    title: 'Internal Exams Sem 3/5/7',
    date: '2026-08-24',
    type: 'exam_window',
    description: 'Internal examinations for Sem 3/5/7 — Mon 24 Aug to Fri 28 Aug 2026',
  },

  // ── Holidays ─────────────────────────────────────────────────────────────
  {
    title: 'Rakshabandhan',
    date: '2026-08-28',
    type: 'holiday',
    description: 'Rakshabandhan — Fri 28 Aug 2026',
  },
  {
    title: 'Gandhi Jayanti',
    date: '2026-10-02',
    type: 'holiday',
    description: 'Gandhi Jayanti — Fri 2 Oct 2026',
  },
  {
    title: 'Dashera',
    date: '2026-10-20',
    type: 'holiday',
    description: 'Dashera — Tue 20 Oct 2026',
  },
  {
    title: 'Sardar Patel Jayanti',
    date: '2026-10-31',
    type: 'holiday',
    description: 'Sardar Vallabhbhai Patel Jayanti — Sat 31 Oct 2026',
  },
  {
    title: 'Christmas',
    date: '2026-12-25',
    type: 'holiday',
    description: 'Christmas — Fri 25 Dec 2026',
  },

  // ── Practical Exams / Termwork Evaluation (Sem 3/5/7) ───────────────────
  {
    title: 'Practical Exam / Termwork Evaluation (Sem 3/5/7)',
    date: '2026-11-02',
    type: 'exam_window',
    description: 'Practical exams and termwork evaluation for Sem 3/5/7 — Mon 2 Nov to Thu 5 Nov 2026',
  },

  // ── Diwali Vacation ──────────────────────────────────────────────────────
  {
    title: 'Diwali Vacation',
    date: '2026-11-06',
    type: 'college_event',
    description: 'Diwali Vacation — Fri 6 Nov to Fri 13 Nov 2026 (8 days)',
  },

  // ── University Exams (all semesters) ─────────────────────────────────────
  {
    title: 'University Exams (All Semesters)',
    date: '2026-11-23',
    type: 'exam_window',
    description: 'University examinations for all semesters — Mon 23 Nov to Sun 13 Dec 2026',
  },
];
