# Full-Stack Completeness Audit — Student Academic OS

**Date:** 2026-08-05  
**Auditor:** Claude Code (automated)  
**Scope:** Every file under `src/` + root config files

---

## 1. Error Handling

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `ErrorBoundary` wraps entire `<App />` (`src/app/App.tsx:54`) — catches render crashes with reset button | **No per-view error boundaries** — a crash in ExamsView kills the entire app; a lightweight boundary around each subview would let the user navigate away and recover | Medium |
| `componentDidCatch` logs to `console.error` with `[Academic OS]` prefix (`ErrorBoundary.tsx:24`) | **No structured error reporting** — errors only go to browser console; no IndexedDB error log, no Sentry/Beacon | Low |
| Two import views have `try/catch`: `AcademicCalendarImportView.tsx:51`, `TimetableImportView.tsx:164,200` | **All other DB writes are bare `await`** — every `db.X.add()`, `db.X.update()`, `db.X.delete()` across all views (`TasksView`, `NotesView`, `ExamsView`, `ManageSubjectsView`, `CalendarEventsView`, `SemesterSetupView`, `SlotDetailSheet`, `WeeklyGrid`) is un-wrapped. A failed write silently rejects with an unhandled promise rejection | **High** |
| `confirm()` is used for destructive deletes (6 places) — native dialog, no crash risk | No fallback if `confirm()` is disabled by browser policy | Low |
| DB operations use `Date.now()` for IDs — **no idempotency guard** against double-taps on mobile | Rapid double-tap on "Add Task" → two identical rows | Medium |

---

## 2. Loading & Empty States

| View | Empty state present? | Loading state? |
|------|---------------------|----------------|
| Dashboard (`QuietDashboard.tsx`) | ⚠️ Shows "No lectures today" but no skeleton for hero card | No skeleton |
| Schedule (`WeeklyGrid.tsx`) | ✅ "No classes scheduled" message | No skeleton |
| Tasks (`TasksView.tsx`) | ✅ "No tasks match" message | No skeleton |
| Attendance (`AttendanceView.tsx`) | ✅ "No subjects yet" message | No skeleton |
| Notes (`NotesView.tsx`) | ✅ "No study notes found" | No skeleton |
| Exams (`ExamsView.tsx`) | ✅ "No exams scheduled" | No skeleton |
| Analytics (`AnalyticsView.tsx`) | ⚠️ Renders stats even when zero — shows all zeros | No skeleton |
| Directory (`DirectoryView.tsx`) | ✅ "No faculty records found" | No skeleton |
| Resources (`ResourcesView.tsx`) | ✅ "No resources saved" | No skeleton |
| Calendar Events (`CalendarEventsView.tsx`) | ⚠️ Shows "Add some events…" only when filtered list is empty | No skeleton |
| Semester Setup (`SemesterSetupView.tsx`) | ✅ "No semesters" message | No skeleton |
| Manage Subjects (`ManageSubjectsView.tsx`) | ✅ "No subjects" message | No skeleton |

**Summary:** All views have empty states ✅. No views have skeleton loaders ⚠️ — acceptable for local IndexedDB (data is instant) but the first paint after cold start has a brief flash of empty state while Dexie hydrates.

---

## 3. Accessibility (a11y)

### ARIA Labels
| Issue | Location | Severity |
|-------|----------|----------|
| Icon-only back buttons (ArrowLeft) have **no `aria-label`** on any view — screen readers hear "button" | Every `<header>` in every view (16+ locations) | **High** |
| Icon-only edit/trash buttons in list items have **no `aria-label`** | `NotesView.tsx:406-411`, `DirectoryView.tsx`, `CalendarEventsView.tsx` (2 of 3 have aria-labels ✅), `SemesterSetupView.tsx`, `ManageSubjectsView.tsx` | **High** |
| TabBar buttons have no `aria-label` | `TabBar.tsx:23` — uses visible text labels, so this is OK | ✅ Low |
| Preview/Editor toggle in NotesView has no `aria-label` | `NotesView.tsx:115-129` — has visible text, OK | ✅ Low |

