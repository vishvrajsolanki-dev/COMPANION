# Academic OS UI Overhaul Implementation Plan

> **Plan Status:** Revised Draft for User Approval  
> **Visual Source of Truth:** Stitch Project `Academic OS Design System` (`10253714570536683011`) & `ACADEMIC_OS_STITCH_DESIGN_SPEC.md`  
> **Legacy Project Deprecation:** Project `8983278608477554076` is LEGACY ONLY and must NOT influence the new visual implementation.  
> **Implementation Rule:** NO modification to application source code until this plan is explicitly approved. NO new third-party dependencies (No Tailwind, No Material UI, No shadcn).

---

## Goal

Execute a complete, production-grade visual and component overhaul of Academic OS using the validated Stitch design contract (`ACADEMIC_OS_STITCH_DESIGN_SPEC.md`).

The overhaul will:
1. Replace legacy glassmorphism styling with the **Academic OS tonal surface-container system** featuring surface container layering (`surface-container-lowest` white fill, 1px `#c4c6d1` hairline borders, and subtle `4px` left primary-container accent borders).
2. Establish canonical typography utilizing **`Hanken Grotesk`** (Display, Headlines, Body, Numeric Stats) and **`JetBrains Mono`** (`label-caps` 11px uppercase metadata tags) via self-hosted `@font-face` font assets and robust system fallbacks (no Google Fonts runtime CDN dependency).
3. Restructure top-level application navigation into 4 canonical hubs (**`Today`**, **`Plan`**, **`Study`**, **`Account`**).
4. Preserve 100% of existing functional contracts, Dexie IndexedDB offline logic, Supabase RPCs, Security Definer permissions, authentication gates, and test suites.

---

## Current Architecture

* **Framework & Tooling**: React 18.3.1 + Vite 5.4.0 + TypeScript 5.5.3 (ESM format, Node >= 22).
* **State Management**: Zustand 4.5.4 (`uiStore.ts` for in-memory active tab/subview navigation, `authStore.ts` for authentication/activation, `academicStore.ts` for domain state).
* **Database & Offline Layer**: Dexie 4.0.8 (IndexedDB) seeded via `seedDatabaseIfEmpty()` + `@supabase/supabase-js` 2.112.2.
* **Backend & Security**: Supabase PostgreSQL backend with RPC functions (`rpc_verify_access_key`, `rpc_create_access_key`), Row Level Security (RLS) policies, SECURITY DEFINER functions, and role-based authorization (`OWNER`, `STUDENT`).
* **Styling Architecture**: Custom Vanilla CSS with CSS custom properties in `src/index.css`, `src/components/ui/ui.module.css`, `src/components/layout/TabBar.module.css`, `src/features/dashboard/QuietDashboard.module.css`.
* **Testing Infrastructure**: Vitest 2.0.5 (unit & integration) + Playwright 1.62.1 (E2E browser testing).
* **Routing Model**: In-memory Zustand state switching (`activeTab`, `activeSubview`) inside `src/app/App.tsx`.

---

## Stitch Design Contract

Derived exclusively from validated spec `ACADEMIC_OS_STITCH_DESIGN_SPEC.md` (`Project ID: 10253714570536683011`):

* **Design Aesthetic**: Quiet Luxury Academic (editorial, non-gamified, precise).
* **Primary Fonts**: `Hanken Grotesk` (Headings/Body) & `JetBrains Mono` (11px uppercase `label-caps` metadata) delivered via self-hosted font files with system fallbacks.
* **Base Grid**: `4px` grid rhythm (`stack-sm`: 8px, `stack-md`: 16px, `stack-lg`: 32px). Gutters: Mobile 16px, Tablet 24px, Desktop 32px.
* **Color System**: Warm Neutral background (`#faf9f8`), Primary Deep Navy (`#001e4c`), Primary Container (`#1b3462`), Secondary Indigo (`#5a54a4`), Hairline Outline Variant (`#c4c6d1`), Overdue Error (`#ba1a1a`), Attendance Success (`#0f336d`). Dark Mode Navy-Graphite (`#0f172a`), Surface (`#1e293b`).
* **Elevation & Borders**: Academic OS tonal surface-container system (`surface-container-lowest` `#ffffff`, `surface-container-low` `#f4f3f2`, `surface-container` `#eeeeed`, `surface-container-high` `#e9e8e7`, `surface-container-highest` `#e3e2e1`) paired with 1px `#c4c6d1` hairline borders and 4px left primary accent borders for active/hero cards.
* **Shapes**: `rounded-sm` (4px), `rounded-md` (8px), `rounded-lg` (12px), `rounded-xl` (16px), `rounded-full` (9999px).

