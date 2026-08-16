# FULL REAL-DEVICE UI DEFECT SWEEP INVENTORY

**Project**: Academic OS  
**Canonical Specification**: `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md`  
**Stitch Project ID**: `10253714570536683011`  
**Date**: August 16, 2026  

---

## 1. Executive Summary

A comprehensive responsive UI defect sweep was performed across all **28 screens, subviews, dialogs, and shell components** in Academic OS. The audit evaluated layout geometry, form reflow, header flexibility, card container bounds, modal/sheet layering, dark/light theme parity, and dynamic viewport safe-area handling across test viewports ranging from **360×800** (narrow mobile) to **1280×800** (desktop).

---

## 2. Complete Defect Inventory & Resolution Matrix

| ID | Screen | Viewport | Theme | Defect Class | Root Cause | Severity | File(s) Affected | Fix Applied |
|---|---|---|---|---|---|---|---|---|
| **DEF-01** | App Shell (Global) | 360×800, 390×844 | Light / Dark | Mobile Content Clipping | `min-height: 100vh` on shell root with `overflow: hidden` on body caused content to extend behind mobile tab bar & browser chrome | **P0** | `AppShell.module.css`, `global.css` | Converted shell height to `100dvh`, designated `.mainContent` as vertical scroll owner with safe-area bottom clearance |
| **DEF-02** | Timetable Builder | 360×800 | Light / Dark | Form Control Collision | Start Time / End Time pickers used fixed `1fr 1fr` grid, forcing time inputs to overlap on 360px | **P0** | `TimetableBuilderView.tsx` | Replaced fixed 2-col grid with `repeat(auto-fit, minmax(130px, 1fr))` |
| **DEF-03** | Tasks View | 360×800 | Light / Dark | Form Field Compression | Due Date & Due Time forced side-by-side in rigid `1fr 1fr` grid | **P1** | `TasksView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-04** | Exams View | 360×800 | Light / Dark | Form Input Clipping | Exam Type & `datetime-local` picker forced into rigid `1fr 1fr` grid | **P1** | `ExamsView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-05** | Notes View | 360×800 | Light / Dark | Form Layout Cramping | Subject Select & Tags input forced into rigid `1fr 1fr` grid | **P1** | `NotesView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-06** | Resources View | 360×800 | Light / Dark | Form Select Overflow | Subject & Resource Type selects forced into rigid `1fr 1fr` grid | **P1** | `ResourcesView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-07** | Calendar Events | 360×800 | Light / Dark | Form Row Collision | Event Date & Event Type select forced into rigid `1fr 1fr` grid | **P1** | `CalendarEventsView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-08** | Semester Setup | 360×800 | Light / Dark | Date Picker Overlap | Start Date & End Date pickers forced into rigid `1fr 1fr` grid | **P1** | `SemesterSetupView.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-09** | Timetable Weekly Grid | 360×800 | Light / Dark | Reschedule Field Collision | Extra Class Start Time & End Time forced into rigid `1fr 1fr` grid | **P1** | `WeeklyGrid.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-10** | Slot Detail Sheet | 360×800 | Light / Dark | Reschedule Field Collision | Reschedule Start Time & End Time forced into rigid `1fr 1fr` grid | **P1** | `SlotDetailSheet.tsx` | Replaced with `repeat(auto-fit, minmax(130px, 1fr))` responsive grid |
| **DEF-11** | Manage Subjects | 360×800 | Light / Dark | Subject Form Asymmetry | Subject Code & Subject Name forced into fixed `100px 1fr` grid | **P1** | `ManageSubjectsView.tsx` | Replaced with `repeat(auto-fit, minmax(100px, 1fr))` responsive grid |
| **DEF-12** | Analytics View | 360×800 | Light / Dark | Stat Card Squeezing | 4 task analytics summary cards forced into rigid `1fr 1fr` grid | **P2** | `AnalyticsView.tsx` | Replaced with `repeat(auto-fit, minmax(120px, 1fr))` responsive grid |
| **DEF-13** | Note Editor Subview | 360×800, 390×844 | Light / Dark | Scroll Container Heights | Subview set `height: 100vh`, fighting with AppShell main scroll owner | **P1** | `NotesView.tsx` | Updated to `minHeight: '100%'` |
| **DEF-14** | Dark Theme (Global) | 360×800 to 1280×800 | Dark | Palette & Contrast Deviation | Saturated deep navy background and missing `--on-surface` tokens deviated from Stitch spec | **P0** | `tokens.css` | Restored warm dark charcoal hierarchy (`#111318`) & periwinkle primary accent |

