# Master Implementation Backlog & Work Breakdown Structure (WBS) — Student Academic OS

**Document ID:** `22_IMPLEMENTATION_BACKLOG`  
**Author:** Engineering Director  
**Status:** Approved / Execution Ready  
**Primary References:** [Student_OS_PRD.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md), [04_USER_FLOWS.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md), [06_SYSTEM_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md), [07_DATABASE_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md), [08_API_SPECIFICATION.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/08_API_SPECIFICATION.md), [09_FRONTEND_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md), [10_BACKEND_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/10_BACKEND_ARCHITECTURE.md)  
**Target Audience:** Engineering Leads, Frontend/Backend Engineers, QA Testers, AI Implementation Agents  

---

## Structure Taxonomy
`Epic` -> `Feature` -> `User Story` -> `Engineering Task`

---

## EPIC 1: Local Core Engine (Timetable, 5-State Attendance & Quiet Dashboard)
*Target Phase: Phase 1 (Local MVP)*

### Feature 1.1: Timetable Rendering & Weekly View
- **User Story 1.1.1:** As a student, I want to view my color-coded weekly timetable grid so I know my class schedule at a glance.
  - **Task TASK-101: Implement Weekly Timetable Grid Component**
    - **Description:** Build responsive 7-column timetable grid matching ADIT schedule layout.
    - **Business Value:** High (Core UI pillar).
    - **Dependencies:** None.
    - **Acceptance Criteria:** Color-coded by subject; displays room, faculty, and time slot; tapping slot opens detail sheet.
    - **Definition of Done:** Passes 360px mobile & 1920px desktop layout tests; zero hardcoded mock values.
    - **Testing Requirements:** Vitest layout test; WAI-ARIA grid role verification.
    - **Complexity:** Medium (3) | **Risk:** Low | **Priority:** P0 | **Order:** 1 | **Effort:** 6 hours.
    - **References:** [Student_OS_PRD.md §13](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#13-timetable-design), [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-02-timetable-engine-timetable).
    - **Entities:** `LectureSlot`, `Subject`, `Room`, `Teacher`.
    - **Modules:** `features/timetable/WeeklyGrid.tsx`.

### Feature 1.2: 5-State Attendance Engine
- **User Story 1.2.1:** As a student, I want to mark attendance as Present, Absent, Late, Medical, or On-Duty so that my percentage excludes cancelled lectures correctly.
  - **Task TASK-102: Implement 5-State Attendance Calculation Module (`calculateSafeToSkip`)**
    - **Description:** Implement exact formula: $\text{Attended} / (\text{Scheduled} - \text{Cancelled})$ and Safe-to-Skip count.
    - **Business Value:** Critical (Solves CVM 75% attendance rule).
    - **Dependencies:** TASK-101.
    - **Acceptance Criteria:** Returns exact percentage; excludes cancelled slots; flags error if date is in future.
    - **Definition of Done:** Unit test suite passes with 100% code coverage on edge cases.
    - **Testing Requirements:** Vitest unit test with 15 edge-case scenarios.
    - **Complexity:** High (5) | **Risk:** Medium | **Priority:** P0 | **Order:** 2 | **Effort:** 8 hours.
    - **References:** [Student_OS_PRD.md §14](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#14-attendance-system), [04_USER_FLOWS.md §Flow 02](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-02-single-slot-5-state-attendance-marking).
    - **Entities:** `AttendanceRecord`, `LectureSlot`, `Subject`.
    - **Modules:** `hooks/useAttendanceMath.ts`.

### Feature 1.3: Quiet Dashboard Layout
- **User Story 1.3.1:** As a student, I want a quiet dashboard that only shows warning banners when my attendance drops below 75%.
  - **Task TASK-103: Implement Dashboard View Component**
    - **Description:** Build Dashboard with Next Class Card, Slots Strip, Conditional Risk Banner, and Tasks Due.
    - **Business Value:** High (Primary home screen).
    - **Dependencies:** TASK-102.
    - **Acceptance Criteria:** Renders in <3 seconds; Risk Banner stays hidden when all subjects >= 75%.
    - **Definition of Done:** Meets quiet dashboard design principles; zero visual clutter when healthy.
    - **Complexity:** Medium (3) | **Risk:** Low | **Priority:** P0 | **Order:** 3 | **Effort:** 6 hours.
    - **References:** [Student_OS_PRD.md §12](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#12-dashboard-design), [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-01-dashboard---home-view).
    - **Modules:** `features/dashboard/DashboardView.tsx`.

---

## EPIC 2: Offline Persistence Layer (IndexedDB via Dexie.js)
*Target Phase: Phase 2*

### Feature 2.1: Dexie.js Client Database Integration
- **Task TASK-201: Define Dexie.js Schema & Migration Harness**
  - **Description:** Configure client-side IndexedDB tables (`semesters`, `subjects`, `lectureSlots`, `attendanceRecords`, `notes`, `tasks`, `syncConflictLogs`).
  - **Business Value:** Critical (Enables offline survival).
  - **Dependencies:** TASK-103.
  - **Acceptance Criteria:** All read/write operations execute locally; soft-delete filtering (`isDeleted = false`) enforced.
  - **Definition of Done:** Verified in airplane mode; data persists across browser restarts.
  - **Testing Requirements:** `fake-indexeddb` integration tests.
  - **Complexity:** Medium (3) | **Risk:** Medium | **Priority:** P0 | **Order:** 4 | **Effort:** 8 hours.
  - **References:** [07_DATABASE_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#4-database-optimization--indexing-strategy), [09_FRONTEND_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#4-state-management--reactive-data-layer).
  - **Modules:** `db/index.ts`.

---

## EPIC 3: Backend REST API & Tailscale Sync Engine
*Target Phase: Phase 3*

### Feature 3.1: Tailscale Mesh Isolation & Express Router
- **Task TASK-301: Configure Express API with Tailscale Middleware**
  - **Description:** Implement Tailscale IP check (`100.x.y.z`) and PIN token authentication middleware.
  - **Business Value:** Critical (Security boundary).
  - **Dependencies:** TASK-201.
  - **Acceptance Criteria:** Rejects non-Tailscale IPs with HTTP 403; verifies `X-Student-OS-PIN-Token`.
  - **Definition of Done:** Passed security automated scan; public port scan returns zero open ports.
  - **Complexity:** Medium (3) | **Risk:** High | **Priority:** P0 | **Order:** 5 | **Effort:** 6 hours.
  - **References:** [06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture), [10_BACKEND_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/10_BACKEND_ARCHITECTURE.md#5-security-middleware--tailscale-isolation).
  - **Backend Modules:** `middleware/tailscaleAuth.ts`.

### Feature 3.2: Batch Reconciliation & Conflict Queue Engine
- **Task TASK-302: Implement `POST /api/v1/sync/reconcile` Endpoint**
  - **Description:** Reconcile client mutation batches against Neon Postgres; flag 2-device attendance collisions in `SyncConflictLog`.
  - **Business Value:** Critical (Data integrity).
  - **Dependencies:** TASK-301.
  - **Acceptance Criteria:** Returns HTTP 200 on clean merge; returns HTTP 409 on version collision.
  - **Definition of Done:** 2-device collision test scenario verified in automated integration suite.
  - **Complexity:** High (5) | **Risk:** High | **Priority:** P0 | **Order:** 6 | **Effort:** 12 hours.
  - **References:** [08_API_SPECIFICATION.md §3.3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/08_API_SPECIFICATION.md#33-module-synchronization--conflict-resolution), [11_OFFLINE_AND_SYNC.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#3-conflict-detection--merge-strategies).
  - **Backend Modules:** `controllers/syncController.ts`, `services/syncService.ts`.

---

## EPIC 4: Web Push Notification & Scheduler Engine
*Target Phase: Phase 4*

### Feature 4.1: Minute-Precision Cron Engine & VAPID Dispatcher
- **Task TASK-401: Implement `node-cron` Notification Scheduler & Web Push Service**
  - **Description:** Evaluate `NotificationRule` every minute; dispatch encrypted VAPID Web Push alerts for class reminders (20 min pre-class) and attendance risks (<75%).
  - **Business Value:** High (Timely reminders).
  - **Dependencies:** TASK-302.
  - **Acceptance Criteria:** Respects Quiet Hours (11pm–7am); logs dispatched alerts; bypasses quiet hours for exam morning alerts.
  - **Definition of Done:** Dispatches push alert to browser SW; external UptimeRobot email failover verified.
  - **Complexity:** High (4) | **Risk:** Medium | **Priority:** P1 | **Order:** 7 | **Effort:** 10 hours.
  - **References:** [12_NOTIFICATION_SYSTEM.md §1, §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/12_NOTIFICATION_SYSTEM.md#1-system-architecture--notification-lifecycle).
  - **Backend Modules:** `engines/cronScheduler.ts`, `services/pushService.ts`.

---

## EPIC 5: Notes Engine, Tasks System & Voice Quick-Capture
*Target Phase: Phase 5*

### Feature 5.1: Markdown Notes & MiniSearch Index
- **Task TASK-501: Implement Markdown Notes Workspace & MiniSearch Client Index**
  - **Description:** Build Markdown note editor with tag chips, subject linking, and client-side MiniSearch indexing.
  - **Business Value:** High (Second brain note taking).
  - **Dependencies:** TASK-201.
  - **Acceptance Criteria:** Renders markdown preview; searches notes in <50ms via `Cmd+K`.
  - **Definition of Done:** Passed full-text search unit tests; handles local attachment references.
  - **Complexity:** Medium (3) | **Risk:** Low | **Priority:** P1 | **Order:** 8 | **Effort:** 8 hours.
  - **References:** [Student_OS_PRD.md §16](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#16-notes-system), [09_FRONTEND_ARCHITECTURE.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#2-directory-layout--feature-modularization).
  - **Frontend Modules:** `features/notes/NoteWorkspace.tsx`, `services/miniSearchService.ts`.

---

## EPIC 6: PWA Polish, Analytics v1 & Off-Site GitHub Backup
*Target Phase: Phase 6*

### Feature 6.1: Service Worker & Automated Off-Site Encrypted Backup
- **Task TASK-601: Implement Automated Nightly Encrypted GitHub Backup Script**
  - **Description:** Node script running at 03:00 AM UTC that dumps database state, encrypts with AES-256-GCM, and pushes to a private GitHub repository.
  - **Business Value:** Critical (Disaster recovery).
  - **Dependencies:** TASK-302.
  - **Acceptance Criteria:** Commits encrypted snapshot file to private GitHub repo; automated test verifies restore.
  - **Definition of Done:** Test backup created and restored successfully on clean test database.
  - **Complexity:** Medium (3) | **Risk:** Low | **Priority:** P0 | **Order:** 9 | **Effort:** 6 hours.
  - **References:** [06_SYSTEM_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#6-resilience--monitoring-strategy), [17_DEPLOYMENT.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/17_DEPLOYMENT.md#4-disaster-recovery--vm-migration-runbook).
  - **Backend Modules:** `services/backupService.ts`.

---

## EPIC 7: Advanced Directory, Calendar Overlays & Phase 7+ AI Layer
*Target Phase: Phase 7+ (Post-MVP)*

### Feature 7.1: Timetable Photo OCR Parser Setup Wizard
- **Task TASK-701: Implement OCR Timetable Photo Import Wizard**
  - **Description:** Client-side Tesseract.js image parser converting printed timetable photos into structured `LectureSlot` JSON data.
  - **Business Value:** Medium (Seamless semester onboarding).
  - **Dependencies:** TASK-501.
  - **Acceptance Criteria:** Parses photo grid; surfaces merge conflict resolution screen before committing to IndexedDB.
  - **Complexity:** High (5) | **Risk:** Medium | **Priority:** P2 | **Order:** 10 | **Effort:** 14 hours.
  - **References:** [14_AI_ARCHITECTURE.md §3.1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/14_AI_ARCHITECTURE.md#31-timetable-ocr-image-parser-pipeline).
