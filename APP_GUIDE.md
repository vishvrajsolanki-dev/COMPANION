# Student Academic OS — Complete Feature Guide

> **Version:** 0.1.0 · Phase 1.5  
> **Last updated:** 2026-08-08  
> **Source of truth:** Every claim below is backed by the source code of this repository. Stubs, incomplete features, and deferred items are explicitly marked.  
> **Architecture in one line:** React 18 + Vite + TypeScript offline-first PWA (Dexie/IndexedDB), Supabase PostgreSQL via SECURITY DEFINER RPCs, deployed on Cloudflare Pages.

---

## Table of Contents

1. [Activation Gate](#1-activation-gate)
2. [Student Onboarding (First-Time)](#2-student-onboarding-first-time)
3. [Global Shell & Foundations](#3-global-shell--foundations)
4. [Home Dashboard (QuietDashboard)](#4-home-dashboard-quietdashboard)
5. [Weekly Timetable (WeeklyGrid)](#5-weekly-timetable-weeklygrid)
6. [Tasks (TasksView)](#6-tasks-tasksview)
7. [Profile (ProfileView)](#7-profile-profileview)
8. [Attendance Center (AttendanceView)](#8-attendance-center-attendanceview)
9. [Study Notes (NotesView)](#9-study-notes-notesview)
10. [Exams & Quizzes (ExamsView)](#10-exams--quizzes-examsview)
11. [Performance Analytics (AnalyticsView)](#11-performance-analytics-analyticsview)
12. [Semesters & Dates (SemesterSetupView)](#12-semesters--dates-semestersetupview)
13. [Manage Subjects (ManageSubjectsView)](#13-manage-subjects-managesubjectsview)
14. [Build Timetable Pattern (TimetableBuilderView)](#14-build-timetable-pattern-timetablebuilderview)
15. [Import Timetable JSON (TimetableImportView)](#15-import-timetable-json-timetableimportview)
16. [Import Academic Calendar JSON (AcademicCalendarImportView)](#16-import-academic-calendar-json-academiccalendarimportview)
17. [Calendar Events (CalendarEventsView)](#17-calendar-events-calendareventsview)
18. [Faculty Directory (DirectoryView)](#18-faculty-directory-directoryview)
19. [Resources Shelf (ResourcesView)](#19-resources-shelf-resourcesview)
20. [Admin Portal (AdminPortalView)](#20-admin-portal-adminportalview)
21. [Design System — Style Guide (StyleGuideView)](#21-design-system--style-guide-styleguideview)
22. [Offline vs Online Dependencies](#22-offline-vs-online-dependencies)
23. [Demo Walkthrough — New Student, Full Semester Setup](#23-demo-walkthrough--new-student-full-semester-setup)
24. [Demo Walkthrough — Admin: Generate and Onboard a New User](#24-demo-walkthrough--admin-generate-and-onboard-a-new-user)

---

## 1. Activation Gate

**Source:** `src/features/auth/ActivationView.tsx`, `src/store/authStore.ts`, `src/lib/accessKeys.ts`

### What it does

A full-screen gate shown on first visit (and every subsequent visit until a valid access key is entered) that blocks access to the entire app. Each account supports multiple devices, bounded by a configurable `max_uses` session cap.

### Account-Based Multi-Device Activation

The activation model changed from "one key = one device" to **account-based sessions**:

- Each key maps to a **server-side account** (`accounts` table, UUID primary key).
- On activation, the RPC creates a `device_sessions` row keyed by `(account_id, device_id)`.
- Multiple devices can activate with the same key, up to `max_uses` concurrent sessions.
- Signing out removes the device session, freeing the slot for re-use.
- The account ID scopes the local IndexedDB database (`AcademicOSDB_<accountId>`), ensuring zero cross-account data leakage.

### How it appears

The gate renders **only** when both conditions are true:
1. **Supabase is configured** — the build contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables (checked via `supabaseConfigured` in `src/lib/supabase.ts`).
2. **No stored activation** — `localStorage` key `academic_os_activation` does not exist.

If Supabase is **not** configured (unconfigured dev or local builds), the gate is **completely inert** — the app opens directly to the dashboard.

### Features

| Feature | Detail |
|---|---|
| **Key input** | Monospace input, `XXXX-XXXX-XXXX-XXXX` placeholder. Auto-capitalize forced (`autoCapitalize="characters"`). Input is `.toUpperCase()`-ed on every keystroke. |
| **Submit button** | Disabled when input is empty or activation is in progress (`status === 'activating'`). Shows spinner "Activating…" while the RPC is in flight. |
| **Error messages** | Displayed inline below the input from a deterministic dict (`ACTIVATION_ERROR_MESSAGES` in `authStore.ts`). Error codes: `INVALID_KEY`, `INACTIVE_KEY`, `EXPIRED_KEY`, `KEY_EXHAUSTED`, `TOO_MANY_ATTEMPTS`, `NETWORK`, `SUPABASE_NOT_CONFIGURED`, `UNKNOWN`. The input clears the current error on any keystroke. |
| **Trust footer** | "Protected by access-key activation" and "Once activated, everything works offline — no account needed." |

### Activation RPC

The `activate_access_key(p_code, p_device_id, p_device_name)` server-side function:

1. Validates the key exists, is active, and has not expired.
2. Rate-limits brute-force attempts (15-minute lockout after `TOO_MANY_ATTEMPTS`).
3. Checks `device_sessions.count()` against `max_uses` — returns `KEY_EXHAUSTED` if over cap.
4. Creates an idempotent device session (`ON CONFLICT DO UPDATE`).
5. Returns `role`, `account_id`, `profile`, and `needs_onboarding`.

The client-side `mapRpcResult()` (unit-tested) normalizes the raw JSON into a typed `ActivationResult`.

### Post-Activation Stored State

The activation record persisted in `localStorage` under `academic_os_activation`:

```typescript
interface Activation {
  role: 'student' | 'admin' | 'owner';
  accountId: string;        // Server-assigned UUID — scopes the local DB
  profileId: string;
  codePreview: string;      // Masked, e.g. "XK7A…"
  activatedAt: string;      // ISO timestamp
  needsOnboarding?: boolean;// True for first-time student activation
  adminCode?: string;       // Raw key, ONLY for admin/owner roles
}
```

The activation is **never re-validated** — subsequent loads hydrate from localStorage, making the app work fully offline.

### Keyboard

No special keyboard shortcuts. Enter on the input submits the form.

### Network dependency

**Requires internet** on the first activation call (Supabase RPC). After activation, never needs the network again (until next sign-out).

---

## 2. Student Onboarding (First-Time)

**Source:** `src/features/auth/OnboardingView.tsx`, `src/lib/accessKeys.ts` (`saveStudentProfile`)

### What it does

A one-time form shown **only to students** after their first activation, before the main app. Captures identity fields and saves them to the server-side account record, so admins can identify who owns each key/session in the portal.

### When it appears

- The `activate_access_key` RPC returns `needs_onboarding: true` when a student key activates and the account has no `student_profile` yet.
- The flag is persisted in the activation record (`needsOnboarding: true`) so the form appears on page reload.
- Owners and admins **never** see this form.

### Form fields

| Field | Validation | Notes |
|---|---|---|
| Full name | ≥ 2 characters | `autoCapitalize="words"`, autoFocus |
| Department | ≥ 2 characters | `<datalist>` with ADIT department suggestions (8 options) |
| Enrollment number | ≥ 3 characters | `inputMode="numeric"`, monospace font |

### Submit flow

1. Calls `saveStudentProfile(accountId, name, department, enrollmentNumber)` — a bearer-token RPC (`p_account_id` only, raw key never sent).
2. On success: shows a green "Profile saved" card with 700ms delay, then enters the app.
3. On failure: error banner with retry guidance. The student can still proceed.
4. **"Skip for now"** link: clears `needsOnboarding` without saving. The student remains functional; the portal shows them as "Awaiting identity profile" until an admin fills it in.

### Trust footer

"Used only to identify your account — never shared"

---

## 3. Global Shell & Foundations

### Tab Bar

**Source:** `src/components/layout/TabBar.tsx`

Four bottom tabs, icon-only with labels below:

| Tab | Label | Icon |
|---|---|---|
| `home` | Home | `Home` |
| `schedule` | Schedule | `Calendar` |
| `tasks` | Tasks | `CheckSquare` |
| `profile` | Profile | `User` |

- Active state: icon and label color to `var(--color-primary)`.
- Tab bar **hides** when any subview is active (full-screen navigation).

### Navigation (Subview System)

**Source:** `src/store/uiStore.ts`, `src/app/App.tsx`

The app uses a zustand-driven single-page architecture. There is **no URL-based routing** — everything is in-memory state.

**State:** `activeTab: 'home' | 'schedule' | 'tasks' | 'profile'` and `activeSubview: SubviewType | null`.

14 subview types are registered:
`attendance`, `notes`, `analytics`, `exams`, `resources`, `directory`, `semester-setup`, `manage-subjects`, `timetable-builder`, `timetable-import`, `calendar-import`, `calendar-events`, `admin-portal`, `style-guide`.

Subviews render **full-screen** (tab bar is hidden). Each has a "Go back" arrow button (`closeSubview()`).

When navigating to a subview, you can pass data via `navigateToSubview(name, data)` (e.g. `subjectId`, `examId`, `noteId`).

### Code Splitting

All subview components are lazy-loaded via `React.lazy()` with `<Suspense>`. Each lazy chunk shows a spinner with "Loading {scope}…" while downloading.

### Error Boundaries

**Source:** `src/components/ErrorBoundary.tsx`

Every subview and the root app are wrapped in `React.ErrorBoundary`. On error: displays an error icon, scope name, error message, and "Try Again" button. Error message explicitly reassures: "Your local data is safe in IndexedDB."

### GlobalErrorCatcher

**Source:** `src/components/GlobalErrorCatcher.tsx`

Listens for `unhandledrejection` events. Filters to Dexie/database/storage errors only. Shows a toast. Does **not** spam toasts for non-database errors.

### Toast System

**Source:** `src/components/ui/Toast.tsx`

Context-based (`ToastProvider`). Three types: `success`, `error`, `info`. Auto-dismisses after **3.4 seconds**. `toast.show(message, type?)` is the public API.

### BottomSheet

**Source:** `src/components/ui/BottomSheet.tsx`

Shared modal with: Escape close, focus trap (Tab/Shift+Tab), auto-focus on first focusable element, return focus on close, body scroll lock, overlay click close, `aria-modal="true"`, default `maxWidth: 500px`.

### Theme System

**Source:** `src/store/uiStore.ts`

Two themes: `'light'` (default) and `'dark'`. Persisted in `localStorage` under `academic_os_theme`. Applied via `data-theme` attribute on `document.documentElement`. CSS tokens in `src/styles/global.css`.

### Per-Account IndexedDB

**Source:** `src/db/index.ts`

Each account gets its own Dexie database: `AcademicOSDB_<accountId>`. This ensures:

- **Zero cross-account data leakage** — different DB names = completely separate IndexedDB storage.
- Backup/restore, Clear All Data, and seeds all scope to the active account automatically.
- A module-level `Proxy` object (`db`) forwards all property/method accesses to the active account's database, so existing view code (`db.semesters.put(...)`) works without per-file changes.

**One-time legacy migration**: On first activation after upgrade, if the old `AcademicOSDB` (pre-account) database exists and has data, it is copied into the owner's account database. Students/admins start fresh — they never inherit the owner's legacy data. The legacy database is preserved as a safety net.

### Seed Database

**Source:** `src/db/seeds.ts`, `src/app/App.tsx`

On every app mount, `seedDatabaseIfEmpty()` is called. It:

1. Checks if the account database already has semesters — no-op if so.
2. For owner role: attempts one-time legacy migration first.
3. Otherwise: seeds the standard ADIT reference data:
   - 1 active semester (ADIT Sem 5, Odd 2026: 2026-07-06 → 2026-11-05)
   - 6 subjects with 8 locked colors
   - 5 teachers
   - 19 lecture slots for the week of Aug 4–9, 2026 (including 1 cancelled/rescheduled pair)
   - 4 attendance records
   - 5 tasks (1 completed, 4 pending)
   - 3 notes with markdown content
   - 3 exams (1 midsem, 1 quiz, 1 midsem — with syllabus checklists)
   - 8 resources across 6 subjects
   - ADIT calendar events (holidays, exam windows, semester boundaries, Diwali vacation, university exams)
4. If `localStorage.academic_os_user_cleared === 'true'`, seed is skipped entirely.

**Offline**: 100% offline — all data lives in IndexedDB.

---

## 4. Home Dashboard (QuietDashboard)

**Source:** `src/features/dashboard/QuietDashboard.tsx`

### How to access

Tap the **Home** tab (first tab) in the bottom tab bar.

### Features

- **Real-time clock**: 60-second tick interval.
- **Greeting**: Time-of-day + profile name ("Good morning, Alex").
- **Date Header**: "Wednesday, Aug 5".
- **Attendance Alert Banner**: Shown when any subject is below 75%.
- **Next Lecture Hero Card**: Next non-cancelled class today, with countdown badge.
- **Quick Access Grid**: 2×2 cards — Attendance, Study Notes, Exams & Quizzes, Performance.
- **Stat Tiles**: Classes Today, Active Tasks, Attendance %.
- **Attendance Ring**: SVG circle ring with animated fill, green/red by risk status.
- **Tasks Due Soon**: Top 3 active tasks sorted by due date.
- **Today's Schedule**: All slots for today, sorted by start time, with status badges.

### Network dependency

**Fully offline** — all data from IndexedDB, greeting from localStorage profile.

---

## 5. Weekly Timetable (WeeklyGrid)

**Source:** `src/features/timetable/WeeklyGrid.tsx`, `src/features/timetable/SlotDetailSheet.tsx`

### How to access

Tap the **Schedule** tab (second tab) in the bottom tab bar.

### Features

- **7-Day Selector Strip**: Mon–Sun buttons, default selection is Monday.
- **Slot Cards**: Subject color bar, code pill, time badge, name (strikethrough if cancelled), room, attendance status badge.
- **"+ Extra Class" button**: Opens Add Extra Class form (subject, date, times, room).
- **"Builder" button**: Navigates to `timetable-builder` subview.

### SlotDetailSheet (Quick Attendance Marking)

Opened by tapping any slot card. A `BottomSheet` with:

#### Attendance Marking (5-State)

Five buttons: Present, Absent, Late, Medical, On-Duty Leave. Current status highlighted with colored border/background.

- **Cancelled-slot guard**: When `slot.status === 'cancelled'`, a warning banner appears: *"This class was cancelled — attendance can't be marked for it."* The 5-state buttons are **hidden** and replaced with a text prompt to "Unmark Cancelled" if the class actually happened.
- Clicking a status button re-reads the freshest record from IndexedDB to prevent lost updates on rapid consecutive marks.

#### Slot Management Controls

- **"Faculty Cancelled"** button: Toggles `slot.status` between `'cancelled'` and `'scheduled'`.
- **"Reschedule"** button: Opens inline form (new date, start/end time, confirm). Time-order validation: end must be after start. Original slot is cancelled, new slot created with `status: 'rescheduled'` and `linked_slot_id`.
- **Delete** button: Soft-deletes the attendance record.

### Network dependency

**Fully offline** — all operations are IndexedDB writes.

---

## 6. Tasks (TasksView)

**Source:** `src/features/tasks/TasksView.tsx`

### How to access

Tap the **Tasks** tab (third tab) in the bottom tab bar.

### Features

- **Segment Control**: All, Today, Upcoming.
- **Task List**: Checkbox (toggle completion), priority badge, subject code, title, due date, delete button.
- **Task Detail Sheet**: Title, priority, due date, status, subject link. Actions: Mark In Progress, Complete, Delete.
- **Create Task Form**: Title (required), Subject (optional dropdown), Priority (Low/Medium/High/Urgent), Due Date (datetime-local), Subtasks (comma-separated), Notes.
- **Task Analytics button**: Stub — no onClick handler (no analytics view wired).

### Network dependency

**Fully offline**.

---

## 7. Profile (ProfileView)

**Source:** `src/features/profile/ProfileView.tsx`

### How to access

Tap the **Profile** tab (fourth tab) in the bottom tab bar.

### Features

#### Profile Header

Avatar: First character of `profile.name` in a circle. Name and semester subtitle.

#### Account Card (Activated Devices Only)

Only rendered when `authStatus === 'activated'`. Shows profile name, email/masked key preview, role badge. **Admin Portal** button (admin/owner roles only). **Sign out** button.

**Sign-out flow**: Calls `signOutSession(accountId, deviceId)` to remove the device session server-side, then clears `localStorage.academic_os_activation` and the profile store. This frees the device session slot so the key can be reused on another device.

#### Academic Management QuickLinks

| QuickLink | Target |
|---|---|
| Semesters & Dates | `semester-setup` |
| Manage Subjects | `manage-subjects` |
| Build Timetable Pattern | `timetable-builder` |
| Import Timetable JSON | `timetable-import` |
| Import Academic Calendar JSON | `calendar-import` |
| Calendar Events | `calendar-events` |

#### Directory & Shelf

Faculty Directory (`directory`), Resources Shelf (`resources`).

#### Preferences

Appearance toggle (light/dark), Design System (`style-guide`).

#### Semester Status Stats

Three stat tiles: Courses, Credits, Events.

#### Storage & Data

##### Backup Data (JSON Export)

Iterates every Dexie table, serializes to JSON, triggers download as `academic_os_backup_YYYY-MM-DD.json`. Fully offline.

##### Restore from JSON

Hidden file input accepting `.json`. Atomic Dexie transaction: clears all tables, bulk-adds backup rows, removes `academic_os_user_cleared` flag.

##### Clear All Data

Opens a confirmation BottomSheet with type-to-confirm ("DELETE").

**Clear flow (Part F #15 fix):**

1. **Step 0 — Server-side session cleanup**: Calls `signOutSession(accountId, deviceId)` before wiping local data. This prevents orphaned `device_sessions` rows when IndexedDB is wiped. Non-fatal on network failure.
2. **Step 1**: Auto-exports a JSON backup.
3. **Step 2**: Sets `localStorage.academic_os_user_cleared = 'true'` to prevent re-seeding.
4. **Step 3**: Clears all IndexedDB tables in an atomic transaction.
5. Navigates to `semester-setup` subview.

### Network dependency

**Fully offline** — backup/restore, clear, theme toggle, navigation are all local.

---

## 8. Attendance Center (AttendanceView)

**Source:** `src/features/attendance/AttendanceView.tsx`, `src/hooks/useAttendanceMath.ts`, `src/utils/attendanceMath.ts`

### How to access

From the Home Dashboard quick-access "Attendance" card.

### Features

- **Overall Attendance Ring**: Circular ring with percentage, green/red by risk status.
- **Subject Cards**: Attended/effective counts, percentage, "Recover +N" or "Skip N" badges.
- **Subject Detail Sheet**: Attendance heatmap (past 2 weeks), backfill dialog, audit change log.

### Attendance Math Engine

**Denominator rule**: Effective slots = non-cancelled slots that have attendance records. Attended = present + late + medical + onduty. Cancelled slots are strictly excluded from both numerator and denominator.

At risk = percentage < 75%. Safe to skip = `(4 × attended - 3 × effective) / 3`. Recovery needed = `3 × effective - 4 × attended`.

### Network dependency

**Fully offline**.

---

## 9. Study Notes (NotesView)

**Source:** `src/features/notes/NotesView.tsx`

### How to access

From the Home Dashboard quick-access "Study Notes" card.

### Features

- **Search**: Filters notes by title AND body content.
- **Tag Filter Chips**: Auto-extracted from all notes. AND-combined with search.
- **Note Editor**: Title (required), Subject dropdown, Tags input, Markdown textarea, Preview/Editor toggle.
- **Attachment Strip (STUB)**: "Offline attachment uploading will be implemented in a future update."

### Network dependency

**Fully offline**. The markdown display is a simple line-by-line parser — LaTeX, bold, italic, and links display as raw text.

---

## 10. Exams & Quizzes (ExamsView)

**Source:** `src/features/exams/ExamsView.tsx`

### How to access

From the Home Dashboard quick-access "Exams & Quizzes" card.

### Features

- **Segment Control**: Upcoming / Past.
- **Exam Cards**: Subject color bar, type badge, countdown (>24h / <48h / <24h / "Starting now").
- **Syllabus Checklist**: Atomic read-modify-write toggles, strikethrough on completion.
- **Add Exam Form**: Subject, Type (Mid-Sem/End-Sem/Quiz), Date/Time, Syllabus Topics.

### Network dependency

**Fully offline**.

---

## 11. Performance Analytics (AnalyticsView)

**Source:** `src/features/analytics/AnalyticsView.tsx`

### How to access

From the Home Dashboard quick-access "Performance" card.

### Features

#### Three Tabs: Attendance, Tasks, Study

##### Attendance Tab
- **Trend Line Chart**: **Visual stub** — static SVG, not computed from real data.
- **Weekday Absence Frequency**: Real computation — counts absences per weekday.
- **Faculty Cancellation Records**: Real computation — lists cancelled slots.

##### Tasks Tab (STUB)
- Static text: "Average completion speed: 18 hours before deadline" and "72% complete before deadline" — **hardcoded, not computed**.

##### Study Tab (STUB)
- Static text: "Study duration analytics will be available in a future update." **No study log feature exists.**

### Network dependency

**Fully offline** (though data is mostly static).

---

## 12. Semesters & Dates (SemesterSetupView)

**Source:** `src/features/semester/SemesterSetupView.tsx`

### How to access

From Profile → "Semesters & Dates" QuickLink.

### Features

- **Semester List**: Label, ACTIVE badge, date range, Activate/Edit/Delete buttons.
- **Add/Edit Form**: Label (required), Start Date, End Date (must be ≥ start).
- Active semester cannot be deleted.

### Network dependency

**Fully offline**.

---

## 13. Manage Subjects (ManageSubjectsView)

**Source:** `src/features/subjects/ManageSubjectsView.tsx`

### How to access

From Profile → "Manage Subjects" QuickLink.

### Features

#### Subject List

Each card shows color swatch, name, code, credits, Edit and Delete buttons.

**Duplicate subject prevention**: Before saving, the code checks IndexedDB for an existing active subject with the same normalized code. Shows an inline error if a duplicate is found — no silent overwrite.

#### Add/Edit Form

- **Code**: Text input, auto-uppercase. Required.
- **Name**: Text input. Required.
- **Credits**: Number input (1–6). Required.
- **Color palette**: 8 locked tokens (Violet, Pink, Blue, Teal, Amber, Green, Red, Slate). No free color picker.

#### Choose from College Template

A "Choose from college template" button (visible only when adding a new subject, not editing) opens a picker that queries the `reference_subjects` table in Supabase.

- Requires internet (anonymous SELECT on `reference_subjects`).
- Templates are grouped by department, searchable by code or name.
- Picking a template pre-fills code, name, credits, and auto-assigns the first unused color from the palette.
- Empty state: "Ask your admin to publish ADIT reference data from the Admin Portal → Data tab."

#### Delete Confirmation

Uses `ConfirmDialog` (not `alert()`): "Existing attendance and task records linked to this subject will be preserved, but the subject will no longer appear in pickers."

### Network dependency

- Subject management: **Fully offline**.
- Template picker: **Requires internet** (Supabase query for `reference_subjects`).

---

## 14. Build Timetable Pattern (TimetableBuilderView)

**Source:** `src/features/timetable/TimetableBuilderView.tsx`

### How to access

From Profile → "Build Timetable Pattern" QuickLink, or from the WeeklyGrid header "Builder" button.

### Features

- **Pattern Builder Form**: Subject, Day(s) of Week (multi-select chips), Start/End Time, Room.
- **Duplicate prevention**: Blocks adding patterns with same `subjectId + day + startTime + endTime`.
- **"Generate Across Semester"**: Creates dated slots for each pattern × day × week of the active semester. Idempotent by slot ID.
- **Time validation**: End time must be after start time.

### Network dependency

**Fully offline**.

---

## 15. Import Timetable JSON (TimetableImportView)

**Source:** `src/features/timetable/TimetableImportView.tsx`

### How to access

From Profile → "Import Timetable JSON" QuickLink.

### Features

#### Input Methods

1. **Paste JSON**: Textarea for raw JSON.
2. **Load Sample**: Button that loads a sample JSON (with subjects and patterns) into the textarea.
3. **Upload .json**: File picker.
4. **"Copy Conversion Prompt"**: Copies an AI prompt to clipboard for converting timetable images/text to valid JSON.

#### JSON Schema

Expected format:
```json
{
  "subjects": [{ "code": "2AI501", "name": "Machine Learning", "credits": 4, "faculty_name": "Prof. Kavita Patel" }],
  "patterns": [{ "subject_code": "2AI501", "day_of_week": 1, "start_time": "09:00", "end_time": "10:15", "room_id": "LH-301", "faculty_name": "Prof. Kavita Patel" }]
}
```

#### Faculty Name Auto-Matching

When patterns include `faculty_name` fields, the import automatically matches each distinct name against the `reference_faculty` table using `findBestFacultyMatch()`:

1. **Exact match** (case-insensitive) — highest priority.
2. **Substring match** — either direction.
3. **Token overlap** — checks if all words of the input appear in a faculty name, scored by match ratio (threshold ≥ 0.6).

When no match is found, the user-entered name is stored as-is, and the admin can assign a teacher later. When reference tables are unreachable, the import proceeds with raw names (graceful degradation).

#### Preview and Commit

- Shows new subjects count, projected slot count, unresolvable patterns warning.
- **Commit**: Creates missing subjects (auto-assigns colors), generates dated slots, deduplicates by slot ID.

### Network dependency

- JSON validation/paste: **Offline**.
- Faculty matching: **Requires internet** (queries `reference_faculty` via Supabase anon SELECT).

---

## 16. Import Academic Calendar JSON (AcademicCalendarImportView)

**Source:** `src/features/calendar/AcademicCalendarImportView.tsx`

### How to access

From Profile → "Import Academic Calendar JSON" QuickLink.

### Features

- **Paste JSON**: Expected format `{ semester_defaults: { label, start_date, end_date }, events: [...] }`.
- **Validation**: Checks required fields, valid event types (`holiday`, `exam_window`, `college_event`, `semester_boundary`).
- **Import Execution**: Creates/updates semester as active, adds events deduped by `date + title + type`.

### Network dependency

**Fully offline**.

---

## 17. Calendar Events (CalendarEventsView)

**Source:** `src/features/calendar/CalendarEventsView.tsx`, `src/data/aditCalendarDefaults.ts`

### How to access

From Profile → "Calendar Events" QuickLink.

### Features

- **ADIT Source Banner**: "Ships with ADIT Academic Calendar 2026-27 defaults."
- **Event List**: Color bar by type, title, formatted date, type badge, description, Edit/Delete.
- **"Reset to ADIT" Button**: Restores deleted/edited defaults.

### Default Events

| Title | Date | Type |
|---|---|---|
| Odd Semester Commencement (Sem 3/5/7) | 2026-07-06 | semester_boundary |
| Internal Exams Sem 3/5/7 | 2026-08-24 | exam_window |
| Rakshabandhan | 2026-08-28 | holiday |
| Gandhi Jayanti | 2026-10-02 | holiday |
| Dashera | 2026-10-20 | holiday |
| Sardar Patel Jayanti | 2026-10-31 | holiday |
| Christmas | 2026-12-25 | holiday |
| Practical Exam / Termwork (Sem 3/5/7) | 2026-11-02 | exam_window |
| Diwali Vacation | 2026-11-06 | college_event |
| University Exams (All Semesters) | 2026-11-23 | exam_window |

### Network dependency

**Fully offline**.

---

## 18. Faculty Directory (DirectoryView)

**Source:** `src/features/directory/DirectoryView.tsx`

### How to access

From Profile → "Faculty Directory" QuickLink.

### Features

**Read-only**: No add/edit/delete buttons. Shows teacher name, subject code badges, email (mailto:), phone (tel:), cabin, office hours.

### Network dependency

**Fully offline**. Email/phone links open the device's native apps.

---

## 19. Resources Shelf (ResourcesView)

**Source:** `src/features/resources/ResourcesView.tsx`

### How to access

From Profile → "Resources Shelf" QuickLink.

### Features

- **Subject Filter Pills**: "All" or one per subject.
- **Resource List**: Type icon (PDF/Drive/GitHub/URL/Other), title, description, external link, delete.
- **Add Resource Form**: Title, Subject, Type, URL, Description.

### Network dependency

**Data is offline**. Opening external links requires internet.

---

## 20. Admin Portal (AdminPortalView)

**Source:** `src/features/admin/AdminPortalView.tsx`, `src/lib/adminKeys.ts`, `src/lib/referenceData.ts`

### How to access

From Profile → Account Card → **"Admin Portal"** button. Only visible when `activation.role === 'admin' || 'owner'`.

### Authorization Guards

1. **Non-admin check**: If `activation.role` is not admin/owner → Shows "No admin access" EmptyState.
2. **No credential check**: If `getAdminCredential()` returns null → Shows "Sign out and re-activate" EmptyState (device activated before admin support shipped).
3. Both guards must pass for the portal to render.

### Tab Structure

**Owner** sees all 6 tabs: Generate, Keys, Activations, Sessions, Data, Audit.  
**Admin** sees 4 tabs: Generate, Keys, Activations, Sessions (Data and Audit are hidden).

---

#### Generate Tab

- **Role dropdown**: Owner can mint `student`, `admin`, or `owner`. Admin can only mint `student`.
- **Label** (recipient name): Optional text input.
- **Max Uses**: Number input (1–100). Default is **5** (bumped from 1 in migration 0007). Confirmation dialog if > 5 ("Each key is meant for one person — if you need to give access to multiple people, generate a separate key for each").
- **Expires** (optional): Date picker.
- **"Generate access key"** button: Calls `admin_generate_key` RPC.
- On success: Shows the new key code with a **Copy** button. Key is shown only once.

**How max_uses works**: The value is a soft concurrent-session cap. On each activation, the server checks `device_sessions.count()` against `max_uses`. When the count reaches `max_uses`, further activations return `KEY_EXHAUSTED` until a device signs out or the owner revokes a session via the Keys tab.

---

#### Keys Tab

List of all access keys. Each key shows:

- **Role badge** (color-coded: owner=accent, admin=success, student=neutral).
- **Label** (recipient name).
- **Masked code** with copy button (if not already masked).
- **Inline max_uses editor**: Displays `used {count}/{max}`. Clicking the row switches to an inline number input with ✓/✕ buttons. Enter confirms, Esc cancels. This calls `admin_update_key_limits` RPC (owner-only, clamped 1–100, `CANNOT_MODIFY_SELF` guard). The edit is logged in the audit trail.
- **Expiry date** (or "no expiry").
- **Deactivate/Reactivate** button: Toggles `is_active` via `admin_set_key_active` RPC.

Empty state: "No keys yet — Generate the first access key on the Generate tab."

---

#### Activations Tab

List of all activation profiles (accounts that have redeemed keys).

Each shows:
- Initials avatar.
- Name and role badge.
- Key label and creation date.
- **Student profile** (if available): Shows `name · department · enrollment_number`. When the profile is missing: shows "Awaiting identity profile" in warning color.

Empty state: "No activations yet — When someone redeems a key, they'll show up here."

---

#### Sessions Tab

Lists active device sessions.

**Role scoping** (enforced server-side by `admin_list_sessions`):
- **Owner** sees sessions across **all** accounts.
- **Admin** sees sessions for **their own account only**.

Each session card shows:

- **Device name** (or "Unknown device" when the device sent no name).
- **Account role badge** and **account name** (or "Unnamed account").
- **Last seen** timestamp (date + time) from `last_seen`.
- **Device ID** (monospace) — the per-device identifier sent at activation.
- **Revoke** button (danger tone): calls `admin_revoke_session`, which deletes the `device_sessions` row and signs that device out. It frees a slot toward the key's `max_uses` cap.

A header line explains the scoping: owner sees "Active device sessions across all accounts," admin sees "Active device sessions for your account."

Empty state: "No active sessions — When a device activates with a key, its session will show up here."

---

#### Data Tab (Owner-Only)

Manages ADIT institutional reference data in Supabase.

**Reference data summary card**: Shows faculty count, subject count, and department list (fetched from `admin_list_reference_data` RPC).

**Scraper output JSON section**:
- Textarea for pasting JSON produced by `node scripts/scrape-adit.mjs` (or manually edited).
- **"Load Sample JSON"** button: Pre-fills with a sample matching the scraper's output shape.
- **Upload .json** button: File picker.
- **"Validate Reference JSON"** button: Parses the JSON, validates required fields (`name`, `department` for faculty; `name`, `course_code`, `department`, `semester` for subjects).
- **"Publish to Supabase"** button: Calls `admin_upsert_reference_data` RPC. Existing entries are updated by `(department, name)` and `(department, semester, course_code)`; new ones are added. Shows inserted/updated counts.

---

#### Audit Tab (Owner-Only)

The `admin_actions` audit trail — logs of who did what to which key.

Each entry shows:
- Actor role badge.
- Action label (Generated / Deactivated / Reactivated / update_key_limits).
- Target code (masked).
- Date.

Data source: `admin_list_actions` RPC (owner-only gate enforced server-side).

Empty state: "No actions yet — Key generations and deactivations will be logged here."

---

### RPC Functions

| RPC | What it does | Auth | Notes |
|---|---|---|---|
| `admin_generate_key` | Mints a new access key + account | `p_admin_code` | Default `max_uses` = 5 |
| `admin_list_keys` | Lists all keys (masked codes) | `p_admin_code` | |
| `admin_set_key_active` | Deactivates/reactivates a key | `p_admin_code` | `CANNOT_MODIFY_SELF` |
| `admin_update_key_limits` | Adjusts `max_uses` on a key | `p_admin_code` | Owner-only, 1–100 clamp |
| `admin_list_profiles` | Lists all activation profiles | `p_admin_code` | |
| `admin_list_actions` | Lists audit trail | `p_admin_code` | Owner-only |
| `admin_list_sessions` | Lists active device sessions | `p_admin_code` | Owner sees all; admin sees own account |
| `admin_revoke_session` | Revokes a device session | `p_admin_code` | Signs that device out server-side |
| `admin_upsert_reference_data` | Bulk upserts faculty/subjects | `p_admin_code` | Owner-only |
| `admin_list_reference_data` | Returns summary counts | `p_admin_code` | Any admin (Data tab is owner-only in UI) |

### Error Messages

| Error Code | Message |
|---|---|
| `UNAUTHORIZED` | "Your key doesn't have admin access." |
| `GENERATION_CONFLICT` | "Code collision — try again." |
| `CANNOT_MODIFY_SELF` | "You can't deactivate your own key." |
| `NOT_FOUND` | "That key no longer exists." |
| `NETWORK` | "Couldn't reach the server. Check your connection and try again." |
| `UNKNOWN` | "Something went wrong. Please try again." |

### Network dependency

**Requires internet** for every RPC call (generate, list, toggle, profiles, audit, reference data). The portal does not work offline.

---

## 21. Design System — Style Guide (StyleGuideView)

**Source:** `src/features/design/StyleGuideView.tsx`

### How to access

From Profile → "Design System (Academic Core)" QuickLink.

### Features

- **Color Ramps**: Four 10-step ramps (Primary, Secondary, Tertiary, Neutral).
- **Typography**: Inter font — Headline (700/2rem), Body (500/0.95rem), Label (600/0.72rem uppercase).
- **Buttons**: 2×2 grid (Primary, Secondary, Inverted, Outlined).
- **Nav & Icon Buttons**: Circular buttons with various styles.
- **Action Buttons, Divider/Rule Tokens, Search Input**.

### Network dependency

**Fully offline**. Google Fonts (Inter) loaded from CDN on first visit — falls back to system sans-serif.

---

## 22. Offline vs Online Dependencies

| Feature | Offline | Requires Internet |
|---|---|---|
| Dashboard, Timetable, Tasks, Notes, Exams, Attendance, Analytics | ✅ | ❌ |
| Profile, Theme Toggle, Backup/Restore, Clear Data | ✅ | ❌ |
| Semester Setup, Subject Management, Timetable Builder | ✅ | ❌ |
| Timetable JSON Import (validation, paste) | ✅ | ❌ |
| Calendar Import, Calendar Events | ✅ | ❌ |
| Faculty Directory, Resources Shelf | ✅ | ❌ |
| Seed data loading | ✅ | ❌ |
| Subject template picker ("Choose from college template") | ❌ | ✅ |
| Timetable Import faculty name matching | ❌ | ✅ |
| Access-key activation (first use) | ❌ | ✅ |
| Sign-out (server-side session cleanup) | ❌ (best-effort, non-fatal) | ✅ |
| Clear All Data (server-side session cleanup) | ❌ (best-effort, non-fatal) | ✅ |
| Admin Portal (all RPCs) | ❌ | ✅ |
| Google Fonts (Inter) | ❌ (graceful fallback) | ✅ (optional) |
| External resource links (clicking) | ❌ | ✅ |
| PWA service worker cache | ✅ (after first visit) | ✅ (first visit) |

---

## 23. Demo Walkthrough — New Student, Full Semester Setup

> **Scenario**: A first-time student at ADIT, Semester 5 (Odd 2026), has just received an access key from their class owner.

### Step 1: First Launch

1. Open the app in a browser.
2. The **activation gate** appears.
3. Enter the access key: `XXXX-XXXX-XXXX-XXXX` (auto-capitals).
4. Tap **Activate**. The key is validated against Supabase over HTTPS.
5. The RPC creates a device session (if `max_uses` cap not reached) and returns the account ID.

### Step 2: Student Onboarding (One-Time)

Since this is the first activation of a student key:

1. The **OnboardingView** appears: "Welcome! Let's set up your student profile."
2. Enter: Full name, Department (from ADIT department suggestions), Enrollment number.
3. Tap **"Save & continue"**. The profile is saved to the server via `save_student_profile` RPC.
4. Or tap **"Skip for now"** — the student remains functional; the portal shows "Awaiting identity profile."

### Step 3: Main App Loads

- The account database (`AcademicOSDB_<accountId>`) is created and seeded with ADIT reference data.
- The dashboard loads with greeting, today's schedule, stat tiles, and attendance ring.

### Step 4: Explore the Dashboard

- **Home tab**: See greeting, date, next class hero card.
- **Schedule tab**: Tap Mon–Sun to see slots. Tap a slot card to mark attendance (5-state buttons).
- **Tasks tab**: Create a task with title, subject, priority, due date.

### Step 5: Customize Subjects

1. Go to **Profile** → **"Manage Subjects"**.
2. Tap **"+ Add Subject"**.
3. Tap **"Choose from college template"** to pick from ADIT reference data (requires internet).
4. Or manually enter code, name, credits, select a color. Save.

### Step 6: Build Timetable

1. Go to **Profile** → **"Build Timetable Pattern"**.
2. Select a subject, pick days, set times, add room.
3. Tap **"Add Pattern"**. Repeat for more patterns.
4. Tap **"Generate Across Semester"**.

### Step 7: Backup

1. Go to **Profile** → **"Backup Data"**.
2. A JSON file downloads: `academic_os_backup_YYYY-MM-DD.json`.

---

## 24. Demo Walkthrough — Admin: Generate and Onboard a New User

> **Scenario**: You are the class owner. A new classmate (Meet Patel) needs access.

### Step 1: Open Admin Portal

1. You must have an `owner` access key activated (or `admin` for student-only minting).
2. Go to **Profile** tab → **"Admin Portal"**.

### Step 2: Generate a Key for Meet

1. You're on the **Generate** tab.
2. Role: **Student**.
3. Label: **"Meet Patel"**.
4. Max Uses: **5** (default — covers phone + laptop + future devices). Adjust if needed.
5. Expires: Optionally set end-of-semester date.
6. Tap **"Generate access key"**.
7. The new key appears in an accent card. Tap **Copy** to share with Meet.

### Step 3: Verify the Key in the Keys Tab

1. Switch to the **Keys** tab.
2. See the key listed: role "student", label "Meet Patel", code (masked), used 0/5.
3. Click the **pencil icon** next to `used 0/5` to edit `max_uses` inline (owner-only).
4. Deactivate/Reactivate the key at any time.

### Step 4: Meet Activates Their Device

1. Meet opens the app, enters the access key, taps **Activate**.
2. Meet's device session is created server-side.
3. The onboarding form appears — Meet enters their name, department, enrollment number.

### Step 5: Meet Sets Up Their Semester

1. Meet goes to **Profile** → **"Semesters & Dates"** — default ADIT semester is already seeded.
2. **"Manage Subjects"** → Add or edit subjects, or use the "Choose from college template" picker.
3. **"Build Timetable Pattern"** or **"Import Timetable JSON"** (faculty names auto-match against reference data).

### Step 6: Monitor Activations (Owner Only)

1. In the Admin Portal, switch to the **Activations** tab.
2. See Meet listed: name, role, key label, student profile (name · department · enrollment).
3. Check the **Audit** tab for the full trail: "Generated" entry with timestamp.
4. Check the **Data** tab to see reference data counts (faculty, subjects, departments).

### Step 7: Revoke if Needed

1. In the **Sessions** tab, find the offending device session and tap **Revoke** — that device is signed out immediately and its slot freed toward the key's `max_uses` cap. (Owner sees all accounts; admin sees only their own account's sessions.)
2. In the **Keys** tab, find the key and tap **Deactivate** — the key can no longer be used for new activations.
3. Note: Deactivating a key does **not** sign out already-activated devices. To cut an active device off, revoke its session in the Sessions tab.

---

## Known Limitations / Deferred Items

| Item | Status | Notes |
|---|---|---|
| Cross-device data sync | **Deferred** | All academic data remains local per device. Phase D effort. |
| Study log / Study analytics | **No data model** | Analytics Study tab is a static stub. |
| Task Analytics | **Stub** | Button exists in TasksView header but has no onClick handler. |
| Notes attachment upload | **Deferred** | Stub alert: "Implemented in Phase 3 sync stack." |
| Dark mode token coverage | **Incomplete** | Theme toggle exists but not all components respond to `data-theme="dark"` consistently. |
| Offline-to-online conflict resolution | **Deferred** | Alongside sync. |
| Student enrollment validation | **Placeholder** | No server-side validation of enrollment number format. |

---

*End of APP_GUIDE.md*