---

## Component Migration Map

| Existing Component | Action | Target Implementation File | Affected Screens | Behavioral & Functional Contracts Preserved |
|---|---|---|---|---|
| `GlassButton` (`src/components/ui/GlassButton.tsx`) | **REPLACE** | `src/components/ui/Button.tsx` | All application buttons | Preserves `onClick`, `disabled`, `loading` spinner, `variant` (primary navy fill / secondary hairline border / danger / ghost). Touch target >= 44px. |
| `GlassCard` (`src/components/ui/GlassCard.tsx`) | **REPLACE** | `src/components/ui/Card.tsx` | All card containers | Preserves `children`, `onClick`, `accent` (4px left border `#1b3462`), surface container levels (`lowest`, `low`, `default`). |
| `BottomSheet` (`src/components/ui/BottomSheet.tsx`) | **REFACTOR** | `src/components/ui/BottomSheet.tsx` | Mobile detail sheets, filters | Preserves `isOpen`, `onClose`, `title`, drag-to-dismiss handle (`32px x 4px rounded-full`), `rounded-t-xl` 16px radius, backdrop blur `10px`. |
| `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) | **REFACTOR** | `src/components/ui/ConfirmDialog.tsx` | Destructive actions, wipes, key rotations | Preserves `isOpen`, `title`, `message`, `confirmText`, `cancelText`, `onConfirm`, `onCancel`, destructive warning state. |
| `ToastProvider` / `Toast` (`src/components/ui/Toast.tsx`) | **REFACTOR** | `src/components/ui/Toast.tsx` | System-wide action feedback | Preserves `showToast()`, toast queue, auto-dismiss timeout (3s), `type` (success / error / info). |
| `EmptyState` (`src/components/ui/EmptyState.tsx`) | **REFACTOR** | `src/components/ui/EmptyState.tsx` | Empty timetable, task list, search zero-results | Align with `e87e1b4a...` global empty state specs: icon container, `body-sm` description, optional CTA button. |
| `Skeleton` (`src/components/ui/Skeleton.tsx`) | **REFACTOR** | `src/components/ui/Skeleton.tsx` | View loading fallbacks, card placeholders | Align with `5efa1a9c...` / `e7ecc155...` global skeleton specs: pulse animation with `var(--surface-container-high)`. |
| `Banner` (`src/components/ui/Banner.tsx`) | **REFACTOR** | `src/components/ui/Banner.tsx` | Sync status, offline warnings, activation notes | Align with `bec47b5d...` / `18bf2f8f...` status banner specs: icon, `body-sm` text, close/action button. |
| `Badge` (`src/components/ui/Badge.tsx`) | **REFACTOR** | `src/components/ui/Badge.tsx` | Task status, exam tags, role indicators | Update font to `label-caps` (11px JetBrains Mono, uppercase, tracking `0.08em`), `rounded-sm` (4px). |
| `Chip` (`src/components/ui/Chip.tsx`) | **REFACTOR** | `src/components/ui/Chip.tsx` | Filter tags, subject selectors | Pill shape (`rounded-full`), active `primary-container` fill (`#1b3462`), removable icon. |
| `SegmentedControl` (`src/components/ui/SegmentedControl.tsx`) | **REFACTOR** | `src/components/ui/SegmentedControl.tsx` | Timetable day switchers, view modes | `rounded-full` container, elevated white active pill indicator with `shadow-sm`. |
| `QuickLink` (`src/components/ui/QuickLink.tsx`) | **REFACTOR** | `src/components/ui/QuickLink.tsx` | Dashboard quick actions | `surface-container-low` background, 1px border, hover highlight state. |
| `StatTile` (`src/components/ui/StatTile.tsx`) | **REFACTOR** | `src/components/ui/StatTile.tsx` | Analytics metrics, attendance overview | `numeric-stat` 24px Hanken Grotesk font with `font-variant-numeric: tabular-nums`. |
| `ProgressRing` (`src/components/ui/ProgressRing.tsx`) | **REFACTOR** | `src/components/ui/ProgressRing.tsx` | Attendance progress, study goal rings | 4px stroke width, rounded stroke caps, 10% opacity background track. |
| `TabBar` (`src/components/layout/TabBar.tsx`) | **REFACTOR** | `src/components/layout/TabBar.tsx` | Mobile persistent navigation | Refactor to 4 canonical targets (`Today`, `Plan`, `Study`, `Account`), 64px height, active pill highlight & dot indicator. |
| `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) | **KEEP** | `src/components/ErrorBoundary.tsx` | Application React error bounds | Preserves React error catching per view boundary, updates fallback card styling. |
| `GlobalErrorCatcher` (`src/components/GlobalErrorCatcher.tsx`) | **KEEP** | `src/components/GlobalErrorCatcher.tsx` | Unhandled window errors | Preserves window error listeners, updates banner styling. |
| `AppShell` | **NEW** | `src/components/layout/AppShell.tsx` | Global layout frame | Combines Desktop 256px drawer sidebar (`bdffce72...`) and Mobile persistent bottom navigation bar. |

---

## Token Migration

Update `src/index.css` to define the complete semantic CSS custom property system using self-hosted `@font-face` definitions and robust system fallbacks:

```css
/* Self-hosted font declarations (No external Google Fonts runtime dependency) */
@font-face {
  font-family: 'Hanken Grotesk';
  src: url('/fonts/HankenGrotesk-Variable.woff2') format('woff2-variations');
  font-weight: 400 700;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}

