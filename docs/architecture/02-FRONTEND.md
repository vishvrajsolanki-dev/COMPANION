# ACADEMIC OS — FRONTEND ARCHITECTURE SPECIFICATION

**Version**: 0.2.0  
**Stack**: React 18, TypeScript, Vite, Zustand, Dexie.js (IndexedDB), Supabase Client, Vanilla CSS Tokens  
**Canonical Visual Source**: Stitch Project `10253714570536683011`  
**Design Contract**: `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md`

---

## 1. Frontend Overview
Academic OS is a mobile-first, offline-ready Student Academic Operating System built as a progressive web application (PWA). The application is engineered for maximum performance, offline resilience, and zero interaction latency by employing a **Local-First Data Architecture** powered by IndexedDB (Dexie.js) and lightweight reactive state stores (Zustand).

---

## 2. Application Entry Point
- `src/main.tsx`: Mounts the React root element to `#root` inside `index.html`. Wraps the app in `React.StrictMode` and `ErrorBoundary`.
- `src/app/App.tsx`: Manages root route matching, offline status detection via `navigator.onLine` window listeners, system state banners, and root layout structure (`AppShell`).

---

## 3. App Shell Architecture
- **Layout Component**: `src/components/layout/AppShell.tsx`
- **CSS Module**: `src/components/layout/AppShell.module.css`
- **Height & Scroll Ownership**: The app shell consumes `100dvh` (dynamic viewport height). The `.mainContent` container is established as the single, authoritative vertical scroll owner with CSS `-webkit-overflow-scrolling: touch`.
- **Safe Area Insets**: Reusable mobile bottom clearance:
  ```css
  padding-bottom: calc(var(--tabbar-height, 64px) + env(safe-area-inset-bottom, 0px) + 8px);
  ```

---

## 4. Navigation Architecture
- **Navigation Component**: `src/components/layout/TabBar.tsx` (`TabBar.module.css`)
- **Desktop Sidebar**: Integrated in `AppShell` for viewports ≥ 768px.
- **Mobile Bottom Bar**: Fixed footer bar pinned with `position: fixed; bottom: 0; z-index: 20` featuring 5 primary hubs:
  1. `Today` (`#today`)
  2. `Plan` (`#plan`)
  3. `Study` (`#study`)
  4. `Account` (`#account`)
  5. `Activation` (`#activation`)

---

## 5. Hash Routing Architecture
- **Hook**: `src/hooks/useHashLocation.ts`
- **Behavior**: Uses browser URL hash navigation (`window.location.hash`). Reads `location.hash` changes via `hashchange` event listeners. Supports nested subview paths (e.g., `#plan/builder`, `#study/tasks`, `#account/admin`).

---

## 6. Zustand Store Architecture
Academic OS uses 3 dedicated Zustand state stores located in `src/store/`:
1. `authStore.ts`: Tracks user activation status (`activated`, `role: 'student' | 'admin'`), user profile metadata, and session activation codes.
2. `uiStore.ts`: Manages global UI state (current theme `'light' | 'dark'`, toast notification queue, active modal overlays, bottom sheet visibility).
3. `profileStore.ts`: Manages student profile settings (name, roll number, department, semester, target attendance threshold).

---

## 7. Component Architecture
Components are structured into 3 distinct operational layers:
1. `src/components/layout/`: AppShell, TabBar, Navigation sync.
2. `src/components/ui/`: Atomic design system components (Button, Card, Badge, Banner, BottomSheet, ConfirmDialog, LoadingState, OfflineBanner, Toast, Skeleton, etc.).
3. `src/features/`: Domain-specific feature views.

---

## 8. Design System & CSS Tokens
- **Tokens File**: `src/styles/tokens.css` (M3 surface container layering,Quiet Luxury palette).
- **Global Styles**: `src/styles/global.css` (Reset rules, typography metrics, scrollbars).
- **Core Component Styles**: `src/components/ui/ui.module.css` (Atomic CSS modules).

---

## 9. Feature Architecture
Domain views in `src/features/`:
- `today/`: Today View dashboard, attendance quick actions.
- `timetable/`: WeeklyGrid, TimetableBuilderView, TimetableImportView, SlotDetailSheet.
- `calendar/`: CalendarEventsView, AcademicCalendarImportView.
- `subjects/`: ManageSubjectsView.
- `semester/`: SemesterSetupView.
- `tasks/`: TasksView.
- `notes/`: NotesView.
- `exams/`: ExamsView.
- `resources/`: ResourcesView.
- `analytics/`: AnalyticsView.
- `profile/`: ProfileView.
- `admin/`: AdminPortalView.
- `auth/`: ActivationView, OnboardingView.

---

