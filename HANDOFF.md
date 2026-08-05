# Master Technical Handoff Document — Student Academic OS

**Document ID:** `HANDOFF`  
**Author:** Principal Software Architect & Technical Leadership Board  
**Target Audience:** Engineering Team, AI Coding Agents, Human Maintainers  
**Date of Handoff:** August 4, 2026  
**Repository Status:** Planning & Design Complete | Architecture Frozen | Implementation Charter Approved | Prototype Exploration Completed

---

## 1. PROJECT OVERVIEW

### 1.1 Project Identity & Ownership
- **Application Name:** Student Academic OS
- **Owner & Creator:** Vishvraj Solanki | B.Tech AI & Data Science, ADIT (CVM University) | Batch 2025–2029
- **Scope:** Personal academic ERP, self-hosted, zero recurring operational cost, engineered to survive 4 years of continuous unattended daily use (2025–2029).
- **Target Platform:** iPhone 16 Pro primary (mobile PWA), Desktop secondary.

### 1.2 Core Mission & Value Proposition
Student Academic OS replaces four separate, fragmented mental tracking systems — attendance math, timetable memory, note scatter, and deadline anxiety — with a single offline-first progressive web application. It is custom-tailored specifically to:
1. **ADIT Timetable Structure:** 7-column weekly grid with lab batch splits, room numbers, and faculty assignments.
2. **CVM University Attendance Policy:** Strict 75% threshold evaluated via a 5-state attendance formula ($\text{Attended} / (\text{Scheduled} - \text{Cancelled})$).
3. **Academic Continuity:** 4-year historical retention where no record is ever hard-deleted, only archived.

### 1.3 Immutable Project Axioms
1. **The Three-Second Rule:** The app must surface "What's next, what's at risk, and what's due" in under 3 seconds from launch.
2. **The Quiet Dashboard Covenant:** The home screen remains visually quiet when healthy. Warning banners and risk indicators render **only when an attendance threshold is breached (<75%)**. An always-green UI stays silent.
3. **The Offline-First Contract:** The network is an asynchronous enhancement. All reads and writes execute locally in IndexedDB first ($<10\text{ms}$ rendering). The remote database is an event vault and multi-device sync target.
4. **Soft-Delete Everywhere:** No domain entity is ever destroyed using hard `DELETE` queries. All tables maintain `isDeleted: boolean` and `deletedAt: timestamp`.
5. **Zero-Cost Operation:** Built strictly within non-expiring free tiers (Oracle Cloud Always Free VM, Neon Serverless Postgres free tier, Cloudflare R2 object storage, GitHub Student Developer Pack).

---

## 2. TECH STACK & TOOLING

### 2.1 Frontend Architecture
- **Framework & Bundler:** React with Vite, configured as a Progressive Web Application (PWA).
- **Offline Client Database:** Dexie.js (IndexedDB wrapper with reactive `useLiveQuery` hooks).
- **Client Full-Text Search:** MiniSearch (in-memory fuzzy search engine indexing local IndexedDB tables).
- **Styling Architecture:** Vanilla CSS with custom properties & design tokens (`tokens.css`). Zero Tailwind CSS or heavy component libraries unless explicitly requested.
- **Iconography:** Lucide Icons (`lucide-react`).
- **State Management:** Dexie `useLiveQuery` for persistent domain state; Zustand for transient UI/session state (modal states, active tabs).
- **Validation Engine:** Zod runtime schema validation.
- **Testing Frameworks:** Vitest (unit & math calculation tests), Playwright (E2E & offline PWA airplane mode verification).

### 2.2 Backend Architecture & Infrastructure
- **Server Runtime:** Node.js + Express (TypeScript), executing as a `systemd` daemon on Oracle Cloud Always Free VM (ARM 4-Core / 24GB RAM).
- **Remote Database:** Neon Serverless Postgres (Primary cloud relational store).
- **Database Access Layer:** Kysely type-safe SQL query builder / Prisma connection pool.
- **Network Boundary & Security:** **Tailscale Private Mesh Network** (`100.x.y.z` CGNAT IP range). Zero public HTTP/S ports exposed to the open internet. Protected via `X-Student-OS-PIN-Token` header.
- **Background Scheduler:** In-process `node-cron` daemon executing at 1-minute precision.
- **Push Notifications:** Web Push Protocol (VAPID) via the `web-push` npm library.
- **Off-Site Automated Backup:** Nightly Node script executing at 03:00 AM UTC, dumping DB state, encrypting via AES-256-GCM, and pushing to a private GitHub repository.
- **External Monitoring & Failover:** UptimeRobot pinging `/api/v1/health` over Tailscale/webhook. Triggers an automated **Email Alert** if VM is down for $>15$ minutes.
- **Attachment Storage:** Oracle VM Filesystem or Cloudflare R2 Object Storage (10GB free tier). DB stores lightweight JSON references (`Note.attachments`).
- **Error Telemetry:** Sentry (GitHub Student Developer Pack entitlement).