:root {
  /* Academic OS Tonal Surface Containers */
  --bg-page: #faf9f8;
  --surface: #faf9f8;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f4f3f2;
  --surface-container: #eeeeed;
  --surface-container-high: #e9e8e7;
  --surface-container-highest: #e3e2e1;

  /* Typography Colors */
  --on-surface: #1a1c1c;
  --on-surface-variant: #444750;

  /* Brand Accents */
  --primary: #001e4c;
  --on-primary: #ffffff;
  --primary-container: #1b3462;
  --on-primary-container: #879dd2;
  --secondary: #5a54a4;
  --secondary-container: #ada7fe;

  /* Borders & Outlines */
  --outline: #747781;
  --outline-variant: #c4c6d1;

  /* Status Colors */
  --error: #ba1a1a;
  --error-container: #ffdad6;
  --on-error-container: #93000a;
  --success-attendance: #0f336d;

  /* Font Families with System Fallbacks */
  --font-primary: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-mono: 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;

  /* Spacing Scale */
  --spacing-unit: 4px;
  --stack-sm: 8px;
  --stack-md: 16px;
  --stack-lg: 32px;
  --gutter-mobile: 16px;
  --gutter-tablet: 24px;
  --gutter-desktop: 32px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}

[data-theme='dark'] {
  --bg-page: #0f172a;
  --surface: #1e293b;
  --surface-container-lowest: #1e293b;
  --surface-container-low: #182232;
  --surface-container: #334155;
  --surface-container-high: #475569;
  --surface-container-highest: #64748b;

  --on-surface: #f1f0ef;
  --on-surface-variant: #94a3b8;

  --primary: #90b0ee;
  --on-primary: #001e4c;
  --primary-container: #1e3a8a;
  --on-primary-container: #d9e2ff;

  --outline: #64748b;
  --outline-variant: #334155;
}
```

---

## Navigation Architecture

### Canonical Top-Level Hierarchy
1. **`Today`** (`activeTab = 'today'`):
   - Dashboard overview, Up Next hero card, Quick Actions, Daily Anchor.
2. **`Plan`** (`activeTab = 'plan'`):
   - Timetable Grid, Academic Calendar, Subjects Manager, Semester Manager, Timetable Builder, Timetable Import.
3. **`Study`** (`activeTab = 'study'`):
   - Study Hub, Tasks List, Notes & Markdown Editor, Exams & Countdown Manager, Resources Directory, Analytics.
4. **`Account`** (`activeTab = 'account'`):
   - User Profile, Appearance Settings, Data & Sync, Faculty Directory, Administration, Support/About.

### Canonical Navigation Update Path & Zero-Dependency Hash Sync
To solve the limitation that `window.history.pushState` and `replaceState` do not automatically fire window `popstate` events, the navigation hook (`src/hooks/useHashLocation.ts`) establishes **one explicit canonical update path**:

1. **Single Canonical Dispatch Function**:
   - `navigateTo(hash: string, options?: { replace?: boolean })`:
     - Calls `window.history.pushState` (or `replaceState`).
     - Immediately dispatches a custom window event `academic-hash-navigate` containing the target hash payload.
     - Updates `useUIStore` state directly.
2. **Event Listeners**:
   - Listens to `popstate` (for browser Back/Forward buttons).
   - Listens to `hashchange` (for manual URL hash editing or external links).
   - Listens to `academic-hash-navigate` (for in-app programmatic tab/subview navigation).
3. **Legacy Hash Migration Handler**:
   - On load or hash change, maps legacy hashes (`#home` -> `#today`, `#schedule` -> `#plan/timetable`, `#profile` -> `#account`, `#notes` -> `#study/notes`, `#exams` -> `#study/exams`, etc.) to canonical paths seamlessly.