### Focus Management
| Issue | Location | Severity |
|-------|----------|----------|
| **No focus trap in modals/bottom sheets** — Tab key escapes the modal and reaches the background content | `ExamsView.tsx` (Add Exam + Details sheets), `TasksView.tsx` (Create sheet), `NotesView.tsx` (editor view), `TimetableBuilderView.tsx` (pattern form), all import views | **High** |
| **No `Escape` key handler on modals** — only backdrop click dismisses | All 8+ bottom-sheet modals across the app | **High** |
| **No auto-focus** on the first input when a modal opens | All form modals | Medium |
| **No `aria-modal="true"`** on any sheet/modal overlay | All bottom-sheet modals | Medium |
| **No `role="dialog"`** on modal containers | All bottom-sheet modals | Medium |

### Keyboard Navigation
| Issue | Location | Severity |
|-------|----------|----------|
| `TabBar.tsx` is fully keyboard-navigable (buttons, not divs) ✅ | `TabBar.tsx` | ✅ |
| Day strip chips in WeeklyGrid are buttons ✅ | `WeeklyGrid.tsx:48-77` | ✅ |
| Exam cards use `role="button"` on `<div>` (accessible but could be a real `<button>`) | `ExamsView.tsx:170` | Low |
| Task cards are clickable `<div>` elements without `role="button"` or keyboard access | `TasksView.tsx:168-170` — card wrapper has `onClick` but no `role="button"` or `tabIndex` | **Medium** |
| Notes cards have no `onClick` — edit/delete are separate buttons ✅ | `NotesView.tsx:405-412` | ✅ |