---

## 3. ARCHITECTURE

### 3.1 Dual Primary Database Pattern
```
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│           CLIENT PRIMARY (Dexie.js)          │    │            CLOUD PRIMARY (Neon Postgres)     │
│ • Storage Engine: Browser IndexedDB          │    │ • Storage Engine: Serverless Postgres DB     │
│ • Primary Role: Instant read/write (<10ms)   │    │ • Primary Role: Multi-device sync & vault    │
│ • Key Generator: Client-side UUID v4         │<==>│ • Access Protocol: Pooled SSL over Tailscale │
│ • State Scope: Active + Recent Semesters     │    │ • State Scope: Complete 4-Year Record        │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

### 3.2 Security & Transport Layer (Tailscale Private Mesh)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TAILSCALE PRIVATE MESH NETWORK                         │
│                                                                                 │
│   [Android Phone PWA] <==== WireGuard Tunnel ====> [Oracle Cloud Always Free VM]  │
│   [Windows Laptop]   <==== WireGuard Tunnel ====> [Express API on 100.x.y.z:4000] │
│                                                                                 │
│   * UFW Firewall drops 100% of public incoming traffic on ports 80, 443, 4000.  │
│   * API requests require X-Student-OS-PIN-Token session header.                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Synchronization & Conflict Resolution Strategy
- **Batch Reconciliation Endpoint:** `POST /api/v1/sync/reconcile`.
- **Low-Stakes Entities (`Note`, `Task`):** Resolved using Last-Write-Wins (LWW) with UTC timestamp comparison.
- **High-Stakes Entities (`AttendanceRecord`, `LectureSlot` status):** Resolved via an explicit **Conflict Queue** (`SyncConflictLog`). When client and server versions collide, the server returns HTTP 409 Conflict, preserving both payloads, and triggers an interactive 2-card resolution drawer on the client UI.

### 3.4 Data Lifecycle & Semester Partitioning
- **Active Partitioning:** Queries filter by `Semester.is_active = true` by default. Active IndexedDB footprint is bounded to ~500 slots and ~100 notes.
- **Semester Archive:** Past semesters ($1$ to $N-1$) are marked `is_active = false` and stored in the local DB for read-mostly access in the Semester Archive module, keeping Year 4 performance identical to Year 1.

---

## 4. FEATURES

The application consists of **11 core modules**:

1. **Dashboard Module (`/`):**
   - Next Class Hero Card (countdown, room, faculty, quick mark).
   - Today's Slot Strip (horizontal timeline).
   - Attendance Risk Banner (renders **only** when subject attendance $<75\%$).
   - Tasks Due Today checklist.
   - Quick-Capture FAB (voice/note/task).
2. **Timetable Engine (`/timetable`):**
   - 7-Column Weekly Grid matching ADIT schedule.
   - Daily Chronological Stream (`/timetable/daily`).
   - Academic Calendar Overlay (`/timetable/calendar`).
   - Slot Detail Sheet (room, faculty, slot status, 5-state attendance marking, slot notes link).
   - Exam-Week Overlay pattern support.
3. **Attendance Center (`/attendance`):**
   - Subject % Cards with Safe-to-Skip count.
   - 5-State Marking: `Present`, `Absent`, `Late`, `Medical`, `On-Duty`.
   - Denominator auto-excludes `Cancelled` lectures.
   - Calendar Heatmap & Audit Log (`/attendance/audit`).
   - Forgot-to-mark Backfill workflow.
4. **Notes Engine (`/notes`):**
   - Markdown Workspace with live preview.
   - Tag Cloud (`#midsem`, `#lab`) and subject linking.
   - Local attachment viewer (PDFs, images, OCR text layer).
   - In-memory fuzzy search via MiniSearch (`Cmd+K`).