### Navigation Test Suite Strategy
Add targeted integration tests in `src/components/layout/__tests__/NavigationHashSync.test.tsx` verifying:
* **Direct deep-link load**: Verifies navigating directly to `#study/notes?id=note-123` initializes `uiStore` with active tab `'study'`, subview `'notes'`, and `selectedNoteId = 'note-123'`.
* **`hashchange` event**: Verifies window hash changes trigger proper Zustand state updates.
* **Browser Back button**: Verifies triggering `popstate` restores the previous tab and subview.
* **Browser Forward button**: Verifies forward history traversal restores expected navigation state.
* **Page Refresh**: Verifies reloading the browser on a hashed URL maintains active navigation tab and subview.
* **Legacy Hash Migration**: Verifies legacy hashes like `#home`, `#schedule`, and `#profile` automatically rewrite to `#today`, `#plan`, and `#account`.

---

## Implementation Milestones

### Milestone 1: Token Foundation & Self-Hosted Fonts
* **Files to Create**: Self-hosted font files in `public/fonts/` (`HankenGrotesk-Variable.woff2`, `JetBrainsMono-SemiBold.woff2`).
* **Files to Modify**: `src/index.css`
* **Interfaces**: Standard CSS custom properties defined in Token Migration section.
* **Behavior Preserved**: `document.documentElement.setAttribute('data-theme', theme)` theme toggle compatibility.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: CSS variables declared, self-hosted fonts configured with system fallbacks, zero test regressions.

### Milestone 2: Core Primitives (Button, Card, Badge, Chip, Skeleton)
* **Files to Create**: `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`
* **Files to Modify**: `src/components/ui/Badge.tsx`, `src/components/ui/Chip.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/index.ts`
* **Interfaces**:
  ```typescript
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
  }
  export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    surface?: 'lowest' | 'low' | 'default' | 'high';
    accentBorder?: boolean;
  }
  ```
* **Behavior Preserved**: `GlassButton` and `GlassCard` re-export from `src/components/ui/index.ts` mapping to new `Button` and `Card` components for backward compatibility during transition.
* **Tests**: Add unit test `src/components/ui/__tests__/Primitives.test.tsx`.
* **Verification Command**: `npm run test`
* **Expected Result**: Core primitives render with correct Academic OS tokens and pass unit tests.

