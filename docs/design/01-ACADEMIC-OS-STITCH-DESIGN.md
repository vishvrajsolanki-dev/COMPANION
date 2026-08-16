# Academic OS Stitch Design Specification

> **Status:** Final Implementation Contract & Design Validation  
> **Canonical Visual Source of Truth:** Stitch Project `Academic OS Design System` (`10253714570536683011`)  
> **Deprecation Notice:** Project `Student Academic Dashboard` (`8983278608477554076`) is LEGACY and MUST NOT be used for visual decisions.  
> **Architecture Constraint:** Custom React/Vite/CSS implementation only. NO third-party UI frameworks (No Material UI, No Tailwind, No shadcn).

---

## Authority

1. **Canonical Visual Source of Truth**:
   - The Stitch project **`Academic OS Design System` (Project ID: `10253714570536683011`)** is the newly created, approved redesign and serves as the **PRIMARY and CANONICAL visual source of truth**.
2. **Legacy Project Deprecation**:
   - The Stitch project **`Student Academic Dashboard` (Project ID: `8983278608477554076`)** represents an older/legacy iteration.
   - **Do NOT** use `Student Academic Dashboard` for visual decisions.
   - **Do NOT** merge visual languages, color palettes, typography, spacing, or component styles from the legacy project into the new implementation.
   - The legacy project may only be referenced for historical feature coverage and functional requirements.
3. **Conflict Resolution Rule**:
   - In any visual or architectural conflict, **`Academic OS Design System` (`10253714570536683011`) ALWAYS WINS**.

---

## Architecture & Framework Rules

1. **Custom Implementation Contract**:
   - The application implementation MUST strictly use the existing custom React, Vite, and Vanilla CSS module architecture (`src/components/`, `src/features/`, `src/index.css`).
   - **DO NOT** install, adopt, or import third-party UI libraries (such as Material UI, Tailwind CSS, shadcn/ui, or Radix UI).
2. **Semantic Semantic Token Usage**:
   - Material-style surface container token names (`surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`) are used **conceptually as custom CSS variables** (`var(--surface-container)`).
   - Using these token names does **NOT** imply adoption of Material 3 component libraries.

---

## Design Principles

1. **Quiet Luxury Academic Aesthetic**:
   - Designed for focused undergraduate productivity. Avoids frantic, gamified UI elements.
   - Employs a calm, editorial feel mimicking high-end physical stationery and contemporary architectural spaces.