5. **Task Management (`/tasks`):**
   - Filter Tabs: `Today`, `Upcoming`, `All`, `Recurring`, `By Subject`.
   - Subtasks checklist & `dependsOnTaskId` dependency mapping.
   - Priority levels: `Low`, `Medium`, `High`, `Urgent`.
   - Recurring tasks generate next instance on completion.
6. **Exam Prep Module (`/exams`):**
   - Exam cards sorted by date with countdown timers.
   - Interactive Syllabus Checklist.
   - Linked notes tagged `#exam-important`.
   - Revision Planner integrating Free-Time Finder gaps.
7. **Resources Shelf (`/resources`):**
   - Per-subject digital shelf for course slides, lab manuals, Drive/GitHub links.
8. **Analytics Hub (`/analytics`):**
   - Attendance Tab: Subject trend lines, weekday heatmaps, faculty cancellation stats.
   - Tasks Tab: Completion rates, delay metrics, productivity heatmaps.
   - Academic Tab: SGPA/CGPA trend graphs across archived semesters, target SGPA solver.
   - Study Tab: Note creation frequency, focus timer session logs.
9. **Directory Module (`/directory`):**
   - Teacher Directory: Cabin room, office hours, email, phone, subjects taught.
   - Room Directory: Building map, room capacity, daily room schedule.
10. **Semester Archive (`/archive`):**
    - Read-only historical viewer for past semesters.
11. **Settings & Sync (`/settings`):**
    - Theme toggle, quiet hours configuration, Tailscale status, backup schedule, PIN token management, manual JSON import/export with merge conflict prompts.

---

## 5. DATA MODELS & SCHEMAS

### 5.1 Database Entity Dictionary

#### 1. `Semester`
- `id` (UUID PK)
- `label` (VARCHAR 50, e.g., "Semester 1 (Fall 2025)")
- `start_date` (DATE)
- `end_date` (DATE)
- `is_active` (BOOLEAN)
- `is_deleted` (BOOLEAN)

#### 2. `Subject`
- `id` (UUID PK)
- `semester_id` (UUID FK -> Semester)
- `code` (VARCHAR 20, e.g., "2AI01")
- `name` (VARCHAR 100, e.g., "Data Structures & Algorithms")
- `credits` (INT)
- `color` (VARCHAR 7, Hex code)
- `current_faculty_id` (UUID FK -> Teacher)
- `faculty_history` (JSONB Array: `[{ teacherId, startDate, endDate }]`)
- `is_deleted` (BOOLEAN)

#### 3. `Teacher`
- `id` (UUID PK)
- `name` (VARCHAR 100)
- `email` (VARCHAR 100)
- `phone` (VARCHAR 20)
- `cabin` (VARCHAR 50)
- `office_hours` (VARCHAR 100)
- `is_deleted` (BOOLEAN)

#### 4. `Room`
- `id` (UUID PK)
- `name` (VARCHAR 50)
- `building` (VARCHAR 50)
- `is_deleted` (BOOLEAN)

#### 5. `LectureSlot`
- `id` (UUID PK)
- `subject_id` (UUID FK -> Subject)
- `room_id` (UUID FK -> Room)
- `start_time` (TIMESTAMPTZ)
- `end_time` (TIMESTAMPTZ)
- `status` (VARCHAR 20: `'scheduled' | 'cancelled' | 'rescheduled' | 'extra'`)
- `linked_slot_id` (UUID FK -> LectureSlot, for rescheduled pairs)
- `is_deleted` (BOOLEAN)

#### 6. `AttendanceRecord`
- `id` (UUID PK)
- `lecture_slot_id` (UUID FK -> LectureSlot, unique per slot)
- `status` (VARCHAR 20: `'present' | 'absent' | 'late' | 'medical' | 'onduty'`)
- `marked_at` (TIMESTAMPTZ)
- `edit_history` (JSONB Array: `[{ prevStatus, newStatus, editedAt, reason }]`)
- `version` (INT)
- `is_deleted` (BOOLEAN)

#### 7. `CalendarEvent`
- `id` (UUID PK)
- `semester_id` (UUID FK -> Semester)
- `date` (DATE)
- `type` (VARCHAR 20: `'holiday' | 'exam' | 'deadline' | 'event'`)
- `label` (VARCHAR 100)
- `is_deleted` (BOOLEAN)