### Milestone 3: Feedback & Overlay Primitives (BottomSheet, ConfirmDialog, Toast, Banner)
* **Files to Create**: None
* **Files to Modify**: `src/components/ui/BottomSheet.tsx`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/Toast.tsx`, `src/components/ui/Banner.tsx`
* **Interfaces**: Preserves existing `BottomSheetProps`, `ConfirmDialogProps`, `ToastProps`, `BannerProps`.
* **Behavior Preserved**: Toast queue auto-dismiss, backdrop blur, keyboard `Esc` dismiss.
* **Tests**: Unit test `src/components/ui/__tests__/Overlays.test.tsx`.
* **Verification Command**: `npm run test`
* **Expected Result**: Dialogs and overlays render with `rounded-xl`, hairline borders, and correct backdrop blur.

### Milestone 4: Layout Primitives & Navigation (AppShell, TabBar, Hash Sync)
* **Files to Create**: `src/components/layout/AppShell.tsx`, `src/hooks/useHashLocation.ts`
* **Files to Modify**: `src/components/layout/TabBar.tsx`, `src/store/uiStore.ts`, `src/app/App.tsx`
* **Interfaces**:
  ```typescript
  export type CanonicalTab = 'today' | 'plan' | 'study' | 'account';
  ```
* **Behavior Preserved**: Tab switching and subview navigation state in `uiStore`.
* **Tests**: Integration test `src/components/layout/__tests__/NavigationHashSync.test.tsx`.
* **Verification Command**: `npm run test`
* **Expected Result**: Desktop 256px sidebar and mobile 4-item bottom tab bar render with active pill indicators and sync cleanly with URL hash.

### Milestone 5: Today View Overhaul
* **Files to Create**: `src/features/today/TodayView.tsx`
* **Files to Modify**: `src/app/App.tsx`, `src/features/dashboard/QuietDashboard.tsx`
* **Interfaces**: Preserves `useAcademicStore` data selectors.
* **Behavior Preserved**: Real-time display of current day timetable slots, next class countdown, quick task toggle.
* **Tests**: Component test `src/features/today/__tests__/TodayView.test.tsx`.
* **Verification Command**: `npm run test`
* **Expected Result**: Matches canonical Today screens `0f5e4d00...` (Light) and `5bc8c0ad...` (Dark).

### Milestone 6: Plan Hub (Timetable Grid, Builder, Import, Calendar, Semester, Subjects)
* **Files to Create**: `src/features/plan/PlanHubView.tsx`
* **Files to Modify**: `src/features/timetable/WeeklyGrid.tsx`, `src/features/timetable/TimetableBuilderView.tsx`, `src/features/timetable/TimetableImportView.tsx`, `src/features/calendar/CalendarEventsView.tsx`, `src/features/semester/SemesterSetupView.tsx`, `src/features/subjects/ManageSubjectsView.tsx`
* **Behavior Preserved**: Timetable slot editing, Dexie database persistence, CSV/JSON import parsing.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: Matches canonical Timetable screens `fc3c8250...` (Mobile Light) and `272f3acc...` (Desktop).

### Milestone 7: Study Hub (Study Hub, Tasks, Notes, Exams, Resources, Analytics)
* **Files to Create**: `src/features/study/StudyHubView.tsx`
* **Files to Modify**: `src/features/tasks/TasksView.tsx`, `src/features/notes/NotesView.tsx`, `src/features/exams/ExamsView.tsx`, `src/features/resources/ResourcesView.tsx`, `src/features/analytics/AnalyticsView.tsx`
* **Coverage Enforced**: Explicitly covers all 6 Study components: **Study Hub Overview**, **Tasks List**, **Notes & Markdown Editor**, **Exams & Countdown Manager**, **Resources Directory**, and **Analytics Dashboard**.
* **Behavior Preserved**: Markdown editing in notes, task checkbox toggles with strike-through, exam countdown calculations, resource downloads, analytics chart rendering.
* **Tests**: Component test `src/features/study/__tests__/StudyHub.test.tsx`.
* **Verification Command**: `npm run test`
* **Expected Result**: Matches canonical Study Hub screens `eceb0db0...` (Light) and `a0d41db8...` (Dark).

### Milestone 8: Account Hub (Profile, Appearance, Sync, Faculty, Admin)
* **Files to Create**: `src/features/account/AccountHubView.tsx`
* **Files to Modify**: `src/features/profile/ProfileView.tsx`, `src/features/directory/DirectoryView.tsx`, `src/features/admin/AdminPortalView.tsx`
* **Behavior Preserved**: Supabase access key rotation, owner vs student role gates, local DB wipe confirmations.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: Matches canonical Account screens `2e52094a...` (Light) and `8891f024...` (Dark).

### Milestone 9: Activation & Onboarding Overhaul
* **Files to Modify**: `src/features/auth/ActivationView.tsx`, `src/features/auth/OnboardingView.tsx`
* **Behavior Preserved**: `rpc_verify_access_key` Supabase RPC call, access key validation, onboarding form submission.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: Matches canonical Activation screens `0295d40f...` (Light Corrected) and `898283fb...` (Dark Master).

### Milestone 10: Global System States & Fallbacks
* **Files to Modify**: `src/components/ui/Skeleton.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/Banner.tsx`, `src/components/ErrorBoundary.tsx`
* **Behavior Preserved**: Uncaught error boundaries, offline banner indicators, skeleton shimmer animations.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: Matches global state screens `5efa1a9c...` (Skeletons), `e87e1b4a...` (Empty), `bec47b5d...` (Feedback), `18bf2f8f...` (Errors).

### Milestone 11: Responsive Behavior & Breakpoint Sweep
* **Files to Modify**: `src/components/layout/AppShell.tsx`, `src/index.css`
* **Behavior Preserved**: Seamless layout adaptation from 360px mobile to 1280px desktop grid.
* **Tests**: Playwright multi-viewport test suite.
* **Verification Command**: `npx playwright test`
* **Expected Result**: Clean layout rendering at 360px, 375px, 390px, 768px, and 1280px viewports.

### Milestone 12: Accessibility (WCAG AA & Keyboard Focus)
* **Files to Modify**: `src/index.css`, `src/components/ui/Button.tsx`, `src/components/ui/BottomSheet.tsx`
* **Behavior Preserved**: Screen reader `aria-*` attributes, 44px touch targets, `focus-visible` outline rings.
* **Tests**: `npx playwright test`
* **Verification Command**: `npx playwright test`
* **Expected Result**: Zero accessibility violations in Playwright audits.

### Milestone 13: Motion & Reduced Motion Safeguards
* **Files to Modify**: `src/index.css`
* **Behavior Preserved**: `@media (prefers-reduced-motion: reduce)` disables all animations and transitions.
* **Tests**: `npm run test`
* **Verification Command**: `npm run test`
* **Expected Result**: Smooth 200ms transitions by default; zero motion under reduced-motion preference.

### Milestone 14: Visual QA & Reference Fidelity Sweep
* **Files to Create**: `e2e/visual-regression.spec.ts`
* **Standard Enforced**: Approved Stitch reference fidelity with controlled visual-diff thresholds and human review for meaningful deviations.
* **Tests**: Playwright screenshot comparison suite.
* **Verification Command**: `npx playwright test e2e/visual-regression.spec.ts`
* **Expected Result**: Visual snapshots achieve reference fidelity against approved Stitch designs across Light and Dark themes.

### Milestone 15: Full Regression Testing (Unit & Integration)
* **Behavior Preserved**: 100% pass rate on all unit, database, auth, and store test suites.
* **Tests**: Run full Vitest test suite.
* **Verification Command**: `npm run test`
* **Expected Result**: All unit and integration tests pass without errors.

### Milestone 16: Final Review & Handoff
* **Files to Modify**: `APP_GUIDE.md`, `DESIGN_SYSTEM.md`
* **Behavior Preserved**: Documentation updated with new design tokens and navigation structure.
* **Verification Command**: `npm run build`
* **Expected Result**: Production build compiles with zero TypeScript errors or CSS build warnings.

---

## Visual QA Plan

Playwright visual testing will be configured in `e2e/visual-regression.spec.ts` to evaluate **approved Stitch reference fidelity with controlled visual-diff thresholds and human review for meaningful deviations**.

Captured across:
1. **Viewports**:
   - Mobile Small: `360 x 800`
   - Mobile Medium: `375 x 812`
   - Mobile Large: `390 x 844`
   - Mobile Landscape: `844 x 390`
   - Tablet: `768 x 1024`
   - Desktop: `1280 x 800`
2. **Themes**:
   - Light Mode (`data-theme="light"`)
   - Dark Mode (`data-theme="dark"`)
3. **State Matrix**:
   - `normal`, `loading`, `skeleton`, `empty`, `error`, `offline`, `syncing`, `permission`, `success`, `confirmation`.

---

## Accessibility QA Plan

* **Contrast Ratios**: Minimum 4.5:1 for body text, 3:1 for large headings (Verified: `on-surface` `#1a1c1c` on `#faf9f8` background yields 15.8:1 contrast).
* **Touch Targets**: All buttons, nav items, and form controls enforced at `min-height: 44px; min-width: 44px`.
* **Keyboard Focus**: `:focus-visible` displays a `2px solid var(--primary)` ring with `2px` offset.
* **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, set transition duration to `0.01ms`.

