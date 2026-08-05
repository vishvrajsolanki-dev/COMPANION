# Student Academic OS — Product Requirements Document
**Owner:** Vishvraj Solanki | B.Tech AI & Data Science, ADIT (CVM University) | Batch 2029
**Scope:** Personal use, self-hosted, zero recurring cost, built to survive 4 years unattended
**Stack (confirmed):** React + Vite + PWA · IndexedDB (Dexie.js) offline store · Node.js/Express backend · Oracle Cloud Always Free VM · Neon Postgres · Web Push (VAPID) · Sentry (free tier, GitHub Student Pack)

---

## 1. Vision

A single second brain that replaces four separate mental-tracking systems — attendance math, timetable memory, note scatter, and deadline anxiety — with one offline-first app that never asks you to pay, never gets discontinued, and never loses four years of academic history. It is not a generic student app; it is *your* ERP, shaped exactly to ADIT's timetable structure, CVM's 75% attendance rule, and your CGPA formula.

## 2. Problems Solved

- Mental math for "can I skip this class" — replaced by a live number.
- Notes scattered across WhatsApp/notebook/phone gallery — one searchable place.
- Forgetting a room/teacher change announced verbally in class — becomes an editable fact the app remembers.
- Deadline panic — tasks and exams surface themselves before you have to remember them.
- Losing semester 1 data by the time you reach semester 8 — nothing is ever deleted, only archived.

## 3. Persona

One persona: you, four years from now, half-asleep before a 9:05am lecture, needing the app to tell you in under 3 seconds: what's next, what's due, what's at risk.

## 4. Feature List

Already locked from planning: Timetable (weekly/daily, semester-swappable), Attendance (per-lecture, live %, safe-to-skip), Academic Calendar (holidays/exams driving attendance denominator), Notes (markdown, tagged, searchable), Tasks (subject-tagged, recurring, priority), Notifications (class reminders, attendance-risk, exam countdowns, weekly digest), CGPA/SGPA tracker, Exam Prep (syllabus checklist), Dashboard, Semester Archive, Import/Export (JSON both ways + manual), Analytics, Resources shelf, Focus timer, Quick Capture (incl. voice via Wispr Flow).

## 5. Missing Features (added this round)

Room directory, Teacher directory (with office hours, contact, subjects taught — useful when you need to ask for an attendance exception), Announcement feed (so "class moved" isn't just a notification you might miss — it's a persistent record), Conflict detection (two lectures same slot after a manual edit), Free-time finder (auto-surfaces gaps for study blocks), Missed-lecture recovery prompt (absence → auto-suggests "review notes for this slot"), Command-palette style global search, Undo/redo on attendance marks, Soft-delete everywhere (nothing hard-deletes, ever).

## 6. Every Possible Scenario (design must handle)

**Timetable:** weekly recurring pattern · semester change · multiple concurrent timetable versions (e.g. exam-week schedule overlays normal one without deleting it) · lab batch splits · teacher change mid-sem · room change · cancelled / extra / rescheduled / merged / split lecture · online/hybrid lecture · guest lecture / workshop / industrial visit replacing a slot · one-off single-day addition · permanent removal · exam-week special timings · time clash · holiday (planned or emergency) · half-day schedule · substitute teacher.

