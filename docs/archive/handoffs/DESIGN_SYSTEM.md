# Academic OS — Canonical Design System Reference

> **Single Source of Truth** for the Academic OS UI design system.
> Aligned with `docs/design/ACADEMIC_OS_STITCH_DESIGN_SPEC.md` and Stitch Project ID `10253714570536683011`.

---

## 1. Design System Foundations & Principles

- **Product Identity:** Academic OS — Modern Student Academic Management System.
- **Design Language:** Material 3 Tonal Surface Container Layering + Hairline Outline Variants.
- **Aesthetic:** Editorial academic clarity, deep navy brand accent, crisp hairline boundaries, high-legibility typography, subtle micro-interactions (150–250ms), and 100% Light/Dark theme parity.

---

## 2. Color System & Tonal Surfaces

### 2.1 Brand & Core Tokens

| Token | Light Theme Value | Dark Theme Value | Usage |
|---|---|---|---|
| `--primary` | `#001e4c` (Deep Navy) | `#90b0ee` (Light Slate Blue) | Hero brand color, primary actions, active state text/icons |
| `--on-primary` | `#ffffff` | `#001e4c` | Text/icons on primary fill |
| `--primary-container` | `#1b3462` | `#1e3a8a` | Subdued primary fill, active tabs/chips, hero card border |
| `--on-primary-container` | `#879dd2` | `#90b0ee` | Text/icons on primary container fill |

### 2.2 Tonal Surface Layering (Material 3 Structure)

| Surface Layer | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--bg-page` / `--surface` | `#faf9f8` | `#0f172a` | App canvas background |
| `--surface-container-lowest` | `#ffffff` | `#1e293b` | Main elevated cards, dialog panels, sheet backgrounds |
| `--surface-container-low` | `#f4f3f2` | `#182232` | Nested cards, pill tab tracks, icon button circles |
| `--surface-container` | `#eeeeed` | `#334155` | Secondary inputs, elevated card hover states |
| `--surface-container-high` | `#e9e8e7` | `#475569` | Skeleton shimmer base, progress tracks, dividers |
| `--outline-variant` | `#c4c6d1` | `#334155` | Hairline card borders, list dividers |

### 2.3 Semantic / Status Palette

| Status | Fill / Container | Text / Icon Foreground | Application |
|---|---|---|---|
| **Danger / Critical** | `var(--error-container)` (`#ffdad6` / `#93000a`) | `var(--on-error-container)` (`#410002` / `#ffdad6`) | Attendance critical alerts, urgent priorities, destructive actions |
| **Warning / At-Risk** | `var(--color-warning-bg)` (`#fef3c7`) | `var(--color-warning-fg)` (`#d97706`) | At-risk attendance badges, upcoming exam warnings |
| **Success / Safe** | `var(--color-success-bg)` (`#dcfce7`) | `var(--success-attendance)` (`#16a34a`) | Safe attendance status, completed tasks/exams, check-in success |
| **Info / Neutral** | `var(--color-info-bg)` (`#dbeafe`) | `var(--color-info-fg)` (`#2563eb`) | General info banners, default progress ring fills |

---

## 3. Typography System

- **Primary Font Family:** **Hanken Grotesk** (`var(--font-primary)`) for headings, body text, button labels, and general copy.
- **Monospace Font Family:** **JetBrains Mono** (`var(--font-mono)`) for metadata micro-caps, timestamps, course codes (`CS301`), date tags, and 404 hash displays.

### 3.1 Type Scale

| Named Token | Size | Weight | Line Height | Transform | Usage |
|---|---|---|---|---|---|
| `--text-xl` | 32px / 2rem | 600–800 | 1.2 | Normal | Screen headers ("Today", "Timetable", "Tasks") |
| `--text-lg` | 24px / 1.5rem | 600–700 | 1.3 | Normal | Card titles, modal headers, stat tile numbers |
| `--text-base` | 16px / 1rem | 400–600 | 1.5 | Normal | Body copy, list item titles, form inputs |
| `--text-sm` | 14px / 0.875rem | 400–600 | 1.4 | Normal | Subtext, helper notes, button labels |
| `--text-xs` | 12px / 0.75rem | 500–600 | 1.4 | Normal | Small badge labels, secondary meta |
| `--text-2xs` | 11px / 0.6875rem | 700 | 1.2 | Uppercase | Eyebrow overlines, date tags, code chips (`CS301`) |

---

## 4. Spacing, Geometry & Radii

- **Card Radius (`--radius-card`):** `12px`
- **Modal / Sheet Radius (`--radius-xl`):** `16px`
- **Pill / Chip Radius (`--radius-full`):** `9999px`
- **Touch Target Requirement:** All interactive controls maintain a minimum touch target height/width of **44px**.
- **Hairline Borders:** `1px solid var(--outline-variant)`.
- **Card Shadows:** Soft, subtle elevation (`var(--shadow-card)`: `0 1px 3px rgba(0, 0, 0, 0.05)`).

---

## 5. Core Components & UI Primitives

### 5.1 Buttons (`Button.tsx`)
- Variants: `primary`, `ghost`, `subtle`, `danger`, `success`.
- Sizes: `sm` (44px), `md` (44px), `lg` (52px). Full-width (`fullWidth`) support.
- Built-in loading spinner (`loading`) with `aria-busy` and non-layout-shifting feedback.

### 5.2 Cards (`Card.tsx`)
- Variants: `default`, `hero` (thick primary left accent border), `accent` (thick left border with low surface background), `raised` (elevated shadow), `surfaceLow`.
- Optional `liftable` prop adding subtle 120ms press scale (`scale(0.985)`).

### 5.3 BottomSheet (`BottomSheet.tsx`)
- Modal sheet overlay (`role="dialog"`, `aria-modal="true"`) with backdrop blur (`backdrop-filter: blur(8px)`).
- Complete focus trapping, Escape key listener, auto-focus on first control, and focus restoration upon closing.

### 5.4 SegmentedControl (`SegmentedControl.tsx`)
- Accessible tablist (`role="tablist"`) track housing option tabs (`role="tab"`, `aria-selected`).
- Smooth 150ms background and text color transition.

### 5.5 Filter Chips (`Chip.tsx`)
- Toggle buttons (`role="button"`, `aria-pressed`) with 44px min height for filter filtering.

---

## 6. Global System States

1. **Loading / Skeleton:** `LoadingState.tsx` and `.skeleton` shimmer placeholders (1.4s ease animation). Under `prefers-reduced-motion: reduce`, skeleton renders static solid surface container low background (`var(--surface-container-low)`).
2. **Empty State:** `emptyState` card with 64px circular orb icon (`.emptyOrb`), clear title, and action button.
3. **Error / Recovery:** `ErrorBoundary.tsx` catching runtime errors with branded recovery option ("Return to Today").
4. **Offline Banner:** `OfflineBanner.tsx` showing connection status and offline-first IndexedDB availability.
5. **Toast Notifications:** Stacked polite live regions (`role="status"`, `aria-live="polite"`) with success, error, and info variants.
6. **404 View:** `NotFoundView.tsx` with compass brand mark, 404 tag, requested hash code block, and primary navigation buttons.

---

## 7. Motion & Reduced Motion Rules

- **Default Motion:** Fast, subtle micro-animations (150–250ms `cubic-bezier(0.2, 0, 0, 1)`).
- **Hardware Acceleration:** Uses `transform` and `opacity` exclusively to prevent repaint shifts.
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, all transitions and keyframe animations freeze instantly (`animation-duration: 0.01ms !important`, `animation: none !important`), without removing state visibility or focus accessibility.
