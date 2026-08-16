# FEATURES_MAP — Student Academic OS

A file-level map of every user-facing feature to its implementation. Follow a
row to find where a feature lives; edit the view for UI, the store for state,
the `lib/` file for logic, or the migration for server behavior.

**Stack:** React 18 + Vite + TypeScript, offline-first PWA (Dexie/IndexedDB),
Supabase via SECURITY DEFINER RPCs (anon key + RLS), Cloudflare Pages + GitHub
Actions. No custom server.

---

## Navigation & shell

| Feature | Where |
|---|---|
| App shell, view routing (zustand-driven subviews), lazy loading + Suspense | `src/app/App.tsx` |
| Bottom tab bar (Home / Schedule / Tasks / Profile) | `src/components/layout/TabBar.tsx` |
| UI state (active tab, active subview, theme) | `src/store/uiStore.ts` |
| Design tokens / shared UI kit | `DESIGN_SYSTEM.md`, `src/components/ui/*` |

## Core views (tab bar)

| Feature | View | Notable logic |
|---|---|---|
| Dashboard (quiet home) | `src/features/dashboard/QuietDashboard.tsx` | quick links → subviews |
| Weekly timetable grid | `src/features/timetable/WeeklyGrid.tsx` | calendar ground truth, slot sheets |
| Tasks / to-dos | `src/features/tasks/TasksView.tsx` | — |
| Profile / account card / backup-restore / wipe | `src/features/profile/ProfileView.tsx` | Dexie JSON export + atomic restore |

## Subviews (opened from Dashboard quick links)

| Feature | View |
|---|---|
| Attendance | `src/features/attendance/AttendanceView.tsx` |
| Notes | `src/features/notes/NotesView.tsx` |
| Analytics | `src/features/analytics/AnalyticsView.tsx` |
| Exams | `src/features/exams/ExamsView.tsx` |
| Resources | `src/features/resources/ResourcesView.tsx` |
| Directory | `src/features/directory/DirectoryView.tsx` |
| Semester setup | `src/features/semester/SemesterSetupView.tsx` |
| Manage subjects | `src/features/subjects/ManageSubjectsView.tsx` |
| Timetable builder | `src/features/timetable/TimetableBuilderView.tsx` |
| Timetable import (real UI-driven) | `src/features/timetable/TimetableImportView.tsx` |
| Academic calendar import (real UI-driven) | `src/features/calendar/AcademicCalendarImportView.tsx` |
| Calendar events | `src/features/calendar/CalendarEventsView.tsx` |
| Admin portal (see Access Control) | `src/features/admin/AdminPortalView.tsx` |
| Design system (dev only) | `src/features/design/StyleGuideView.tsx` |

## Access control (activation + admin)

| Feature | Where |
|---|---|
| Activation gate (key entry screen) | `src/features/auth/ActivationView.tsx` |
| Auth state (status, activation, admin code) | `src/store/authStore.ts` |
| Access-key client (RPC wrappers + typed mappers) | `src/lib/accessKeys.ts`, `src/lib/adminKeys.ts` |
| Admin portal — Generate / Keys / Activations / **Audit** | `src/features/admin/AdminPortalView.tsx` |
| Access-key rate limiting (client-side helper) | `src/lib/accessKeyRateLimit.ts` |
| Supabase client (null when unconfigured) | `src/lib/supabase.ts` |

## Local data layer

| Feature | Where |
|---|---|
| Dexie schema / tables | `src/db/index.ts` |
| Data hooks (live queries) | `src/db/useDatabase.ts` |
| Seed data (empty install) | `src/db/seeds.ts` |
| Attendance math helpers | `src/utils/attendanceMath.ts` |
| Profile store (attendance/settings) | `src/store/profileStore.ts` |

## Backend (Supabase migrations, applied in order)

| Migration | What it does |
|---|---|
| `0001_access_keys.sql` | `access_keys` + `profiles` tables, RLS, atomic consumption, code gen/mask, `activate_access_key` |
| `0002_admin_portal.sql` | Admin RPCs: `admin_identity`, `admin_list_keys`, `admin_generate_key`, `admin_set_key_active`, `admin_list_profiles` |
| `0003_rate_limiting.sql` | Per-key `failed_attempts` + `locked_until`; 5 failures → 15-min lockout |
| `0004_database_cleanup.sql` | Drops redundant index; `admin_actions` audit table + `admin_list_actions` (owner-only); instruments mutating RPCs |

## Reliability & safety

| Feature | Where |
|---|---|
| Global + per-view error boundaries | `src/components/ErrorBoundary.tsx`, used in `src/app/App.tsx` |
| Global error catcher → toast (Dexie/storage failures) | `src/components/GlobalErrorCatcher.tsx` |
| Toast provider | `src/components/ui/Toast.tsx` |
| PWA manifest + service worker (precache 57 entries) | `vite.config.ts` (VitePWA), `public/manifest.json`, `public/icons/*` |
| Migration apply tooling (DB conn string) | `scripts/apply-migration.cjs`, `scripts/run-migration.cjs`, `scripts/lib/env.cjs` |

## Verification & docs

| Asset | Purpose |
|---|---|
| `scripts/verify-live-deploy.cjs` | Post-deploy smoke test incl. **security headers** |
| `scripts/verify-security-fixes.cjs` | Security regression checks (access-key live) |
| `scripts/phase-b-live-verify.cjs`, `scripts/phase-c-live-verify.cjs` | Activation / admin-portal live checks |
| `scripts/QA-AUDIT-2026-08-08.md` | Re-audit with before/after scorecard |
| `scripts/QA-AUDIT-2026-08-07.md` | Original full audit (the "before") |
| `ADMIN_GUIDE.md` | Non-technical manual for managing access keys |
| `DEPLOY.md` | Deploy + env vars + **security headers & CORS** |
| `.github/workflows/ci.yml` | tsc + vitest + vite build on push/PR; deploy-on-main |
| `wrangler.toml` | Cloudflare Pages config |

---

## How a release flows

`npm run build` (tsc + vite) → `dist/` (incl. `_headers` + SW precache) →
deploy on push to `main` via GitHub Actions (`cloudflare/pages-action`) → live at
`https://student-academic-os.pages.dev`. Verification: `scripts/verify-live-deploy.cjs`.