---

## Performance QA Plan

* **Lighthouse Targets**: Mobile Performance >= 90, CLS = 0, LCP < 2.5s, TBT < 200ms.
* **Bundle Impact**: Maintain lazy-loaded feature routes with `React.lazy` to keep initial bundle size minimal.
* **IndexedDB Initialization Baseline**: Measure current IndexedDB startup timing baseline and guarantee zero performance regression (avoiding arbitrary time targets).

---

## Security / Regression QA Plan

* **Supabase RPCs**: `rpc_verify_access_key`, `rpc_create_access_key`, and `rpc_rotate_owner_key` remain untouched and fully operational.
* **Authorization Gates**: Owner/Admin features (`AdminPortalView.tsx`) remain strictly gated by user role metadata.
* **Data Isolation**: Local Dexie database seeds and user tables remain isolated per device.

---

## Dependency Changes

* **Zero Dependency Changes**: No packages will be added or removed from `package.json`.

---

## Documentation Changes

* `APP_GUIDE.md`: Update application screenshot descriptions, top-level navigation structure (`Today`, `Plan`, `Study`, `Account`), and view guidelines.
* `DESIGN_SYSTEM.md`: Document new CSS tokens (`--surface-container-*`, `--primary`, `--font-primary`), typography hierarchy (`Hanken Grotesk` + `JetBrains Mono`), self-hosted font setup, and component specifications.