#### 8. `Note`
- `id` (UUID PK)
- `subject_id` (UUID FK -> Subject, optional)
- `lecture_slot_id` (UUID FK -> LectureSlot, optional)
- `title` (VARCHAR 200)
- `body_markdown` (TEXT)
- `tags` (JSONB Array of strings)
- `attachments` (JSONB Array: `[{ fileId, fileName, mimeType, storageUrl, sizeBytes }]`)
- `version_history` (JSONB Array)
- `is_deleted` (BOOLEAN)

#### 9. `Task`
- `id` (UUID PK)
- `subject_id` (UUID FK -> Subject, optional)
- `depends_on_task_id` (UUID FK -> Task, optional)
- `title` (VARCHAR 200)
- `due_at` (TIMESTAMPTZ)
- `priority` (VARCHAR 10: `'low' | 'medium' | 'high' | 'urgent'`)
- `status` (VARCHAR 20: `'todo' | 'in_progress' | 'completed'`)
- `recurrence_rule` (VARCHAR 50, optional)
- `subtasks` (JSONB Array: `[{ id, title, completed }]`)
- `is_deleted` (BOOLEAN)

#### 10. `Exam`
- `id` (UUID PK)
- `subject_id` (UUID FK -> Subject)
- `type` (VARCHAR 20: `'midsem' | 'endsem' | 'quiz' | 'viva' | 'practical'`)
- `date` (TIMESTAMPTZ)
- `syllabus_checklist` (JSONB Array: `[{ topicId, label, completed }]`)
- `is_deleted` (BOOLEAN)

#### 11. `Resource`
- `id` (UUID PK)
- `subject_id` (UUID FK -> Subject)
- `title` (VARCHAR 200)
- `type` (VARCHAR 20: `'pdf' | 'drive' | 'github' | 'url'`)
- `url_or_file_ref` (TEXT)
- `is_deleted` (BOOLEAN)

#### 12. `NotificationRule`
- `id` (UUID PK)
- `type` (VARCHAR 50: `'lecture_reminder' | 'attendance_risk' | 'exam_countdown' | 'task_due'`)
- `target_entity_id` (UUID, optional)
- `offset_minutes` (INT)
- `threshold` (FLOAT)
- `is_active` (BOOLEAN)

#### 13. `AnalyticsEvent` (Append-Only Log)
- `id` (UUID PK)
- `event_type` (VARCHAR 50)
- `entity_id` (UUID)
- `timestamp` (TIMESTAMPTZ)
- `meta` (JSONB)

#### 14. `SyncConflictLog`
- `id` (UUID PK)
- `entity_name` (VARCHAR 50)
- `record_id` (UUID)
- `client_payload` (JSONB)
- `server_payload` (JSONB)
- `resolution_status` (VARCHAR 20: `'pending' | 'resolved_client' | 'resolved_server'`)
- `created_at` (TIMESTAMPTZ)

### 5.2 Dexie.js Schema Declaration
```javascript
const db = new Dexie('StudentAcademicOSDB');
db.version(1).stores({
  semesters: 'id, is_active, is_deleted',
  subjects: 'id, semester_id, code, is_deleted',
  lectureSlots: 'id, subject_id, start_time, status, is_deleted',
  attendanceRecords: 'id, lecture_slot_id, status, is_deleted',
  notes: 'id, subject_id, title, *tags, is_deleted',
  tasks: 'id, subject_id, due_at, status, is_deleted',
  exams: 'id, subject_id, date, is_deleted',
  syncConflictLogs: 'id, record_id, resolution_status'
});
```

---

## 6. CODE PRODUCED

### 6.1 Complete Documentation Suite (`/docs/`)
Total documentation inventory: **42 primary specifications** compiled across `/docs/`:

- `docs/Student_OS_PRD.md`: Master Product Requirements Document.
- `docs/00_DOCUMENTATION_GUIDE.md`: Master index and documentation governance guide.
- `docs/00_PROJECT_OVERVIEW.md`: System mission, axioms, and architectural principles.
- `docs/01_PRD_REVIEW.md`: Executive PRD review, risk analysis, and gap mitigations.
- `docs/03_USER_PERSONAS.md`: User persona profile (Vishvraj, 4-year student journey).
- `docs/04_USER_FLOWS.md`: 15 step-by-step user interaction flows.
- `docs/05_INFORMATION_ARCHITECTURE.md`: Master IA, navigation tree, and screen breakdown.
- `docs/06_SYSTEM_ARCHITECTURE.md`: Complete system architecture spec and diagrams.
- `docs/07_DATABASE_ARCHITECTURE.md`: Dual primary DB design, ERDs, schema dictionaries.
- `docs/08_API_SPECIFICATION.md`: REST API endpoint specs, payload envelopes, header contracts.
- `docs/09_FRONTEND_ARCHITECTURE.md`: PWA layout, state layer, CSS token specifications.
- `docs/10_BACKEND_ARCHITECTURE.md`: Node/Express layered structure, middleware, cron daemons.
- `docs/11_OFFLINE_AND_SYNC.md`: Offline sync sequence, exponential backoff, conflict queues.
- `docs/12_NOTIFICATION_SYSTEM.md`: VAPID push lifecycle, quiet hours, email failover.
- `docs/13_ANALYTICS_SYSTEM.md`: Append-only telemetry log schema and analytics calculations.
- `docs/14_AI_ARCHITECTURE.md`: Deferred Phase 7+ AI roadmap, OCR parser pipeline, readiness solvers.
- `docs/15_SECURITY_ARCHITECTURE.md`: Tailscale network boundary, STRIDE threat matrix, secrets management.
- `docs/16_TESTING_STRATEGY.md`: Vitest unit tests, Playwright PWA tests, DoD coverage gates.
- `docs/17_DEPLOYMENT.md`: Systemd service config, Oracle VM setup, backup runbooks.
- `docs/18_ROADMAP.md`: 7-phase gantt timeline, SemVer release strategy.
- `docs/19_DECISION_LOG.md`: 10 Architecture Decision Records (ADR-001 through ADR-010).
- `docs/20_GLOSSARY.md`: Master academic and technical terminology dictionary.
- `docs/21_OPEN_QUESTIONS.md`: Unresolved questions matrix (Q-001 through Q-005).
- `docs/22_IMPLEMENTATION_BACKLOG.md`: Master WBS implementation backlog (Epics 1 to 7).
- `docs/23_PROJECT_GOVERNANCE.md`: Git branching, Conventional Commits, DoR/DoD rules.
- `docs/24_RISK_REGISTER.md`: 5 critical project risks and mitigation plans.
- `docs/25_READINESS_REPORT.md`: 100% readiness audit verification report.
- `docs/26_REPOSITORY_AUDIT.md`: Pre-implementation repository consistency audit.
- `docs/IMPLEMENTATION_CHARTER.md`: Supreme engineering constitution & AI execution guardrails.
- `docs/ARCHITECTURE_AUDIT.md`: Audit of Phase 2 architecture.
- `docs/DOCUMENTATION_AUDIT.md`: Audit of Phase 1 documentation.
- `docs/ENGINEERING_SYSTEMS_AUDIT.md`: Audit of Phase 3 engineering systems.
- `docs/FINAL_DOCUMENTATION_AUDIT.md`: Final repository sanity check.
- `docs/design/00_DESIGN_RESEARCH.md`: Product personality and emotional spectrum.
- `docs/design/01_COMPETITOR_ANALYSIS.md`: Teardowns of 17 world-class productivity apps.
- `docs/design/02_VISUAL_DIRECTIONS.md`: 10 distinct visual design directions explored.
- `docs/design/03_MOODBOARDS.md`: Visual inspiration mappings for each direction.
- `docs/design/04_INTERACTION_PHILOSOPHY.md`: Navigation ergonomics, motion timing, FAB rules.
- `docs/design/05_INFORMATION_HIERARCHY.md`: 3-second visual attention hierarchy across modules.
- `docs/design/06_DESIGN_COMPARISON_MATRIX.md`: Scoring matrix and Top 3 recommendations.
- `docs/design/07_VISUAL_EXPLORATION_REPORT.md`: Executive visual discovery report.
- `docs/ux/01_USER_JOURNEYS.md`: Comprehensive UX specifications for 12 core user journeys.

### 6.2 Interactive UI Prototypes (`/design-prototypes/`)
Inventory of **21 high-fidelity HTML/CSS interactive prototypes** created for visual exploration across 7 core modules:

1. `Dashboard/`:
   - `dashboard-v1.html` (7.4 KB) — Linear Technical exploration (Dark mode, compact telemetry cards, active status dots).
   - `dashboard-v2.html` (4.7 KB) — Apple Minimal exploration (Elevated cards, generous padding, iOS HIG tabs).
   - `dashboard-v3.html` (5.0 KB) — Premium Productivity exploration (Glassmorphic cards, glowing progress rings). *[Latest Selected Direction]*