## 10. Data Access Patterns
Data operations follow a Local-First priority strategy:
`React Component` → `Custom Hook / Selector` → `Dexie DB (IndexedDB)` → `Supabase Client (Async Sync/RPC)`

---

## 11. Dexie / Offline Architecture
- `src/db/index.ts`: Initializes the local IndexedDB database instance (`AcademicOSDB`).
- **Tables**: `academicSlots`, `attendanceRecords`, `tasks`, `notes`, `exams`, `resources`, `calendarEvents`, `subjects`, `semesters`, `studentProfile`, `accessKeys`.
- **React Hook**: Uses `useLiveQuery` from `dexie-react-hooks` for zero-re-render real-time reactive UI updates upon local mutations.

---

## 12. Supabase Client Boundaries
- `src/lib/supabaseClient.ts`: Initializes the singleton `@supabase/supabase-js` client instance.
- **Boundaries**: Supabase is strictly used for secondary remote synchronization, institutional reference data seeding, and administrative RPC calls. Local Dexie database acts as the single primary read/write engine for the application UI.

---

## 13. Authentication & Authorization Boundaries
- Handled via `src/store/authStore.ts` and `src/components/ui/PermissionGate.tsx`.
- Unactivated users are locked to `#activation`. Admin features (e.g., `#account/admin`) require `role === 'admin'` or a valid access key.

---

## 14. Error Handling
- `src/components/ErrorBoundary.tsx`: Catches unhandled React rendering errors.
- `src/components/GlobalErrorCatcher.tsx`: Listens to `window.onerror` and `unhandledrejection`.

---

## 15. Global System States
- `src/components/ui/OfflineBanner.tsx`: Triggers automatically when network drops.
- `src/components/ui/Toast.tsx`: Renders queued notification toasts with auto-dismissal.

---

## 16. PWA Architecture
- Powered by `vite-plugin-pwa` in `vite.config.ts`. Generates a standalone Service Worker (`dist/sw.js`) that precaches static JS/CSS bundles and font assets for instant offline boot.

---

## 17. Testing Architecture
- **Unit & Integration**: Vitest (`npm run test`).
- **E2E & Visual Regression**: Playwright (`npx playwright test`).

---

## 18. Responsive Architecture
- Mobile-First layout methodology (`360px` to `1280px`). CSS Grid form controls use `repeat(auto-fit, minmax(130px, 1fr))` to guarantee zero element overlap or horizontal overflow on narrow mobile viewports.

---

## 19. Accessibility Architecture
- Native HTML5 semantic elements (`<main>`, `<header>`, `<nav>`, `<section>`).
- Touch targets compliant with 44×44px minimum sizing. Focus trap and keyboard navigation managed in `BottomSheet.tsx` and `ConfirmDialog.tsx`.

---

## 20. Motion Architecture
- Motion is governed by `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md`. Fast, subtle 150–250ms ease transitions. Full support for `prefers-reduced-motion: reduce`.

---

## 21. File & Folder Conventions
- Component filenames: PascalCase (`AppShell.tsx`, `TasksView.tsx`).
- Styles: `[ComponentName].module.css` or centralized token variables in `tokens.css`.
- Tests: Located in `__tests__/` co-located folders or `e2e/` root directory.

---

## 22. How to Add a New Feature
1. Create a new directory in `src/features/[feature-name]/`.
2. Define the main view component `[FeatureName]View.tsx`.
3. Add Dexie schema definitions or Zustand store selectors if persistent data is needed.
4. Register the route hash mapping in `src/app/App.tsx`.
5. Add unit tests in `src/features/[feature-name]/__tests__/` and E2E coverage in `e2e/`.

---

## 23. How to Add a New Reusable Component
1. Create `src/components/ui/[ComponentName].tsx`.
2. Define styling rules in `src/components/ui/ui.module.css`.
3. Export the component in `src/components/ui/index.ts`.
4. Add component unit test in `src/components/ui/__tests__/`.

---

## 24. How to Add a New Route or Subview
1. Open `src/hooks/useHashLocation.ts` (if parsing custom route tokens).
2. Update the hash router logic in `src/app/App.tsx`.
3. Add navigation button/tab highlight logic in `src/components/layout/TabBar.tsx`.

---

## 25. How to Write Tests
- **Vitest Unit Test**: Create `file.test.ts` using `describe`, `it`, `expect`. Run via `npm run test`.
- **Playwright E2E Test**: Create `e2e/feature.spec.ts` using `import { test, expect } from 'playwright/test'`. Run via `npx playwright test`.

---

## 26. How Visual Regression Works
- Handled by `e2e/visual-regression.spec.ts`.
- Captures full-page screenshots across viewports and compares against golden baseline snapshots stored in `e2e/visual-regression.spec.ts-snapshots/`.
