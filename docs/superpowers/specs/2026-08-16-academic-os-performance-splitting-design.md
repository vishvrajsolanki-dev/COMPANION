# PERFORMANCE OPTIMIZATION & CODE-SPLITTING DESIGN SPECIFICATION

**Project**: Academic OS (Student Academic Operating System)  
**Phase**: Batch 2 — Performance Optimization & Bundle Architecture  
**Date**: August 16, 2026  
**Status**: DESIGN SPECIFICATION (Pending Approval — DO NOT IMPLEMENT YET)

---

## 1. Goal

Reduce the initial JavaScript payload downloaded on first app launch by **> 50%** (from **518.0 KB raw / 152.4 KB gzip** down to **< 220 KB raw / < 65 KB gzip**) through strategic 3-tier code splitting (Vendor Manual Chunks + Lazy Gate Views + Route-level Lazy Subviews), while maintaining:
- 100% offline-first PWA functionality.
- Unchanged hash routing matrix (`#today`, `#plan/*`, `#study/*`, `#account/*`).
- Instant subview navigation with zero Cumulative Layout Shift (CLS).
- Full compatibility with existing design tokens, components, and unit/E2E test suites.

---

## 2. Current Baseline (Measured Metrics)

Measurements taken from production Vite build (`dist/assets`):

- **Total JavaScript Build Output**: **780 KB raw** across 46 JavaScript chunks.
- **Main Initial Entry JS Chunk (`index-rkkeYRY1.js`)**: **518.01 KB raw** / **152.41 KB gzip**.
- **Main CSS Output (`index-31GXXURU.css`)**: **25.67 KB raw** / **5.1 KB gzip**.
- **Initial Landing Payload (`#today`)**: **530.3 KB raw** (`index.js` 518.0 KB + `QuietDashboard.js` 12.3 KB).

### Current Subview Chunk Breakdown (Raw Size)

| Chunk / Subview Name | File Size (Bytes) | Category |
| :--- | :--- | :--- |
| `AdminPortalView` | 27,313 B (27.3 KB) | Account Subview |
| `ProfileView` | 22,995 B (23.0 KB) | Account Subview |
| `WeeklyGrid` (Schedule) | 17,365 B (17.4 KB) | Plan Subview |
| `TasksView` | 14,229 B (14.2 KB) | Study Subview |
| `AnalyticsView` | 12,470 B (12.5 KB) | Study Subview |
| `QuietDashboard` (Today) | 12,338 B (12.3 KB) | Main Landing Subview |
| `NotesView` | 12,096 B (12.1 KB) | Study Subview |
| `TimetableImportView` | 11,964 B (12.0 KB) | Plan Subview |
| `ExamsView` | 11,589 B (11.6 KB) | Study Subview |
| `ResourcesView` | 11,099 B (11.1 KB) | Study Subview |
| `StyleGuideView` | 10,820 B (10.8 KB) | Account Subview |
| `CalendarEventsView` | 10,705 B (10.7 KB) | Plan Subview |
| `ManageSubjectsView` | 10,639 B (10.6 KB) | Plan Subview |
| `AttendanceView` | 9,755 B (9.8 KB) | Study Subview |
| `TimetableBuilderView` | 8,401 B (8.4 KB) | Plan Subview |
| `AcademicCalendarImportView` | 8,331 B (8.3 KB) | Plan Subview |
| `DirectoryView` | 6,108 B (6.1 KB) | Account Subview |
| `SemesterSetupView` | 5,908 B (5.9 KB) | Plan Subview |

---

## 3. Current Bundle Architecture Analysis

Despite `src/app/App.tsx` already declaring 18 `React.lazy()` boundaries for subview components, the main entry bundle (`index-rkkeYRY1.js`) remains large at **518.0 KB**.

### Key Bottlenecks Identified

1. **Eager Authentication & Onboarding Views**:
   - `ActivationView` and `OnboardingView` are eagerly imported at the top of `App.tsx` (lines 10 & 11).
   - For an already-activated user opening `#today`, `ActivationView` (Supabase security utilities, key code formatters, rate-limiters) and `OnboardingView` (department reference defaults, calendar presets, profile form schemas) are downloaded unnecessarily.
2. **Monolithic Vendor Chunking**:
   - `vite.config.ts` currently lacks a custom `build.rollupOptions.output.manualChunks` configuration.
   - As a result, Rollup bundles React core (`react`, `react-dom`), Lucide icons (`lucide-react`), Dexie database engine (`dexie`, `dexie-react-hooks`), Zustand state management, and shared layout primitives into the main entry bundle.
3. **Shared Helper & Modal Coupling**:
   - Heavy modal components (Export/Import dialogs, Timetable Builder modal) are transitively imported by parent containers, pulling editor logic into shared chunks.

---

## 4. Candidate Boundaries Evaluation

We evaluated three potential architectures:

### Approach A: Coarse Hub-level Lazy Loading
- Groups views into 4 hub bundles: Today Hub, Plan Hub, Study Hub, Account Hub.
- **Initial Reduction**: ~35 KB reduction.
- **Drawback**: Visiting `#account` still forces downloading `AdminPortalView` (27.3 KB) and `StyleGuideView` (10.8 KB), wasting bandwidth.

### Approach B: Strategic 3-Tier Split (RECOMMENDED)
- **Tier 1: Vendor Manual Chunks (`vite.config.ts`)**:
  - `vendor-react`: `react`, `react-dom`.
  - `vendor-icons`: `lucide-react`.
  - `vendor-db`: `dexie`, `dexie-react-hooks`.
