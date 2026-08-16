# FRONTEND CODEBASE MAP & RESPONSIBILITY DIRECTORY

**Project**: Academic OS  
**Date**: August 16, 2026  
**Scope**: Complete directory tree, component ownership, state responsibilities

---

## 1. Complete Directory Tree (`src/`)

```
src/
├── app/
│   └── App.tsx                      # Root component, router, layout wrapper
├── components/
│   ├── ErrorBoundary.tsx             # React error boundary
│   ├── GlobalErrorCatcher.tsx        # Window error/unhandled rejection handler
│   ├── layout/
│   │   ├── AppShell.tsx             # Application shell container
│   │   ├── AppShell.module.css      # Dynamic 100dvh scroll ownership styles
│   │   ├── TabBar.tsx               # Mobile navigation bar & desktop menu
│   │   └── TabBar.module.css        # Fixed bottom bar styling & safe-area insets
│   └── ui/
│       ├── Badge.tsx                # Status indicator pill
│       ├── Banner.tsx               # In-page banner message
│       ├── BottomSheet.tsx          # Focus-trapped mobile modal sheet
│       ├── Button.tsx               # Core M3 button implementation
│       ├── Card.tsx                 # M3 surface container card
│       ├── Chip.tsx                 # Tag filter pill
│       ├── ConfirmDialog.tsx        # Modal confirmation prompt
│       ├── EmptyState.tsx           # Empty list fallback view
│       ├── GlassButton.tsx          # Compatibility alias for Button
│       ├── GlassCard.tsx            # Compatibility alias for Card
│       ├── LoadingState.tsx         # Spinner loading overlay
│       ├── OfflineBanner.tsx        # Network status warning bar
│       ├── PermissionGate.tsx       # Auth role permission barrier
│       ├── ProgressRing.tsx         # SVG attendance progress gauge
│       ├── QuickLink.tsx            # Shortcut link tile
│       ├── SegmentedControl.tsx     # Tab switch pill group
│       ├── Skeleton.tsx             # Shimmer skeleton loader
│       ├── StatTile.tsx             # Analytics key-value tile
│       ├── SuccessState.tsx         # Action completion checkmark
│       ├── Toast.tsx                # Toast message renderer
│       ├── index.ts                 # Central component export barrel
│       └── ui.module.css            # Central UI design system CSS
├── data/
│   └── aditCalendarDefaults.ts      # Default ADIT institutional calendar seed
├── db/
│   ├── index.ts                     # Dexie IndexedDB instance initialization
│   ├── seeds.ts                     # Institutional demo seed data
│   └── useDatabase.ts               # Database reactive state hooks
├── features/
│   ├── admin/AdminPortalView.tsx    # System admin portal & access key management
│   ├── analytics/AnalyticsView.tsx  # Task & attendance analytics graphs
│   ├── attendance/AttendanceView.tsx# Attendance record tracking view
│   ├── auth/
│   │   ├── ActivationView.tsx       # Access key activation portal
│   │   └── OnboardingView.tsx       # Student onboarding wizard
│   ├── calendar/
│   │   ├── AcademicCalendarImportView.tsx # Institutional PDF/JSON calendar importer
│   │   └── CalendarEventsView.tsx   # Academic calendar events manager
│   ├── dashboard/QuietDashboard.tsx # Today Hub dashboard screen
│   ├── directory/DirectoryView.tsx  # ADIT faculty reference directory
│   ├── exams/ExamsView.tsx          # Midsem & endsem exam tracker
│   ├── notes/NotesView.tsx          # Subject notes editor & viewer
│   ├── notfound/NotFoundView.tsx    # 404 route fallback screen
│   ├── plan/PlanHubView.tsx         # Plan Hub parent tab view
│   ├── profile/ProfileView.tsx      # Student profile & settings view
│   ├── resources/ResourcesView.tsx  # Academic study resources & links
│   ├── semester/SemesterSetupView.tsx# Semester date configuration
│   ├── subjects/ManageSubjectsView.tsx # Subject list & course code manager
│   ├── tasks/TasksView.tsx          # Assignment & task tracker
│   └── timetable/
│       ├── SlotDetailSheet.tsx      # Attendance marking bottom sheet
│       ├── TimetableBuilderView.tsx # Timetable schedule builder
│       ├── TimetableImportView.tsx  # Timetable JSON/text import tool
│       ├── TimetableGrid.tsx        # Daily schedule card list
│       └── WeeklyGrid.tsx           # Full week timetable grid
├── hooks/
│   ├── useAcademicData.ts           # Central hook aggregating Dexie data
│   └── useHashLocation.ts           # Hash-based router location listener
├── lib/
│   ├── accessKeyMigration.ts        # Access key migration utility
│   ├── accessKeyRateLimit.ts        # Rate limiter for activation attempts
│   ├── accessKeys.ts                # Access key validation logic
│   ├── accountModelMigration.ts     # Student account migration utility
│   ├── adminKeys.ts                 # Admin key verification logic
│   ├── adminMigration.ts            # Admin database migration script
│   ├── fileExport.ts                # CSV/JSON file export utility
│   ├── referenceData.ts             # ADIT reference faculty dataset loader
│   ├── saveStudentProfile.ts        # Profile save & validation helper
│   └── supabaseClient.ts            # Supabase JS client singleton
├── store/
│   ├── authStore.ts                 # Zustand activation & authentication state
│   ├── profileStore.ts              # Zustand student profile configuration
│   └── uiStore.ts                   # Zustand active theme, modals & toasts
├── styles/
│   ├── global.css                   # Global CSS reset & layout primitives
│   └── tokens.css                   # Quiet Luxury design system CSS variables
├── utils/
│   ├── attendanceMath.ts            # Attendance percentage calculation formulas
│   ├── attendanceTrend.ts           # Attendance trend analysis algorithms
│   └── date.ts                      # Date formatting & week range helpers
├── main.tsx                         # App entry script
└── vite-env.d.ts                    # Vite TypeScript declaration types
```

---

## 2. Component Responsibility & State Ownership Matrix

| Component / File | Primary Responsibility | State Owned | Downstream Dependencies |
|---|---|---|---|
| `App.tsx` | Hash routing, main view assembly | Active Hash Route | `AppShell`, feature views |
| `AppShell.tsx` | Dynamic viewport scroll container | Desktop Sidebar state | `TabBar`, main content area |
| `TabBar.tsx` | Mobile bottom navigation rail | Active Tab index | `useHashLocation` |
| `authStore.ts` | Activation state, roles & keys | `activated`, `role`, `code` | `ActivationView`, `PermissionGate` |
| `uiStore.ts` | Theme, modal stack & toasts | `theme`, `toasts`, `modals` | `AppShell`, `Toast`, UI primitives |
| `profileStore.ts` | Student settings & targets | `name`, `targetAttendance` | `ProfileView`, `AttendanceView` |
| `useAcademicData.ts` | Reactive local DB data accessor | IndexedDB Dexie Live Queries | All feature views |
| `SlotDetailSheet.tsx` | Attendance marking & rescheduling | Selected slot state | `AttendanceView`, `QuietDashboard` |
