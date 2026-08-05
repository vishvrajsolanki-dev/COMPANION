# Project Glossary & System Dictionary — Student Academic OS

**Document ID:** `20_GLOSSARY`  
**Author:** Engineering Director  
**Status:** Approved / Active Repository Record  
**Primary References:** [Student_OS_PRD.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md), [06_SYSTEM_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md), [07_DATABASE_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md)  
**Target Audience:** All Engineering Roles, Product Managers, AI Implementation Agents  

---

## Terms & System Definitions

### A
- **Analytics Event:** An append-only structured log entry (`AnalyticsEvent`) capturing user interaction metrics and system events for analytical processing and future AI fine-tuning. Reference: [13_ANALYTICS_SYSTEM.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/13_ANALYTICS_SYSTEM.md#2-append-only-telemetry-schema-analyticsevent).
- **Attendance Record:** A single record (`AttendanceRecord`) storing the attendance mark (`present`, `absent`, `late`, `medical`, `onduty`) for a specific `LectureSlot`, along with marked timestamp and immutable edit history. Reference: [07_DATABASE_ARCHITECTURE.md §3.4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#34-entity-attendancerecord).

### B
- **Background Sync:** The asynchronous client background worker (`syncEngine`) that reconciles queued local IndexedDB mutations with Neon Postgres over the private Tailscale mesh network. Reference: [11_OFFLINE_AND_SYNC.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#2-master-synchronization-sequence--architecture).

### C
- **Conflict Resolution Queue:** An explicit system prompt and backend table (`SyncConflictLog`) used to resolve multi-device edit collisions on high-stakes entities (`AttendanceRecord`) rather than applying silent Last-Write-Wins. Reference: [11_OFFLINE_AND_SYNC.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#3-conflict-detection--merge-strategies).

### D
- **Dashboard:** The primary home screen (`/`) providing instant academic situational awareness (Next Class Card, Slot Strip, Conditional Attendance Risk Banner, Tasks Due Today). Reference: [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-01-dashboard---home-view).
- **Dexie.js:** A developer-friendly JavaScript wrapper over browser IndexedDB providing transactional queries, compound indexes, and reactive `useLiveQuery` React hooks. Reference: [09_FRONTEND_ARCHITECTURE.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#1-frontend-technology-stack--design-system).

### F
- **5-State Attendance:** The attendance marking system supporting `Present`, `Absent`, `Late`, `Medical`, and `On-Duty` states while auto-excluding cancelled lectures from the percentage denominator. Reference: [04_USER_FLOWS.md §Flow 02](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-02-single-slot-5-state-attendance-marking).
- **Free-Time Finder:** An algorithm that scans weekly timetable slots to identify unallocated gaps for revision planning and study blocks. Reference: [04_USER_FLOWS.md §Flow 08](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-08-exam-preparation-syllabus-sweeping--revision-planning).

### I
- **IndexedDB:** The native browser transactional key-value database used as the primary offline read/write store for Student Academic OS. Reference: [07_DATABASE_ARCHITECTURE.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#1-database-design-philosophy).

### L
- **Lecture Slot:** A single instance or recurring item (`LectureSlot`) in the timetable associated with a subject, teacher, room, start/end time, and slot status (`scheduled`, `cancelled`, `rescheduled`, `extra`). Reference: [07_DATABASE_ARCHITECTURE.md §3.3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#33-entity-lectureslot).

### M
- **MiniSearch:** A lightweight client-side full-text fuzzy search library executing over local IndexedDB tables to power the `Cmd+K` Command Palette. Reference: [05_INFORMATION_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#6-search--command-palette-taxonomy-cmdk).

### N
- **Notification Rule:** A data row configuration (`NotificationRule`) defining trigger criteria, offset minutes, and priority for automated Web Push notifications. Reference: [12_NOTIFICATION_SYSTEM.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/12_NOTIFICATION_SYSTEM.md#1-system-architecture--notification-lifecycle).

### O
- **Offline Queue:** The local IndexedDB table (`ClientSyncQueue`) storing unsynced mutation payloads while device network or Tailscale mesh is offline. Reference: [11_OFFLINE_AND_SYNC.md §4.2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#42-queue-schema-in-indexeddb-clientsyncqueue).

### P
- **Progressive Web Application (PWA):** An installable web application built with service workers, app manifests, and offline caching to deliver native mobile and desktop user experiences. Reference: [09_FRONTEND_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#6-pwa-lifecycle--cache-invalidation-strategy).

### Q
- **Quick Capture:** A persistent Floating Action Button (FAB) and modal allowing instant capture of text notes, tasks, or voice audio snippets. Reference: [04_USER_FLOWS.md §Flow 07](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-07-notes-engine-multi-modal-quick-capture--voice-wispr-flow).
- **Quiet Dashboard:** The UX design principle enforcing that warning banners and alerts render **only when an action is required** (e.g. attendance < 75%), keeping the home screen calm when healthy. Reference: [00_PROJECT_OVERVIEW.md §5.2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/00_PROJECT_OVERVIEW.md#52-the-quiet-dashboard-philosophy).

### R
- **Revision Planner:** A module that combines exam syllabus checklists, note tags (`#exam-important`), and Free-Time Finder gaps to generate structured revision schedules. Reference: [14_AI_ARCHITECTURE.md §4.2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/14_AI_ARCHITECTURE.md#42-exam-readiness-score--revision-planner).

### S
- **Safe-to-Skip:** An algorithm calculating the maximum number of future lectures a student can skip without dropping below the target attendance threshold (default 75%). Reference: [04_USER_FLOWS.md §Flow 02](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-02-single-slot-5-state-attendance-marking).
- **Semester Archive:** The module holding past, read-mostly semester records (Semesters 1 to $N-1$) to keep active dataset queries small and fast. Reference: [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-10-semester-archive-archive).
- **Soft-Delete:** The system-wide policy ensuring data rows are flagged as `isDeleted = true` rather than executing hard SQL `DELETE` queries. Reference: [00_PROJECT_OVERVIEW.md §5.3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/00_PROJECT_OVERVIEW.md#53-soft-delete-everywhere--historical-immutability).

### T
- **Tailscale Private Mesh:** A WireGuard-based virtual private network connecting client devices and the Oracle VM, ensuring the backend API is unexposed to the public internet. Reference: [06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture).

### V
- **VAPID (Voluntary Application Server Identification):** The cryptographic protocol used to sign and authenticate Web Push notifications dispatched directly to browser endpoints. Reference: [12_NOTIFICATION_SYSTEM.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/12_NOTIFICATION_SYSTEM.md#4-web-push-architecture--os-revocation-recovery).

### W
- **Wispr Flow:** An AI voice capture integration used during Quick Capture to convert spoken lecture audio notes into formatted Markdown. Reference: [04_USER_FLOWS.md §Flow 07](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-07-notes-engine-multi-modal-quick-capture--voice-wispr-flow).