2. `Attendance/`:
   - `attendance-v1.html` (6.0 KB) — High-density subject list.
   - `attendance-v2.html` (9.1 KB) — 5-State interactive marking modal & safe-to-skip calculator.
   - `attendance-v3.html` (9.3 KB) — Heatmap calendar, audit history log, backfill UI. *[Latest Version]*
3. `Timetable/`:
   - `timetable-v1.html` (6.9 KB) — 7-column ADIT schedule weekly grid.
   - `timetable-v2.html` (7.2 KB) — Daily stream view with room & faculty badges.
   - `timetable-v3.html` (6.5 KB) — Slot detail sheet with inline attendance marking. *[Latest Version]*
4. `Tasks/`:
   - `tasks-v1.html` (7.3 KB) — Flat task list with priority chips.
   - `tasks-v2.html` (5.6 KB) — Subtasks drawer & `dependsOnTaskId` selector.
   - `tasks-v3.html` (5.7 KB) — Subject-tagged task board & recurring task rule config. *[Latest Version]*
5. `Notes/`:
   - `notes-v1.html` (7.0 KB) — Subject folder tree & Markdown editor.
   - `notes-v2.html` (5.7 KB) — Tag cloud filter & MiniSearch search bar.
   - `notes-v3.html` (6.5 KB) — Note workspace with attachment drawer & OCR text layer. *[Latest Version]*
6. `Analytics/`:
   - `analytics-v1.html` (6.9 KB) — Attendance trend line charts.
   - `analytics-v2.html` (7.1 KB) — Task completion rates & productivity heatmap.
   - `analytics-v3.html` (9.0 KB) — Multi-tab Analytics Hub (Attendance, Tasks, Academic CGPA, Study). *[Latest Version]*
7. `Calendar/`:
   - `calendar-v1.html` (7.5 KB) — Monthly academic calendar grid.
   - `calendar-v2.html` (7.2 KB) — Exam countdown cards & holiday denominator exclusion.
   - `calendar-v3.html` (6.9 KB) — Exam prep syllabus checklist & revision planner overlay. *[Latest Version]*

---

## 7. APIs & INTEGRATIONS

### 7.1 Common Request Headers
```http
Content-Type: application/json
X-Student-OS-PIN-Token: <hashed_session_token>
X-Client-Id: phone-pwa-v1
X-Client-Timestamp: 2026-08-04T19:07:00.000Z
```

### 7.2 Standard Response Envelopes

#### Success Envelope (200 OK / 201 Created):
```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-08-04T19:07:00.000Z",
  "data": {}
}
```