- **Tier 2: Core Shell (Eager)**:
  - App shell layout (`AppShell`), header, sidebar, mobile navigation, toast container, error boundaries, Zustand stores (`uiStore`, `authStore`), and hash router (`useHashLocation`).
- **Tier 3: Lazy Feature Views & Gate Components (`React.lazy`)**:
  - Move `ActivationView` and `OnboardingView` to `React.lazy()`.
  - Retain `React.lazy()` for all 18 subviews.
  - Lazy load heavy modals (Timetable Builder modal, Export/Import dialogs).
- **Expected Initial Payload Reduction**: Main entry JS payload drops from **518.0 KB raw** to **~180-220 KB raw** (a **> 60% reduction**).

### Approach C: Aggressive Micro-Component Splitting
- Split every button, card, and tile into separate dynamic imports.
- **Discarded**: Increases HTTP request overhead, fragments caching, and causes visual micro-flickering.

---

## 5. Chosen Approach: Strategic 3-Tier Split

We recommend **Approach B**.

### Implementation Strategy (Pending Approval)

1. **Vite Manual Chunks Configuration (`vite.config.ts`)**:
   ```typescript
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'vendor-react': ['react', 'react-dom'],
           'vendor-icons': ['lucide-react'],
           'vendor-db': ['dexie', 'dexie-react-hooks'],
         },
       },
     },
   }
   ```
2. **Lazy-Load Auth & Onboarding Gates (`src/app/App.tsx`)**:
   ```typescript
   const ActivationView = React.lazy(() => import('../features/auth/ActivationView').then(m => ({ default: m.ActivationView })));
   const OnboardingView = React.lazy(() => import('../features/auth/OnboardingView').then(m => ({ default: m.OnboardingView })));
   ```
3. **Preserve Subview `React.lazy()` Matrix**: Keep existing named-to-default `React.lazy()` mappers in `App.tsx` wrapped with `<Suspense fallback={<ViewLoading scope={scope} />}>`.

---

## 6. Navigation Behavior & Hash Matrix

- **Zero Router Changes**: `useHashLocation.ts` and `useUIStore.ts` hash mapping matrix remains 100% untouched.
- **Deep-Link Resolution**: Deep-linking to `#plan/builder`, `#study/notes`, or `#account/admin` instantly triggers the lazy chunk fetch for that specific view.
- **Browser History & Edge Cases**: Back/forward navigation, full page refresh, invalid 404 routes (`#invalid`), and legacy hash rewrites (`#home` -> `#today`, `#schedule` -> `#plan/timetable`) function seamlessly.

---

## 7. Loading UX & Accessibility

- **Loading Primitive**: Uses existing `ViewLoading` component in `App.tsx`:
  - Centered theme-aware spinner using CSS custom properties (`var(--primary)`, `var(--bg-page)`).
  - Mono-spaced accessible status message: `"Loading [Scope]…"`.
- **Layout Shift Prevention**: Container enforces `min-height: 60vh` to prevent layout collapse or Cumulative Layout Shift (CLS) during chunk download.
- **Accessibility & Motion**: Respects `prefers-reduced-motion: reduce` settings.

---

## 8. PWA & Offline Behavior

- **Workbox Precaching**: `vite-plugin-pwa` configuration in `vite.config.ts` uses `globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']`.
- **Offline Reliability**: When a user installs the PWA or launches it online, Workbox automatically precaches all split JS chunks in the background.
- **Offline Launch**: Subsequent launches when offline operate without network requests because all lazy chunks reside in `CacheStorage`.

---

## 9. Performance Success Criteria

| Performance Metric | Current Baseline | Target Post-Optimization | Target Improvement |
| :--- | :--- | :--- | :--- |
| **Main Entry JS Raw Size** | 518.01 KB | **< 220 KB** | **> 57% reduction** |
| **Main Entry JS Gzip Size** | 152.41 KB | **< 65 KB** | **> 57% reduction** |
| **Initial Landing Payload (`#today`)** | 530.34 KB | **< 235 KB** | **> 55% reduction** |
| **Total Build Output Chunks** | 46 JS chunks | **49-52 JS chunks** | Clean vendor separation |
| **Build Duration (`npm run build`)** | ~13.5s | **< 20.0s** | Zero build performance degradation |

---

## 10. Test Strategy

1. **Unit Test Verification (`npm run test`)**:
   - Verify all **158 / 158 unit tests** pass without regression.
2. **Playwright E2E Verification (`npx playwright test`)**:
   - Verify all **310 / 310 Playwright tests** pass across 12 viewport/theme combinations.
3. **PWA Offline & Deep-Link Regression Suite**:
   - Verify direct navigation to `#today`, `#plan/timetable`, `#study/tasks`, `#account/profile`.
   - Verify offline SW caching.
4. **Build Verification (`npm run build`)**:
   - Confirm TypeScript compilation (`tsc`) and Vite bundling finish cleanly with exit code 0.

---

## 11. Rollback Strategy

If any unexpected code-splitting issue arises in production:
- Rollup `manualChunks` in `vite.config.ts` can be removed or simplified without altering component source code or application logic.

---

## 12. Risks & Mitigations

- **Risk**: Flash of loading spinner on fast network connections during tab switching.  
  **Mitigation**: Browser HTTP cache and PWA Workbox cache serve cached JS chunks instantly (< 10ms) after the initial fetch.
- **Risk**: Circular dependency in manual chunks configuration.  
  **Mitigation**: Group only third-party vendor packages (`react`, `react-dom`, `lucide-react`, `dexie`) into dedicated vendor chunks.

---

**END OF SPECIFICATION. READY FOR REVIEW.**