---

## Risks & Mitigation

1. **Font Loading & System Fallbacks**: Self-hosted font files take time to load on slow connections. *Mitigation*: Fallback font stack defined (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with `font-display: swap`.
2. **Legacy Subview Links**: Deep links from external notifications or old bookmarks referencing legacy subview keys. *Mitigation*: `useHashLocation` mapping layer maps legacy subview keys (`#home` -> `#today`, `#schedule` -> `#plan`, etc.) to canonical hubs seamlessly.

---

## Recommended Execution Order

1. **Milestone 1**: Token Foundation & Self-Hosted Fonts (`src/index.css`)
2. **Milestone 2**: Core Primitives (`Button`, `Card`, `Badge`, `Chip`, `Skeleton`)
3. **Milestone 3**: Feedback & Overlay Primitives (`BottomSheet`, `ConfirmDialog`, `Toast`, `Banner`)
4. **Milestone 4**: Layout Primitives & Navigation (`AppShell`, `TabBar`, Hash Sync)
5. **Milestone 5**: Today View Overhaul
6. **Milestone 6**: Plan Hub Overhaul
7. **Milestone 7**: Study Hub Overhaul (Hub, Tasks, Notes, Exams, Resources, Analytics)
8. **Milestone 8**: Account Hub Overhaul
9. **Milestone 9**: Activation & Onboarding Overhaul
10. **Milestone 10**: Global System States & Fallbacks
11. **Milestone 11**: Responsive Behavior Sweep
12. **Milestone 12**: Accessibility Audit
13. **Milestone 13**: Motion Safeguards
14. **Milestone 14**: Visual QA & Snapshot Sweep
15. **Milestone 15**: Full Regression Testing (`npm run test`)
16. **Milestone 16**: Final Build Verification (`npm run build`) & Documentation

---

## First Implementation Task

**Task**: Milestone 1 — Token Foundation & Self-Hosted Fonts  
* **File to Modify**: `src/index.css`  
* **Details**: Define self-hosted `@font-face` definitions for `Hanken Grotesk` and `JetBrains Mono` with robust system fallbacks. Declare canonical CSS custom properties (`--bg-page`, `--surface-container-*`, `--primary`, `--outline-variant`, `--font-primary`, `--font-mono`, etc.) for both light and dark themes.  
* **Verification Command**: `npm run test`