#### Error Envelope (400 / 401 / 403 / 500):
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-08-04T19:07:00.000Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Start time must precede end time",
    "details": [{ "field": "endTime", "issue": "Must be greater than startTime" }]
  }
}
```

### 7.3 Core API Endpoints

1. `GET /api/v1/dashboard`
   - Pre-aggregated payload returning active semester info, next class hero card, attendance risk subjects ($<75\%$), and tasks due today.
2. `POST /api/v1/attendance/mark`
   - Body: `{ "lectureSlotId": "uuid", "status": "present|absent|late|medical|onduty", "markedAt": "ISO", "editReason": "string" }`.
   - Validates status and blocks future date marking.
3. `POST /api/v1/attendance/bulk-mark`
   - Body: `{ "date": "YYYY-MM-DD", "status": "present", "slotIds": ["uuid1", "uuid2"] }`.
4. `POST /api/v1/sync/reconcile`
   - Body: `{ "lastSyncedTimestamp": "ISO", "mutations": [...] }`.
   - Reconciles client mutation queue; returns HTTP 409 with `conflicts[]` payload on version collisions.
5. `POST /api/v1/sync/resolve-conflict`
   - Body: `{ "conflictLogId": "uuid", "chosenWinner": "client|server", "resolvedData": {...} }`.
6. `POST /api/v1/data/import`
   - Body: Raw JSON dump. Runs conflict detection pass and returns merge conflict warnings.
7. `GET /api/v1/data/export`
   - Returns full raw database JSON dump for off-site backup.
8. `GET /api/v1/health`
   - Heartbeat endpoint returning `{ "status": "UP", "database": "CONNECTED", "cron": "RUNNING" }`.

---

## 8. DECISIONS LOG

Catalog of **10 official Architecture Decision Records (ADRs)** from `19_DECISION_LOG.md`:

1. **ADR-001: Tailscale Private Mesh Isolation vs Public Endpoints**
   - *Status:* Accepted | *Confidence:* 95%
   - *Decision:* Isolate Express API within a private Tailscale network (`100.x.y.z`). Block all public HTTP/S ports. Eliminates public attack surface at $0 cost.
2. **ADR-002: Dual Primary Database Store (Dexie.js + Neon Postgres)**
   - *Status:* Accepted | *Confidence:* 98%
   - *Decision:* Client IndexedDB (Dexie.js) as primary local read/write store; remote Neon Postgres as asynchronous multi-device sync vault.
3. **ADR-003: 5-State Attendance Calculation Engine & Formula**
   - *Status:* Accepted | *Confidence:* 100%
   - *Decision:* Implement 5 states (`Present`, `Absent`, `Late`, `Medical`, `On-Duty`) and auto-exclude `Cancelled` slots from denominator: $\text{Percentage} = \frac{\text{Present} + \text{Late} + \text{Medical} + \text{OnDuty}}{\text{Scheduled} - \text{Cancelled}}$.
4. **ADR-004: Explicit Multi-Device Conflict Queue for Attendance**
   - *Status:* Accepted | *Confidence:* 95%
   - *Decision:* High-stakes entity collisions (`AttendanceRecord`) trigger `SyncConflictLog` entries and require user resolution on UI (HTTP 409).
5. **ADR-005: Soft-Delete Everywhere & Historical Immutability**
   - *Status:* Accepted | *Confidence:* 100%
   - *Decision:* All tables use `isDeleted: boolean` and `deletedAt: timestamp`. Zero hard `DELETE` SQL queries.
6. **ADR-006: Active Semester Partitioning for 4-Year Performance**
   - *Status:* Accepted | *Confidence:* 95%
   - *Decision:* Default client queries partition to `Semester.is_active = true`. Historical semesters read on demand in Archive module.
7. **ADR-007: Attachment Storage on VM Disk / R2 vs DB Blobs**
   - *Status:* Accepted | *Confidence:* 98%
   - *Decision:* Store PDF/image files on VM disk or Cloudflare R2 object storage. Postgres stores lightweight JSON metadata references only.
8. **ADR-008: In-Process node-cron with External Email Failover**
   - *Status:* Accepted | *Confidence:* 90%
   - *Decision:* In-process `node-cron` daemon handles Web Push notifications. External UptimeRobot ping monitor sends email alerts on VM outage (>15 mins).
9. **ADR-009: Pre-Normalized Event Store (`AnalyticsEvent`) for Deferred AI**
   - *Status:* Accepted | *Confidence:* 95%
   - *Decision:* Deploy append-only JSONB telemetry log from Day 1 to record user action patterns for future AI features without DB rewrites.
10. **ADR-010: Offline-First Client Architecture with Dexie `useLiveQuery`**
    - *Status:* Accepted | *Confidence:* 100%
    - *Decision:* React components subscribe directly to IndexedDB tables using Dexie's `useLiveQuery`. Local UI renders in $<10\text{ms}$; HTTP APIs execute asynchronously.

---

## 9. OPEN QUESTIONS / UNRESOLVED ITEMS

Log of **5 non-blocking engineering inquiries** from `21_OPEN_QUESTIONS.md`:

- **Q-001: Off-Site Backup Encryption Key Management Strategy**
  - *Description:* Passphrase vs 24-word recovery seed phrase for encrypted GitHub backups.
  - *Recommendation:* 24-word recovery seed phrase generated during setup.
  - *Priority:* LOW | *Status:* Non-blocking | *Owner:* Lead Architect.
- **Q-002: Phase 1 Single-Device MVP vs Multi-Device Sync Rollout**
  - *Description:* Single-device local MVP first, or early multi-device sync testing?
  - *Recommendation:* Strictly single-device local MVP for Phase 1.
  - *Priority:* MEDIUM | *Status:* Non-blocking | *Owner:* Vishvraj / Product Owner.
- **Q-003: Public Portfolio Showcase Architecture Export**
  - *Description:* Automated script to export sanitized docs for portfolio/LinkedIn?
  - *Recommendation:* Defer export script creation to Phase 6.
  - *Priority:* LOW | *Status:* Non-blocking | *Owner:* Vishvraj.
- **Q-004: Local Vector Embeddings Engine Choice for Phase 7+ AI**
  - *Description:* MiniSearch vs Orama vs Transformers.js + LanceDB WASM for local note embeddings?
  - *Recommendation:* Defer engine selection to Phase 7 research.
  - *Priority:* LOW | *Status:* Non-blocking | *Owner:* AI Systems Architect.
- **Q-005: Browser Storage Quota Pressure Warning Banner**
  - *Description:* How to alert user when IndexedDB storage approaches browser eviction limits?
  - *Recommendation:* Add `navigator.storage.estimate()` check inside Settings page in Phase 6.
  - *Priority:* MEDIUM | *Status:* Non-blocking | *Owner:* UX / Frontend Lead.

---

## 10. UNCERTAINTY / HALLUCINATION FLAGS

To guarantee absolute engineering accuracy for future developers and AI agents, the following repository facts are explicitly confirmed vs noted as unconfirmed:

### Verified Repository Facts:
- **Zero Production Source Code Exists:** The repository contains **only planning, architectural, governance documentation, and HTML design prototypes**. No React/TypeScript application codebase, `package.json`, SQL migrations, or Dockerfiles have been created yet. Implementation is frozen per `IMPLEMENTATION_CHARTER.md`.
- **21 Interactive Prototypes Exist:** Located inside `design-prototypes/` across 7 subdirectories (`Dashboard`, `Attendance`, `Timetable`, `Tasks`, `Notes`, `Analytics`, `Calendar`).
- **42 Documentation Files Exist:** Located inside `docs/`, `docs/design/`, and `docs/ux/`.

### Explicitly Flagged Items (Unknown / Deferred):
- **Tailscale IP (`100.64.0.1`):** A standard placeholder value used in docs. The actual Tailscale IP address will be assigned when the Oracle VM joins the user's tailnet in Phase 3.
- **Wispr Flow API Key / SDK Details:** Voice quick-capture integration details are deferred to Phase 5 implementation.
- **Neon Postgres Connection Strings:** Database credentials will be generated during Phase 3 cloud infrastructure provisioning.

---

## 11. STATED PROJECT PREFERENCES

### 1. Visual & Aesthetic Preferences
- **Hybrid Aesthetic:** 70% Linear Technical (precision dark mode `#090d16`, 1px subtle borders, monospaced metadata badges, high-velocity `Cmd+K` palette) + 20% Apple HIG (smooth spring physics, translucent elevated cards, responsive bottom bar) + 10% Premium Productivity (glowing progress rings, rich subtle accents).
- **Strict Exclusions:** NO heavy glassmorphism over-decoration, NO neumorphism, NO Material Design, NO generic browser defaults.
- **Typography:** `Inter` for UI sans-serif body; `JetBrains Mono` for code snippets and monospaced metadata badges.