2. **Tonal Surface Container Hierarchy**:
   - Surface elevation is established through subtle tonal shifts (`surface`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`) rather than heavy drop shadows.
3. **Hairline Outlines & Restrained Accents**:
   - Precise 1px hairline borders (`outline-variant`) define element boundaries cleanly.
   - Deep navy blue (`primary`) and indigo (`secondary`) accents are reserved strictly for active states, key interactive controls, and progress indicators.
4. **Structured Information Density**:
   - High data density optimized for study management, timetable visualization, and academic progress tracking without visual noise.

---

## Token System & Source Validation

### Data Classification Summary
- **CONFIRMED FROM STITCH**: Color hex values, typography definitions, spacing units, border radius scales, surface container mappings, and component guidelines extracted directly from Stitch Design System Manifest v3 (`assets/09dacb86baa14e1a80d435ae54d20694`).
- **INFERRED**: Dark mode surface container mappings, smooth transition timing curves, safe-area bottom padding rules.
- **UNCERTAIN**: None. Font family hierarchy has been fully resolved via v3 manifest validation.

### Token Validation Table

| Category | Status | Canonical Value / Specification | Source Traceability |
|---|---|---|---|
| **Color: Base Canvas** | CONFIRMED FROM STITCH | `#faf9f8` (Warm Neutral) | Manifest v3 (`assets/09dacb86...`) |
| **Color: Surface Lowest** | CONFIRMED FROM STITCH | `#ffffff` (Pure White cards) | Manifest v3 |
| **Color: Surface Low** | CONFIRMED FROM STITCH | `#f4f3f2` (Utility cards / sidebars) | Manifest v3 |
| **Color: Surface Container** | CONFIRMED FROM STITCH | `#eeeeed` (Nested item containers) | Manifest v3 |
| **Color: Surface High** | CONFIRMED FROM STITCH | `#e9e8e7` (Hover states) | Manifest v3 |
| **Color: Surface Highest** | CONFIRMED FROM STITCH | `#e3e2e1` (Progress tracks) | Manifest v3 |
| **Color: Primary** | CONFIRMED FROM STITCH | `#001e4c` (Deep Navy) | Manifest v3 |
| **Color: Primary Container** | CONFIRMED FROM STITCH | `#1b3462` (Active nav pill / 4px card accent border) | Manifest v3 |
| **Color: On Primary** | CONFIRMED FROM STITCH | `#ffffff` | Manifest v3 |
| **Color: Secondary** | CONFIRMED FROM STITCH | `#5a54a4` (Indigo Accent) | Manifest v3 |
| **Color: Outline Variant** | CONFIRMED FROM STITCH | `#c4c6d1` (1px Hairline borders) | Manifest v3 |
| **Color: Error / Due** | CONFIRMED FROM STITCH | `#ba1a1a` (Overdue alerts) | Manifest v3 |
| **Typography: Primary** | CONFIRMED FROM STITCH | `Hanken Grotesk` (Display, Headlines, Body) | Manifest v3 |
| **Typography: Metadata** | CONFIRMED FROM STITCH | `JetBrains Mono` (`label-caps`, 11px uppercase) | Manifest v3 |
| **Spacing: Base Unit** | CONFIRMED FROM STITCH | `4px` grid | Manifest v3 |
| **Spacing: Stack Tokens** | CONFIRMED FROM STITCH | `stack-sm`: 8px, `stack-md`: 16px, `stack-lg`: 32px | Manifest v3 |
| **Spacing: Gutters** | CONFIRMED FROM STITCH | Mobile: 16px, Tablet: 24px, Desktop: 32px | Manifest v3 |
| **Radius: Shape Scale** | CONFIRMED FROM STITCH | `sm`: 4px, `md`: 8px, `lg`: 12px, `xl`: 16px, `full`: 9999px | Manifest v3 |
| **Border: Containers** | CONFIRMED FROM STITCH | `1px solid #c4c6d1` (`outline-variant`) | Manifest v3 |
| **Border: Card Accents** | CONFIRMED FROM STITCH | `4px solid #1b3462` (Left accent on hero/active cards) | Manifest v3 |
| **Elevation: Depth** | CONFIRMED FROM STITCH | Tonal layering Level 0–3, `shadow-sm` for active lift | Manifest v3 |
| **Navigation: Desktop** | CONFIRMED FROM STITCH | Left drawer sidebar (`256px` width) | Manifest v3 & Screen `bdffce72...` |
| **Navigation: Mobile** | CONFIRMED FROM STITCH | 4-item bottom tab bar (`64px` height) | Manifest v3 & Mobile screens |
| **Motion: Transitions** | INFERRED | `200ms - 250ms` `cubic-bezier(0.4, 0.0, 0.2, 1)` | Standard Web Guidelines |

---

## Font Validation & Decision

### Font Inspection Analysis
- **CONFIRMED FONT (Canonical Source of Truth)**:
  - **`Hanken Grotesk`**: Primary font family for Display, Headlines, Subheadings, Body text, and Numeric stats.
  - **`JetBrains Mono`**: Technical metadata font for `label-caps` (11px, 600 weight, uppercase, tracking `0.08em`), timetable slot codes, and system tags.
  - **Source**: Explicitly specified in the latest Design System Manifest v3 (`assets/09dacb86baa14e1a80d435ae54d20694`) of project `10253714570536683011`.
- **HISTORICAL/LEGACY FONT**:
  - **`Inter`**: Used in initial `v1` design system prototypes before the final `v3` brand identity was established.
- **Rationale for Difference**:
  - The design system evolved historically from initial `Inter` prototypes (`v1`) to the refined, approved `Hanken Grotesk` + `JetBrains Mono` typography system (`v3`).
  - **Decision**: `Hanken Grotesk` and `JetBrains Mono` are the confirmed, authoritative font families for Academic OS.

---

## Light Theme Tokens (CSS Custom Properties)

```css
:root {
  /* Canvas & Base Surfaces */
  --background: #faf9f8;
  --surface: #faf9f8;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f4f3f2;
  --surface-container: #eeeeed;
  --surface-container-high: #e9e8e7;
  --surface-container-highest: #e3e2e1;
  
  /* Text & Content */
  --on-surface: #1a1c1c;
  --on-surface-variant: #444750;
  
  /* Primary & Accent Branding */
  --primary: #001e4c;
  --on-primary: #ffffff;
  --primary-container: #1b3462;
  --on-primary-container: #879dd2;
  --secondary: #5a54a4;
  --secondary-container: #ada7fe;
  
  /* Outlines & Borders */
  --outline: #747781;
  --outline-variant: #c4c6d1;
  
  /* Functional & Status */
  --error: #ba1a1a;
  --error-container: #ffdad6;
  --on-error-container: #93000a;
  --success-attendance: #0f336d;
  
  /* Typography Families */
  --font-primary: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing Scale */
  --spacing-unit: 4px;
  --stack-sm: 8px;
  --stack-md: 16px;
  --stack-lg: 32px;
  --gutter-mobile: 16px;
  --gutter-tablet: 24px;
  --gutter-desktop: 32px;
  
  /* Shape Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

---

## Dark Theme Tokens (CSS Custom Properties)

```css
.dark {
  --background: #0f172a;
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

## Component System Specifications

1. **Buttons**:
   - Height: `44px` touch-accessible target.
   - Primary Fill: Solid `var(--primary)` (`#001e4c`) with `var(--on-primary)` text.
   - Secondary Fill: `var(--surface-container-lowest)` with `1px solid var(--outline-variant)` border.
2. **Cards**:
   - Minimum padding: `16px` (`var(--stack-md)`).
   - Border: `1px solid var(--outline-variant)`.
   - Hero Accent Cards: Feature a `4px` left border in `var(--primary-container)` (`#1b3462`).
3. **Inputs & Form Fields**:
   - Height: `44px`. Border: `1px solid var(--outline-variant)`.
   - Focus state: `2px solid var(--primary)` ring.
   - Field Labels: Persistent visible labels using `label-caps` (`JetBrains Mono`, 11px uppercase, tracking `0.08em`).
4. **Navigation**:
   - Mobile: Persistent bottom bar (`64px` height, 4 key tabs: `Today`, `Plan`, `Study`, `Account`). Active tab highlighted with a primary pill fill and active dot indicator.
   - Desktop: Left drawer sidebar (`256px` width, 16px horizontal padding per nav item).

---

## Canonical Screen Specifications

### Validated Canonical Screens List (Project ID: `10253714570536683011`)

| Module / Screen Name | Canonical Stitch Screen ID | Mode | Viewport | Validation Rationale |
|---|---|---|---|---|
| **App Shell (Desktop)** | `bdffce727f164586ba7e69ad23d7d0c9` | Light | Desktop (1280px) | **Canonical Desktop Shell (Refined)** |
| **Today (Light)** | `0f5e4d00c6f44e31bca196d955e74848` | Light | Mobile (390px) | **Canonical Today View (Refined Light)** |
| **Today (Dark)** | `5bc8c0ad02ff4bdb8027e493427a7ea9` | Dark | Mobile (390px) | **Canonical Today View (Refined Dark)** |
| **Plan: Timetable (Light)** | `fc3c825038c043bbb3dd0d4daee0572f` | Light | Mobile (390px) | **Canonical Timetable (Refined Light)** |
| **Plan: Timetable (Dark)** | `2d72213e1136479a98571d8b87b3da57` | Dark | Mobile (390px) | **Canonical Timetable (Refined Dark)** |
| **Plan: Timetable (Desktop)** | `272f3accade04e35b2c9c2106bbbe8a3` | Light | Desktop (1280px) | **Canonical Desktop Timetable Grid** |
| **Timetable Builder** | `4221350f5cb24c278f1c80adada766e2` | Light | Mobile (390px) | **Canonical Step 1 Timetable Builder** |
| **Plan: Calendar** | `fa35a35c70634a829a0fdaf6ddf8fc58` | Light | Mobile (390px) | **Canonical Calendar (Refined Light)** |
| **Plan: Semester** | `3e75f2bcbe354f07a53f0b632155b026` | Light | Mobile (390px) | **Canonical Semester Manager (Refined)** |
| **Plan: Subjects** | `0e3986e24d7b479ebf5c46687e73b507` | Light | Mobile (390px) | **Canonical Subjects Manager (Refined)** |
| **Study Hub (Light)** | `eceb0db00bc0435388fc319c7747a9d3` | Light | Mobile (390px) | **Canonical Study Hub (Refined Light)** |
| **Study Hub (Dark)** | `a0d41db844424576adc243c045911f9f` | Dark | Mobile (390px) | **Canonical Study Hub (Refined Dark)** |
| **Study Hub (Desktop)** | `3301c33b88d144759b4bbfaf15a7d9cb` | Light | Desktop (1280px) | **Canonical Desktop Study Hub (Refined)** |
| **Tasks (Refined)** | `796f3053bbf446a787245c9ff7061ba4` | Light | Mobile (390px) | **Canonical Tasks List (Refined Light)** |
| **Notes List** | `3781624b823846d28496f0089249fa47` | Light | Mobile (390px) | **Canonical Notes List (Refined Light)** |
| **Note Editor** | `eacc431494f24fa6a1725fd6c62e94d3` | Light | Mobile (390px) | **Canonical Note Editor (Refined Light)** |
| **Exams List (Light)** | `009a37f133774ede979700acc0587233` | Light | Mobile (390px) | **Canonical Exams List (Refined Light)** |
| **Exams List (Dark)** | `69b2fed506d540f6840e49da090ea2f2` | Dark | Mobile (390px) | **Canonical Exams List (Refined Dark)** |
| **Create Exam** | `6c124f6095414b2aaf57017bbdead9e9` | Light | Mobile (390px) | **Canonical Create Exam Flow** |
| **Resources** | `99de798e1cea468c8efe475216542456` | Light | Mobile (390px) | **Canonical Resources (Refined Light)** |
| **Faculty Directory** | `6b52b5f4375e435098c1b97abd0a340f` | Light | Mobile (390px) | **Canonical Faculty Directory** |
| **Analytics (Light)** | `9dd404bfe13046c2a87d0a49b0d02b79` | Light | Mobile (390px) | **Canonical Analytics (Refined Light)** |
| **Analytics (Dark)** | `dde126e844cb443e8820bb2e8cfcf47c` | Dark | Mobile (390px) | **Canonical Analytics (Refined Dark)** |
| **Analytics (Desktop)** | `6ffeaa0b13ce4fefb762b9c3e98e2787` | Light | Desktop (1280px) | **Canonical Desktop Analytics (Refined)** |
| **Account (Light)** | `2e52094a4c9040d9b7614e46ebd8dfcb` | Light | Mobile (390px) | **Canonical Account (Refined Light)** |
| **Account (Dark)** | `8891f024a80b4497b1c8a7eef468ca50` | Dark | Mobile (390px) | **Canonical Account (Refined Dark)** |
| **Account (Desktop)** | `4bc5fd652d6149e78c7178f496670056` | Light | Desktop (1280px) | **Canonical Desktop Account (Refined)** |
| **Data & Sync** | `2328d488f4024f07a322a84ecf1c22ba` | Light | Mobile (390px) | **Canonical Data & Sync Panel** |
| **Appearance** | `e1094310a4e941138fbe801cdd9e7a78` | Light | Mobile (390px) | **Canonical Appearance Settings** |
| **Administration** | `2f5f830b294d43c4a42dfa63f50ff9f3` | Light | Mobile (390px) | **Canonical Admin Portal (Refined)** |
| **Admin Authorized** | `b9c2a49f9e264f6e92fe23292efc7ee4` | Light | Mobile (390px) | **Canonical Authorized Admin View** |
| **Activation (Light)** | `0295d40f283d4f4d9436d8704ea0b846` | Light | Mobile (390px) | **Canonical Light Activation (Corrected)** |
| **Activation (Dark)** | `898283fb491e41b3a1368cebea6e8b46` | Dark | Mobile (390px) | **Canonical Dark Activation (Master)** |

---

## Global State System

1. **Skeletons & Loading State**: `5efa1a9cbdfc4d42ba6ef44250d060c9` (Light) & `e7ecc155b434460694d8645871709a3b` (Dark).
   - Animated shimmer fill using `var(--surface-container-high)` (`#e9e8e7`).
2. **Empty States**: `e87e1b4a4d304b369d23781b8adf8537`.
   - Subtle illustrations and clear action buttons for empty timetable slots, no tasks, and search zero-results.
3. **Feedback & Confirmations**: `bec47b5d5fd54450b609ec29de40ef14`.
   - Action feedback toasts, inline alert banners, and confirmation dialogs.
4. **Errors & Recovery**: `18bf2f8f289048d1bbb79d531eacd221`.
   - Inline field error messaging, offline recovery banners, and network retry flows.

---

## Existing React Repository Mapping

| Existing React Component | Status | Action & Target Path | Notes |
|---|---|---|---|
| `src/components/layout/TabBar.tsx` | **REFACTOR** | `src/components/layout/TabBar.tsx` | Refactor to 4-item navigation (`Today`, `Plan`, `Study`, `Account`) with active dot indicator |
| `src/components/ui/GlassButton.tsx` | **REPLACE** | `src/components/ui/Button.tsx` | Replace glassmorphism with high-contrast navy primary / hairline secondary button |
| `src/components/ui/GlassCard.tsx` | **REPLACE** | `src/components/ui/Card.tsx` | Replace glass effect with surface container layering & hairline `outline-variant` border |
| `src/components/ui/ProgressRing.tsx` | **REFACTOR** | `src/components/ui/ProgressRing.tsx` | Update stroke width to 4px with rounded caps and 10% opacity track |
| `src/components/ui/Skeleton.tsx` | **REFACTOR** | `src/components/ui/Skeleton.tsx` | Update to match `5efa1a9c...` global skeleton specifications |
| `src/components/ui/Toast.tsx` | **REFACTOR** | `src/components/ui/Toast.tsx` | Align styling with `bec47b5d...` global feedback specifications |
| `src/features/dashboard/QuietDashboard.tsx` | **REFACTOR** | `src/features/today/TodayView.tsx` | Align with canonical Today screens (`0f5e4d00...` / `5bc8c0ad...`) |
| `src/features/timetable/WeeklyGrid.tsx` | **REFACTOR** | `src/features/timetable/WeeklyGrid.tsx` | Align with `fc3c8250...` / `272f3acc...` timetable grid specs |
| `src/features/notes/NotesView.tsx` | **REFACTOR** | `src/features/notes/NotesView.tsx` | Update to match `3781624b...` & `eacc4314...` note editor layout |
| `src/features/exams/ExamsView.tsx` | **REFACTOR** | `src/features/exams/ExamsView.tsx` | Update to match `009a37f1...` & `6c124f60...` exam manager layout |

---

## Stitch Source Traceability

- **Project Name**: `Academic OS Design System`
- **Project ID**: `10253714570536683011`
- **Design System Manifests**: `assets/09dacb86baa14e1a80d435ae54d20694` (v3) & `assets/8c6d6ec32cca4593822f37582c6bd67f` (v1)
