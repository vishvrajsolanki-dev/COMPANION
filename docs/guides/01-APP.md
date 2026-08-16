# Student Academic OS — Complete Application & Navigation Guide

> **Version:** 0.2.0 · Milestone 16 Hand-off  
> **Last updated:** 2026-08-16  
> **Source of Truth:** Aligned with `01-ACADEMIC-OS-STITCH-DESIGN.md` and codebase implementation.  
> **Architecture in one line:** React 18 + TypeScript offline-first PWA (Dexie/IndexedDB) + Supabase PostgreSQL SECURITY DEFINER RPCs + Canonical Stitch Design System.

---

## 1. Information Architecture & Navigation Structure

Academic OS implements a single-page hash-based routing system managed by `useHashLocation.ts` and `uiStore.ts`. Deep links and browser back/forward history traversal are fully supported without full page reloads.

### Top-Level Hubs

| Route Hash | Navigation Item | Description |
|---|---|---|
| `#today` | **Today** | Daily student dashboard — Next lecture countdown, attendance alert, quick check-in ring, tasks due soon. |
| `#plan/timetable` | **Plan** | Academic Planning Hub — Weekly timetable grid, calendar events, subject management, semester setup, timetable builder, JSON import. |
| `#study/tasks` | **Study** | Academic Execution Hub — Task manager, Markdown notes editor, exam countdowns, resources directory, study analytics. |
| `#account` | **Account** | Student Account Hub — Student profile, appearance/theme controls, backup/restore/wipe data, faculty directory, admin portal. |

### Secondary & Subview Hashes

- `#plan/timetable` — Weekly Timetable Grid
- `#plan/calendar` — Academic Calendar & Events
- `#plan/subjects` — Manage Subjects
- `#plan/semester` — Semesters & Dates Setup
- `#plan/builder` — Build Timetable Pattern
- `#plan/import` — Import Timetable JSON
- `#study/tasks` — Task Manager
- `#study/notes` — Markdown Study Notes & Live Editor
- `#study/exams` — Exams & Quizzes Countdown Manager
- `#study/resources` — Resources Directory
- `#study/analytics` — Performance Analytics & Attendance Trends
- `#account/appearance` — Appearance & Theme Controls
- `#account/data-sync` — Data & Storage Sync / Backup
- `#account/faculty` — Faculty Directory
- `#account/admin` — Admin Portal (Admin/Owner Role Gated)
- `#activation` — Unauthenticated Access-Key Activation Gate
- `#onboarding` — First-Time Student Identity Onboarding

---

## 2. Core User Flows & System Experience

### 2.1 Activation & Onboarding Flow
1. **Activation Gate (`#activation`)**: Full-screen gate enforcing key validation via `activate_access_key` RPC. Rates brute-force attempts and enforces multi-device `max_uses` caps.
2. **Student Onboarding (`#onboarding`)**: One-time form for new student keys capturing full name, ADIT department, and enrollment number.

### 2.2 Today View (`#today`)
- **Header**: Date eyebrow tag, greeting, time-of-day clock.
- **Hero Card**: Real-time next class countdown timer and quick location info.
- **Attendance Check-in**: SVG circular progress ring displaying overall attendance health with 1-tap quick check-in actions.
- **Tasks Due Soon**: Top 3 urgent tasks sorted by deadline.

### 2.3 Plan Hub (`#plan/*`)
- **Timetable**: Mon–Sun day filter tabs, 5-state attendance marking (Present, Absent, Late, Medical, On-Duty), faculty cancellation indicators.
- **Calendar**: Academic events list with default ADIT semester boundaries and exam windows.
- **Subjects**: Course manager with 8 locked color tokens, credit tracking, and college template picker.
- **Semester Setup**: Active semester date boundaries.
- **Timetable Builder & Import**: Automated semester slot generator and JSON file/text importer with intelligent fuzzy faculty matching.

### 2.4 Study Hub (`#study/*`)
- **Tasks**: Priority chips (Low, Medium, High, Urgent), status tabs (All, Due Today, Upcoming), inline creation sheet.
- **Notes**: Dual-pane Markdown editor with syntax-styled line rendering, search, and subject tag filters.
- **Exams**: Countdown manager with syllabus checklist, exam type badges (Mid-Sem, End-Sem, Quiz), and past exam history.
- **Resources**: Directory categorized by course with file/URL links.
- **Analytics**: Attendance trend line graphs, weekday absence frequency heatmaps, and cancellation records.

### 2.5 Account Hub (`#account/*`)
- **Profile**: Student avatar, department, enrollment, active key session details, sign-out.
- **Appearance**: Light / Dark mode toggle with instant theme switching.
- **Data & Sync**: Offline backup (JSON export), restore from file, and two-step clear data confirmation sheet.
- **Faculty Directory**: Searchable directory with email/phone links and office location details.
- **Administration**: Admin portal for key generation, session revocation, and institutional data publishing.

---

## 3. Global System States & Fallbacks

1. **Skeleton / Loading**: Hardware-accelerated `.skeleton` gradient shimmer. Under `prefers-reduced-motion: reduce`, renders clean static surface container low placeholders.
2. **Empty States**: Standardized `emptyState` components with 64px circular icon orb, title, subtext, and recovery action button.
3. **Error Boundaries & Recovery**: React error boundaries catching UI exceptions with branded error cards and "Return to Today" recovery buttons.
4. **Offline Indicators**: Header network status badge and offline banner highlighting IndexedDB offline availability.
5. **Toast Notifications**: Stacked polite live regions (`role="status"`, `aria-live="polite"`) auto-dismissing after 3.4 seconds.
6. **404 View**: `NotFoundView.tsx` rendering compass mark, 404 tag, requested hash code block, and primary navigation buttons.

---

## 4. Accessibility & Motion Safeguards

- **WCAG AA Keyboard Navigation**: Full tab order traversal, visible focus rings (`:focus-visible`), skip navigation link (`a[href="#main-content"]`), and landmark labels (`main`, `nav`, `aside`).
- **Dialog & Sheet Focus Trapping**: `BottomSheet` and `ConfirmDialog` manage focus trapping, Escape key dismissal, and focus restoration to the trigger element.
- **Reduced Motion**: Disables transitions and skeleton shimmer under `prefers-reduced-motion: reduce` while preserving complete state visibility.