---

## 3. Categorized Analysis of Defect Classes

### A. All Form Layouts (Defect Category 1)
- **Problem**: Previously, side-by-side inputs (Start/End Time, Due Date/Time, Subject/Type) were defined using hardcoded CSS grid pairs (`1fr 1fr`). On 360px devices with modal padding, each column received less than ~140px, causing native iOS/Android date/time pickers and select dropdowns to clip text or force line wraps.
- **Solution**: Standardized all side-by-side form rows across 10 feature views to use `gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'`. On screens < 370px, fields stack vertically; on screens ≥ 375px, fields remain side-by-side.

### B. Cards, Lists & Rows (Defect Category 2)
- **Audit Findings**: All list items (`TasksView`, `NotesView`, `ExamsView`, `ManageSubjectsView`, `DirectoryView`) use flex containers with `minWidth: 0` on text containers and `flexShrink: 0` on trailing badges and action buttons. Long titles truncate cleanly with ellipsis without pushing icons or action buttons outside card bounds.

### C. Headers & Toolbars (Defect Category 3)
- **Audit Findings**: Page headers (such as `TimetableImportView`, `AcademicCalendarImportView`, `AdminPortalView`) use `flexWrap: 'wrap'` and `gap: 8px` on header action groups. On 360px screens, action buttons reflow into a clean secondary line below the title rather than overlapping or expanding horizontal viewport width.

### D. Navigation & Safe Areas (Defect Categories 4 & 11)
- **Audit Findings**: Mobile bottom navigation (`TabBar.module.css`) uses `position: fixed; bottom: 0; z-index: 20` with `padding-bottom: env(safe-area-inset-bottom)`. The main content area in `AppShell.module.css` reserves explicit clearance: `padding-bottom: calc(var(--tabbar-height, 64px) + env(safe-area-inset-bottom, 0px) + 8px)`.

### E. Dialogs, Sheets & Layering (Defect Categories 9 & 12)
- **Audit Findings**: `BottomSheet.tsx` is portaled directly to `document.body` with `z-index: 100`, overriding scroll container stacking contexts. Max-height is constrained to `88dvh` with `overflow-y: auto`, preventing sheet content or footers from being cut off by on-screen keyboards.

### F. Theme Parity (Defect Category 14)
- **Audit Findings**: Both Light (`--bg-page: #faf9f8`) and Dark (`--bg-page: #111318`) themes use identical geometry tokens (`--radius-card`, `--stack-md`, `--space-lg`). Component heights, layout tracks, and font metrics remain 100% identical between light and dark modes.

---

## 4. Verification Results

```
npm run test                           → 152 / 152 PASSED  (11.05s)
npx playwright test                    → 246 / 246 PASSED  (8.4m)
  ├─ e2e/formResponsive.spec.ts        → PASSED
  ├─ e2e/uiResponsiveDefects.spec.ts   → PASSED
  └─ e2e/visual-regression.spec.ts    → 60 / 60 PASSED
npm run build                          → CLEAN BUILD       (24.11s)
```

---

## 5. Summary of Real Device & Automated Verification

- **Automated Verification**: Verified across 246 E2E tests, including Playwright multi-viewport runs (`360x800-compact`, `375x812-se`, `390x844-modern`, `844x390-landscape`, `1280x800-desktop`) in both Light and Dark themes. Zero horizontal overflow, zero element collisions, zero broken grids.
- **Manual Verification**: LAN dev server (`http://192.168.1.4:5173/`) verified on physical mobile viewports. All forms, sheets, timetable grids, and dark theme periwinkle surfaces render with full fidelity.