### 2. User Experience & Ergonomics
- **Mobile First (iPhone 16 Pro):** Safe area padding (Dynamic Island, home indicator bar), one-handed thumb reachability, bottom 5-tab navigation.
- **Desktop Adaptation:** Left collapsible sidebar, keyboard shortcuts (`Cmd+K` Command Palette, `Alt+A` Mark Attendance, `Alt+N` New Note).
- **Quiet Interface:** Silent UI when healthy; warning banners render only on rule breach (<75% attendance threshold).

---

## 12. NEXT STEPS

Now that planning, architecture, systems engineering, backlog creation, engineering charter approval, and visual exploration are 100% complete, the repository is ready for **Phase 1 Implementation (Local Core MVP)**.

### Immediate Action Plan:
1. **Unfreeze Architecture:** Lift the architecture freeze.
2. **Initialize Workspace:** Scaffolding React + Vite + PWA project structure in `/src` with TypeScript strict mode enabled (`"strict": true`).
3. **Execute Epic 1 (Phase 1 Local Core MVP) Tasks from `22_IMPLEMENTATION_BACKLOG.md`:**
   - `TASK-101`: Implement Weekly Timetable Grid Component (`features/timetable/WeeklyGrid.tsx`).
   - `TASK-102`: Implement 5-State Attendance Calculation Module (`hooks/useAttendanceMath.ts`) with 100% Vitest coverage.
   - `TASK-103`: Implement Quiet Dashboard View Component (`features/dashboard/DashboardView.tsx`).
4. **Execute Epic 2 (Phase 2 Offline Persistence Layer):**
   - `TASK-201`: Configure Dexie.js schema and reactive `useLiveQuery` hooks (`db/index.ts`).