### Color Contrast
| Issue | Location | Severity |
|-------|----------|----------|
| `--color-text-tertiary` (#94A3B8) on `--color-bg-primary-dark` (#0B0D12) = 4.6:1 ratio ✅ | `tokens.css` | ✅ |
| `--color-text-secondary-dark` (#94A3B8) on `--color-bg-secondary-dark` (#14161C) = 4.8:1 ✅ | `tokens.css` | ✅ |
| All token colors meet WCAG AA for normal text ✅ | | ✅ |

### Screen Reader
| Issue | Location | Severity |
|-------|----------|----------|
| No `<h1>` on any page — only `<h2>` and `<h3>` | All views | Medium |
| No `aria-live` regions for status updates (e.g., "Task created", "Attendance marked") | All forms | Medium |

---

## 4. Form Validation

### What's validated
| Form | Validation | Location |
|------|-----------|----------|
| Create Task | Title required (`if (!newTitle.trim()) return`) | `TasksView.tsx:39` |
| Create Note | Title required (`if (!editTitle.trim()) return`) | `NotesView.tsx:63` |
| Create Exam | Subject required (`if (!newSubjectId) return`) | `ExamsView.tsx:28` |
| Create Semester | Label, start_date, end_date required | `SemesterSetupView.tsx:41` |
| Create Subject | Code, name, color required | `ManageSubjectsView.tsx:59-63` |
| Create Resource | Title, subject, URL required | `ResourcesView.tsx:50-51` |
| Create Pattern | Subject, day, times, room required | `TimetableBuilderView.tsx` |
| Create Calendar Event | Title, date, type required | `CalendarEventsView.tsx:60-62` |
| Import Timetable | JSON parsed, subjects/patterns array check, subject_code validation | `TimetableImportView.tsx:163-196` |
| Import Calendar | JSON parsed, events array check | `AcademicCalendarImportView.tsx:51-58` |

### What's NOT validated (gaps)
| Form | Missing validation | Severity |
|------|-------------------|----------|
| Timetable pattern start/end time | **No check that start_time < end_time** — could create 10:15→09:00 | **Medium** |
| Task due date | **No check that due date is not in the past** on create | Low |
| Subject code | **No uniqueness check** — two subjects with the same code can coexist | **Medium** |
| Subject code format | **No pattern validation** — could enter arbitrary text | Low |
| Resource URL | **No URL format check** — any string accepted | Low |
| Calendar event date | **No check for past dates** — could add events before semester start | Low |
| Notes tags | No validation on tag format | Low |

### User feedback on validation failures
- All form handlers silently `return` on invalid data — **no error message shown to the user**
- The "required" attribute is only used on the Exam subject select (`ExamsView.tsx:271: required`) — all other forms rely solely on JS validation
- No disabled-state on submit buttons when form is invalid

---

## 5. SEO / Meta Basics

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `<title>Academic OS — Vishvraj</title>` ✅ | **No Open Graph tags** (`og:title`, `og:description`, `og:image`) | Low (PWA) |
| `<meta name="description">` ✅ | **No Twitter Card tags** | Low (PWA) |
| `lang="en"` on `<html>` ✅ | | ✅ |
| `viewport` with `user-scalable=no` ⚠️ | **Prevents pinch-to-zoom** — WCAG 1.4.4 requires user-scalable=yes for accessibility | **Medium** |

---

## 6. Security Headers

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| Vite dev server (no production server in repo) | **No CSP headers** — no `Content-Security-Policy` meta tag or server config | Medium |
| | **No `X-Frame-Options`** | Low (PWA, not embedded in iframes) |
| | **No `X-Content-Type-Options: nosniff`** | Low |
| `fetchPriority: 'low'` on Google Fonts `<link>` reduces load priority | | ✅ |

Note: In a production deployment, these would typically be set by the hosting provider (Vercel, Netlify, etc.) or a CDN, not by Vite. For a local-only PWA, this is acceptable.

---

## 7. Data Backup / Export

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| **Full JSON backup export** via Profile → "Export JSON Backup" (`ProfileView.tsx:22-40`) — exports all tables | **No import/restore from backup** — the exported file is one-way | **High** |
| **Safe database clear** with backup-before-wipe (`ProfileView.tsx:44-76`) — requires typing "DELETE" | **No auto-backup reminder** — user might not export before clearing | Medium |
| Timetable JSON import/export (one-way) | No selective table export (e.g., "export only attendance") | Low |
| Calendar JSON import/export (one-way) | No backup reminder before semester transition | Low |

---

## 8. Logging / Monitoring

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `console.error('[Academic OS] Unhandled error:', ...)` in ErrorBoundary | **No structured logging** — no log levels, no log-to-IndexedDB | Low |
| | **No performance monitoring** (Core Web Vitals, paint timing) | Low |
| | **No error tracking service** (Sentry, LogRocket) | Low (acceptable for personal tool) |
| | Console output is clean — no stray `console.log` calls anywhere ✅ | ✅ |

---

## 9. TypeScript Strictness

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `"strict": true` in `tsconfig.json:5` ✅ | | ✅ |
| `"noImplicitReturns": true` ✅ | | ✅ |
| Zero `@ts-ignore` or `@ts-expect-error` directives ✅ | | ✅ |
| Only 1 non-null assertion: `document.getElementById('root')!` in `main.tsx:6` (safe — always exists) ✅ | | ✅ |
| **6 `any` types remain:** | | |
| `catch (err: any)` in `AcademicCalendarImportView.tsx:66` | Should use `unknown` + type guard | Low |
| `catch (err: any)` in `TimetableImportView.tsx:179` | Should use `unknown` + type guard | Low |
| `as any` in `ResourcesView.tsx:192` — select value cast | Should use a typed union | Low |
| `as any` in `ExamsView.tsx:285` — select value cast | Should use a typed union | Low |
| `as any` in `TasksView.tsx:312` — select value cast | Should use a typed union | Low |
| `Record<string, any[]>` in `ProfileView.tsx:23` — backup object | Reasonable for dynamic backup structure | Acceptable |

---

## 10. Performance

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `useMemo` for attendance calculations ✅ (`useAttendanceMath.ts:10-26`) | | ✅ |
| CSS Modules for component-scoped styles ✅ (3 views) | **Most views use inline styles** — no CSS extraction, no tree-shaking | Low |
| No code splitting — all views are eagerly imported in `App.tsx` | **No lazy loading** — the 16 feature modules all load on startup even though only 1 is visible at a time | **Medium** |
| Google Fonts loaded with `preconnect` + `display=swap` ✅ | | ✅ |
| VitePWA handles asset caching ✅ | | ✅ |
| Service worker caches fonts for 1 year ✅ | | ✅ |
| | **All 40+ lucide-react icons imported individually** — Vite tree-shakes these, so impact is minimal, but could verify bundle size | Low |
| | **No virtual scrolling** for long lists — acceptable given typical data volumes (<100 items) | Low |

---

## 11. PWA Completeness

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| `vite-plugin-pwa` configured ✅ (`vite.config.ts:9-53`) | | ✅ |
| `registerType: 'autoUpdate'` — SW auto-updates ✅ | | ✅ |
| `manifest.json` with `display: standalone`, `orientation: portrait-primary` ✅ | | ✅ |
| Apple iOS PWA meta tags ✅ (`index.html:14-16`) | | ✅ |
| Workbox with font caching ✅ | | ✅ |
| `navigateFallback: 'index.html'` for SPA routing ✅ | | ✅ |
| | **Missing PNG icons** — `manifest.json` references `icon-192.png` and `icon-512.png` but only `icon.svg` exists in `public/icons/` | **High** — install prompt may fail on some devices |
| | **No offline fallback page** — if navigation fails and SW can't serve `index.html`, user sees browser error | Medium |
| | **No install prompt handling** — no "Add to Home Screen" banner or CTA in the UI | Low |
| | **`devOptions.enabled: true`** in vite.config.ts — SW runs in dev mode, but this is only for testing | ✅ (dev only) |
| | **`devOptions.type: 'module'`** — correct for Vite | ✅ |

---

## 12. Data Integrity

| What exists | What's missing | Severity |
|-------------|---------------|----------|
| Soft-delete pattern (`is_deleted: true`) on all tables ✅ | | ✅ |
| Version field on `AttendanceRecord` for edit history tracking ✅ | | ✅ |
| `edit_history` array on attendance records — full audit trail ✅ | | ✅ |
| ID uniqueness via `Date.now()` + table prefix (`task-${Date.now()}`) | **Collision risk on rapid taps** — `Date.now()` gives the same millisecond for double-taps | Low (rare) |
| Seed deduplication by key in `ensureAditCalendarDefaults()` ✅ | | ✅ |
| Semester activation is transactional (deactivate all → activate one) | **Not atomic** — if the browser crashes between deactivation and activation, all semesters could be inactive | Low |
| Timetable import commits subjects + slots together with `bulkAdd` | **Not wrapped in Dexie `transaction()`** — partial failure could leave orphaned subjects without slots | **Medium** |
| No referential integrity enforcement (IndexedDB limitation) | Deleting a subject doesn't cascade to tasks/notes/exams/records — orphaned records silently remain | **Medium** (by design, but noted) |

---

## Summary: Priority Fixes

### 🔴 High Priority
1. **Missing PNG icons** — `public/icons/icon-192.png` and `icon-512.png` don't exist; install prompt will fail
2. **DB operations lack try/catch** — all form handlers can produce unhandled rejections
3. **No focus trap / Escape handler on modals** — a11y blocker for keyboard and screen reader users
4. **No back/restore from backup** — exported JSON is a dead end

### 🟡 Medium Priority
5. **No per-view error boundaries** — a single view crash kills the whole app
6. **Subject code uniqueness not enforced** — duplicate codes break timetable import
7. **Timetable import not transactional** — partial failure risk
8. **`viewport` blocks pinch-to-zoom** — WCAG 1.4.4 violation
9. **No lazy loading** of feature modules — unnecessary bundle on initial load
10. **Icon-only buttons lack `aria-label`** — 16+ back buttons, multiple edit/delete icons

### 🟢 Low Priority
11. `any` types in 5 locations (all low-risk casts)
12. No skeleton loaders (data is fast from IndexedDB)
13. No Open Graph / Twitter Card meta tags
14. No CSP headers (set at deployment layer)
15. No structured logging or error tracking