**Attendance:** present/absent/late/medical-leave/on-duty (5 states, not 2) · cancelled lecture auto-excluded · bulk mark (mark whole day) · undo · forgot-to-mark backfill · correction with audit trail · attendance freeze (lock past dates from edits after N days, toggleable) · import · subject discontinued mid-sem (freeze its %, don't delete history).

**Tasks:** assignment/lab/project/personal/placement/internship · recurring · subtasks · dependencies (task B blocked until task A done) · quick add · voice add.

**Notes:** markdown/image/voice/PDF/scanned+OCR/code snippet · daily journal separate from subject notes · pinned · cross-linked (note ↔ lecture date ↔ task) · version history on edit.

**Exams:** internal/external/practical/viva/quiz/project-review/presentation · postponement/reschedule without losing the original date as history.

**Calendar:** semester bounds, vacations, public holidays, fee deadlines, registration windows, result dates, placement drives — all sit on one calendar the attendance engine reads.

## 7. Edge Cases

- Two lectures accidentally overlapping after a manual edit → flagged, not silently allowed.
- A rescheduled lecture's new slot itself gets cancelled → linked-pair status resolves correctly, doesn't leave the original showing "moved" to a dead slot.
- Subject dropped mid-semester → historical attendance stays queryable, excluded from *current* live % only.
- You mark attendance for a future date by mistake → blocked at input level.
- JSON import contains a subject code that already exists with different faculty → merge conflict prompt, not silent overwrite.
- Backend is down (VM restart, ISP outage) → app functions fully offline via IndexedDB; sync resumes automatically on reconnect, last-write-wins with a visible "synced 3 hours ago" indicator so you're never unknowingly stale.
- Four years of data on one device → semester archive keeps active dataset small; only current + previous semester load by default, older ones load on demand.

## 8. User Flows (core three)

1. **Morning:** open app → Dashboard → next class + countdown + today's attendance-risk flags + tasks due today. Under 3 seconds to useful info.
2. **After a lecture:** notification fires 20 min before → after class ends, quick-capture prompt (optional, dismissible) → mark attendance for that slot, one tap.
3. **Before an exam:** Exam Prep view → syllabus checklist + linked "exam-important" tagged notes + countdown → Revision Planner suggests blocks from Free-Time Finder.

## 9. Information Architecture

```
Dashboard (home)
├── Timetable        → Weekly / Daily / Calendar view
├── Attendance        → Per-subject detail, history heatmap
├── Notes             → All notes, by subject, by tag
├── Tasks             → Today / Upcoming / All / Recurring
├── Exams             → Upcoming, countdowns, syllabus checklist
├── Resources         → Per-subject shelf
├── Analytics          → Attendance / Task / Academic / Study tabs
├── Directory          → Teachers, Rooms
├── Archive            → Past semesters (read-mostly)
└── Settings           → Notifications, backup, semester config, theme
```

## 10. Screen-by-Screen Breakdown

- **Dashboard:** next-class card, today's slots strip, attendance risk banner (only shows if a subject is at risk — otherwise stays quiet), tasks-due-today list, quick-capture FAB.
- **Timetable Weekly:** grid identical in spirit to your uploaded ADIT sheet, color-coded by subject, tap a slot → detail sheet (room, faculty, status, mark attendance inline).
- **Attendance Detail (per subject):** big % number, safe-to-skip count, calendar heatmap, faculty history log.
- **Notes:** subject folders, global search bar always visible, markdown editor with tag chips.
- **Analytics:** tabbed — Attendance / Tasks / Academics / Study — each a scroll of charts, no forced dashboard clutter.

## 11. Navigation

Bottom nav (mobile PWA): Dashboard · Timetable · Notes · Tasks · More (Analytics/Directory/Archive/Settings tucked here — 4-year app shouldn't cram 10 icons into a thumb-reach bar).

## 12. Dashboard Design

Answers, in order of visual priority: *What's next → What's at risk → What's due → What's free.* Attendance warnings only render when something is actually below threshold — an always-green dashboard that never shows a warning is more trustworthy than one with permanent yellow noise.

## 13. Timetable Design

One data model, two render modes (weekly pattern, daily instance). Exam-week overlay is a *second active pattern*, not a manual override of the normal one — so reverting after exam week is automatic, not manual cleanup.

## 14. Attendance System

5-state marking (Present/Absent/Late/Medical/On-Duty). Denominator excludes Cancelled automatically. Formula: `attended / (scheduled − cancelled)`, weighted per subject's actual weekly frequency from your ADIT timetable. Safe-to-skip = solves for max future absences keeping % ≥ 75.

## 15. Task System

Flat list + subject tag + optional subtask array + optional `dependsOn` field. Recurring tasks generate their next instance on completion, not all pre-created (avoids clutter four years deep).

## 16. Notes System

Markdown-first. Every note optionally links to: a subject, a lecture-date, a tag set. OCR/scanned notes stored as attachment + extracted text layer for search (Phase 5+, needs an OCR library — Tesseract.js client-side, still free).

## 17. Resources System

Per-subject shelf: file upload (stored on your Oracle VM or Drive link) or external link (Drive/GitHub/YouTube). Same storage backend as Notes attachments — one file-handling system, not two.

## 18. Academic Calendar

Single source of truth for holidays/exam windows/semester bounds. Attendance engine reads it to auto-exclude non-teaching days — this is what makes the 75% math accurate without you manually flagging every holiday.

## 19. Exam Module

Exam entry (subject, type, date, syllabus scope) → auto-generates countdown notifications at 7-day/1-day/morning-of → syllabus checklist checkbox list → links notes tagged for that subject.

## 20. Notification Engine

Backend cron (checks every minute) reads `NotificationRule` table against live data, fires Web Push via VAPID through your Express server. Rule types: time-before-lecture, time-before-exam (multi-trigger), threshold-crossed (attendance risk), time-before-due (tasks), fixed-daily (morning brief, weekly digest). All rules are data rows — new trigger types don't need new code paths, just new rule configs.

## 21. Analytics System

**Attendance:** trend line per subject · heatmap by weekday · cancellation frequency per subject · faculty-linked cancellation stats.
**Tasks:** completion rate · delayed-task count · avg completion time · productivity heatmap.
**Academic:** SGPA/CGPA trend across archived semesters · credits completed vs total program requirement · target-CGPA calculator (what SGPA do I need this sem).
**Study:** notes-created vs exam-proximity · focus-timer session log · resource-open frequency.

## 22. AI Features (future roadmap, not Phase 1–6)

Smart timetable OCR-parser (photo of a new sem's sheet → structured JSON, skips manual re-entry each semester) · natural-language dashboard query ("what should I study today") · exam-readiness score (syllabus checklist % + notes coverage + days remaining) · auto-generated revision schedule from Free-Time Finder + syllabus gaps. Deliberately deferred: the database schema below is normalized specifically so these can be added later without a rewrite (e.g. `NotificationRule` and `AnalyticsEvent` tables are AI-ready log formats already).

## 23. Database Architecture

Core entities (Postgres, mirrored in IndexedDB for offline):

```
Semester(id, label, startDate, endDate, isActive)
Subject(id, semesterId, code, name, credits, type, weeklyFreq, color,
        currentFacultyId, facultyHistory[])
Teacher(id, name, email, phone, cabin, officeHours)
Room(id, name, building)
LectureSlot(id, subjectId, date, startTime, endTime, roomId,
            status[scheduled|cancelled|rescheduled|extra],
            linkedSlotId, isDeleted)
AttendanceRecord(id, lectureSlotId, status[present|absent|late|medical|onduty],
                  markedAt, editHistory[])
CalendarEvent(id, semesterId, date, type[holiday|exam|deadline|event], label)
Note(id, subjectId?, lectureSlotId?, title, bodyMarkdown, tags[], attachments[],
     versionHistory[], createdAt, updatedAt, isDeleted)
Task(id, subjectId?, title, dueAt, priority, status, recurrenceRule?,
     dependsOnTaskId?, subtasks[])
Exam(id, subjectId, type, date, syllabusChecklist[], isDeleted)
Resource(id, subjectId, title, type, url|fileRef)
NotificationRule(id, type, targetEntityId?, offsetMinutes?, threshold?, isActive)
AnalyticsEvent(id, type, entityId, timestamp, meta) -- append-only log
```

**Principles:** every table has `isDeleted` (soft delete, never hard) · history stored as JSON arrays on the parent row where it's cheap (faculty history, edit history) rather than separate audit tables — simpler for a 1-user app · `AnalyticsEvent` is an append-only log specifically so future AI features can query behavior history without touching core tables.

## 24. API Design

REST over Express, one resource per entity above (`/api/subjects`, `/api/lecture-slots`, `/api/attendance`, etc.), plus:
- `POST /api/import` — JSON bulk import with conflict report response
- `GET /api/export` — full JSON dump, on-demand
- `GET /api/dashboard` — pre-aggregated single-call payload for the home screen (avoids N+1 calls on every app open)
- `POST /api/sync` — batched IndexedDB↔Postgres reconciliation, last-write-wins with timestamp comparison

## 25. Settings

Theme/dark mode · per-rule notification timing overrides · attendance target % (default 75, editable if a subject has a different requirement) · semester management (create/archive/activate) · backup schedule (auto-export JSON weekly to your own storage) · keyboard shortcuts (desktop use).

## 26. Import / Export

Manual entry and JSON import write to the *same* tables — no special-casing. Import runs a conflict-detection pass (duplicate subject code with different faculty, overlapping lecture slots) and shows a merge-resolution screen rather than silently overwriting. Export is a full JSON dump, your real backup independent of the server.

## 27. Search

Global command-palette (Cmd/Ctrl+K style even on mobile via a search FAB): searches notes, subjects, teachers, rooms, exams, resources in one box, ranked by recency + relevance.

## 28. Future Roadmap

Phase 7+ (post-MVP, only after 6 phases below are stable): OCR timetable import, AI dashboard queries, exam-readiness scoring, auto-revision scheduling, teacher directory + announcement feed, conflict/free-time detection UI.

## 29. Phase-wise Development Plan

1. **Core (local only):** Timetable render from your ADIT PDF → JSON, per-lecture attendance marking, % + safe-to-skip calculator, Dashboard. Usable day one.
2. **Persistence:** IndexedDB wired properly — survives refresh/reinstall.
3. **Backend + Sync:** Express + Neon, simple PIN auth, IndexedDB↔Postgres sync.
4. **Notifications:** Web Push, class reminders + attendance-risk + exam countdowns.
5. **Notes + Tasks:** markdown notes, tagged tasks, Wispr Flow voice quick-capture.
6. **PWA Polish + Analytics v1:** manifest/install/offline fallback, first analytics tab (attendance trends).
7. **(Later)** Calendar overlay, teacher/room directory, conflict detection, resources shelf, revision planner, AI features.

## 30. Things Students Don't Realize They Need Until They Have Them

A quiet dashboard (no warning banner unless something's actually wrong) · faculty-change history (explains attendance-pattern shifts months later) · soft-delete everywhere (you will fat-finger a delete in year 2 and want year-1 data back) · export button that works even when your server's down.

## 31. Things Existing Student Apps Get Wrong

Binary present/absent (misses late/medical/on-duty nuance your college actually recognizes) · treating cancelled lectures as absences in the denominator · forcing you to re-enter your entire timetable from scratch every semester instead of versioned templates · notification systems tied to a third-party service that shuts down (you're avoiding this by owning the Push pipeline).

## 32. Final Review Passes

**Review 1 — missing scenarios found & fixed:** added 5-state attendance (was binary), added subject-discontinued handling, added exam-week timetable overlay as separate pattern rather than override, added notification-rule-as-data-row design so new trigger types don't need code changes.

**Review 2 — UX problems found & fixed:** dashboard warning-fatigue avoided (silent when healthy), bottom-nav overcrowding avoided (secondary modules under "More"), quick-capture made dismissible not forced.

**Review 3 — scalability issues found & fixed:** `AnalyticsEvent` append-only log added specifically so AI features can be layered on later without schema changes; Semester Archive keeps active dataset small so year-4 performance matches year-1; Oracle Always Free VM chosen over any finite-credit host so nothing breaks when a trial expires mid-degree.

---

**Status:** Planning complete. Ready to begin Phase 1 (Timetable + Attendance + Dashboard, local-only) whenever you want to start building.
