# Academic OS — Design System Reference (LOCKED)

> This file is the **single source of truth** for visual design. It was reverse-engineered
> pixel-by-pixel from the reference screenshot (`Screenshot_2026-08-05_112333.png`), which
> shows 8 screens of a student productivity app plus a design-system/style-guide screen
> called **"Academic Core"**. Do not invent new colors, spacing, radii, or components —
> everything needed is documented below. If something isn't covered here, default to the
> nearest documented pattern rather than improvising a new style.

---

## 0. Product Identity

- **Product name:** Academic OS
- **Design system name (shown on its own style-guide screen):** Academic Core
- **Platform pattern:** Mobile-first app (each screen is a narrow phone-width card, ~375–390px
  logical width) with a **fixed bottom tab bar** (4–5 icon+label items). Screens are shown
  side-by-side in the reference as separate app screens, not one continuous page.
- **Overall aesthetic:** Clean "productivity SaaS" look — soft off-white background, pure-white
  rounded cards, thin borders, subtle shadows, a single strong blue as the hero brand color,
  purple/violet and rust-orange as supporting accents, generous rounded corners everywhere,
  small-caps/uppercase micro-labels for metadata, and color-coded status via badges + circular
  progress rings rather than heavy iconography.

---

## 1. Color System

### 1.1 Brand palette (sampled directly from the "Academic Core" swatches)

| Token | Hex (sampled) | Usage |
|---|---|---|
| `color-primary` | `#2563EB` (royal blue) | Primary buttons, active nav icon/label, selected pill/tab background, links, primary chart line, focus rings |
| `color-secondary` | `#7C3AED` (violet) | Secondary accent badges (e.g. "Quiz" exam tag), secondary chart line, secondary icon buttons |
| `color-tertiary` | `#BC4800` (burnt rust/orange) | Sparingly used accent — warning-adjacent tags, one of the icon-button accents, tertiary chart/rule color |
| `color-neutral` | `#64748B` (slate) | Secondary text, muted icons, dividers, disabled/neutral badges |

Each of these 4 swatches is shown in the style guide as a **10-step tint/shade ramp**
(near-black → full saturation → near-white). Generate each ramp the same way (e.g. mix
toward `#000000` for shades, toward `#FFFFFF` for tints) so the whole app can reference
`primary-50` … `primary-900` style tokens:

```
primary-900 (near black-blue) → primary-600 #2563EB (base) → primary-50 (near white-blue)
secondary-900 → secondary-600 #7C3AED (base) → secondary-50
tertiary-900 → tertiary-600 #BC4800 (base) → tertiary-50
neutral-900 → neutral-500 #64748B (base) → neutral-50
```

### 1.2 Surface & structure colors

| Token | Hex (approx, sampled) | Usage |
|---|---|---|
| `bg-page` | `#F1F3F4` | App/page background behind all cards |
| `bg-card` | `#FFFFFF` | Card, list-row, banner surfaces |
| `bg-card-tint` | `#E5EEFF` (light blue-50) | Highlighted/inline sub-cards, e.g. typography specimen tiles in the style guide, "linked to" chip on Notes |
| `border-hairline` | `#E5E7EB` | 1px card borders, dividers between list rows |
| `text-primary` | `#0F172A` (near-black navy) | Headings, titles, primary labels |
| `text-secondary` | `#64748B` | Meta text, timestamps, helper copy |
| `text-muted` | `#94A3B8` | Placeholder text, least-important meta |

### 1.3 Semantic / status colors

Used consistently for risk & status communication (attendance %, task priority, exam type,
alerts). These are soft/pastel **backgrounds** paired with a **saturated foreground** of the
same hue:

| Status | Background (soft) | Foreground / ring / bar (strong) | Where seen |
|---|---|---|---|
| Danger / Critical | `#FBDCD2`–`#FEE2E2` soft pink-red | `#DC2626` / ring sampled `#DE6883` | "Attendance Alert" banner, "CRITICAL" badge, red progress ring, "URGENT" task tag, Friday bar in Absence Heatmap |
| Warning / At-risk | `#FEF3C7` soft amber | `#D97706` / `#F59E0B` | "At Risk" / "Below75% threshold" badge, "starts in 12m" pending pill |
| Success / Safe | `#DCFCE7` soft green | `#16A34A` | "Safe to skip N more" badge, green pulse dot next to course name |
| Info / Neutral-blue | `#DBEAFE` soft blue | `#2563EB` | Default progress rings (88%, 94%, 78%), info banner ("Campus library hours extended"), active tab |

**Rule:** never use a raw saturated color as a large fill. Status colors are always either (a)
a thin ring/bar/left-border stroke, or (b) a small pill badge with soft background + saturated
text. Large surfaces stay white or `bg-page`.

---

## 2. Typography

- **Font family:** **Inter** (explicitly labeled in the style guide's type specimens) for
  everything — headings, body, labels, numbers. Use `font-family: 'Inter', system-ui, sans-serif;`
- **Type scale (3 named styles shown in the style guide, each on a light-blue specimen card
  labeled with the style name top-left and "Inter" top-right):**

| Style | Weight | Approx size | Usage |
|---|---|---|---|
| Headline | 700 (bold) | 24–28px | Screen titles: "Timetable", "Attendance", "Tasks", "Notes", "Exams", "Analytics" |
| Body | 400–500 | 14–15px | Paragraph text, list-item titles, card descriptions |
| Label | 600 (semibold), often uppercase, letter-spacing ~0.05em | 10–11px | Eyebrow/meta text: course codes ("CS301"), date stamps ("WEDNESDAY, OCT 25 · FALL SEMESTER 2024"), section tags ("ATTACHMENTS") |

- Numeric/percentage figures inside progress rings use the Headline weight at a slightly
  smaller size (e.g. 16–18px bold) so they read at a glance.
- Markdown source is shown **unrendered but syntax-highlighted** in the Notes screen: `#` /
  `##` / `###` heading markers and `**bold**` markers are kept literally in the text but the
  heading lines are colored primary blue and bolded; body text is default `text-primary`.

---

## 3. Spacing, Radius & Elevation

- **Card corner radius:** large — ~16–20px ("2xl") on all top-level cards and banners; ~999px
  (full pill) on tabs, badges, chips, and buttons.
- **Card padding:** ~16px internal padding, consistent across card types.
- **Gap between stacked cards:** ~12–16px vertical rhythm.
- **Shadow:** very soft, low-opacity drop shadow on white cards sitting on the page background
  (barely-there elevation, not skeuomorphic) — e.g. `box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05);`
- **Borders:** 1px hairline `border-hairline` (`#E5E7EB`) used on outlined cards/rows in
  addition to (or instead of) shadow — many rows use border-only, no shadow.
- **Icon sizing:** nav bar icons ~22–24px; inline meta icons (clock, pin, calendar) ~12–14px,
  always paired with small label text.

---

## 4. Core Components

### 4.1 Screen header
Pattern used on every screen: small circular avatar/logo icon (top-left, ~24px) OR a small
outline icon, then a **bold Headline title**, then 0–2 right-aligned action icons (search,
filter/sort, bell, calendar, "+", or a text link like "Done"). Directly below the title on some
screens is a Label-style meta line (date/semester).

### 4.2 Segmented pill tabs
A horizontal group of pill buttons inside a light rounded track. **Active pill:** filled dark
navy/black or filled primary blue, white text. **Inactive pills:** transparent, gray/neutral
text. Examples: `Weekly Grid | Daily Stream | Calendar`, `Today | Upcoming | All | Recurring`,
`Upcoming | Past`, `Attendance | Tasks | Academic | Study`.

### 4.3 Circular progress ring
An SVG ring (stroke ~4–5px, rounded linecap) showing a percentage, with the number centered
inside in bold. Ring color is semantic (blue = healthy/default, red = critical, matches the
badge next to it). Used for: overall attendance health ("88% Healthy"), per-subject attendance
% on the Attendance screen.

### 4.4 Alert / info banner
Full-width rounded card, soft-tinted background (pink for danger, blue for info), a small
triangle/info icon + bold title on one line, smaller regular-weight subtext below (or beside).
Info variant may include a trailing "×" dismiss icon and sits pinned near the bottom of a
screen (e.g. "Campus library hours extended").

### 4.5 List / task row
White (or bordered, no-fill) rounded row containing: a leading circular checkbox (empty ring =
incomplete, filled blue check = done) or a colored status dot, a bold title, then a meta row of
small pill tags (course code chip, priority chip like "URGENT" in solid red, a time chip with
clock icon). Some rows include a thin horizontal progress bar beneath the meta row.

### 4.6 Subject/course status card (Attendance screen)
Label-style course code top line, bold subject name, small status sentence below (e.g. "Safe
to skip 2 more" / "Below 75% threshold"), a small colored badge top-right (`CRITICAL`, `At
Risk`) for at-risk items, and a circular % ring anchored right, color-matched to risk level.
At-risk cards additionally get a colored 1–2px left/full border matching the danger color.

### 4.7 Exam card
Card with a **solid colored left edge bar** (4px) whose color encodes exam type: violet =
Quiz, magenta/pink = Midterm, blue = Practical. Header row: bold course code + small rounded
type-badge pill (colored to match the left bar, soft bg / saturated text), right-aligned
countdown pill ("in 3 days") in a muted gray pill. Subject name below in regular body text, a
thin divider, then a footer meta row: calendar icon + date/time, pin/room icon + location.
Completed exams move to a separate "Completed" section, rendered in muted/grayscale with a
"PASSED" pill.

### 4.8 Notes editor
Top pill chip "Linked to [Exam] ›" in soft violet. Raw markdown-style text is displayed with
heading lines (`#`, `##`, `###`) colored primary blue and bold; `##` / `###` heading markers
and `**bold**` markers are kept literally in the text but the heading lines are colored primary
blue and bolded; body text is default `text-primary`. An **Attachments** section label
(uppercase, Label style) is followed by a row of file chips — each a bordered rounded rectangle
with a file-type icon, filename (bold, truncated), and file size (muted, small) underneath.

### 4.9 Analytics widgets
- **Line chart card:** title + "Last 6 weeks" meta top-right, multi-series line chart (3 thin
  lines, colors = primary blue, secondary violet/magenta, and a third accent — no fill under
  the lines, light gridlines, small axis labels), a color-key legend row of small square swatch
  + course code beneath the chart.
- **Heatmap-as-bars card:** vertical list of day labels (MON–FRI) each paired with a horizontal
  bar (rounded, track = light lavender `#E5E7EB`/lavender-50, fill = red intensity scaled to
  value — pale pink for low %, saturated red for the worst day) and a right-aligned percentage.
- **Simple ranked list card:** numbered/leading icon + label + right-aligned soft-colored count
  badge (e.g. "2 Cancelled").

### 4.10 Bottom tab bar
Fixed, white background, hairline top border, 4–5 items evenly spaced, each item = icon above
small label. **Active:** primary blue icon + blue label (icon may be filled/solid variant).
**Inactive:** neutral gray outline icon + gray label. Tab sets differ slightly per section
(Home/Schedule/Tasks/Profile on most screens; Schedule/Attendance/Courses/Profile on the
Attendance screen) — treat the tab bar as contextual to the current section, not fully global.

---

## 5. "Academic Core" Style-Guide Screen (meta-reference)

This screen is itself part of the product (a live design-tokens page) and should be built as a
real screen too:

1. **Color ramp cards** — one card per brand color (Primary/Secondary/Tertiary/Neutral): solid
   color header block with the name (white text, top-left) and hex code (white text, top-right,
   monospace-ish small), followed immediately by a 9–10 step gradient strip (dark→light) of that
   hue below it, all inside one rounded card.
2. **Typography specimen cards** — 3 stacked cards on a light blue-tinted (`bg-card-tint`)
   background: each shows the style name top-left + "Inter" top-right in small muted Label
   text, and a large bold "Aa" glyph centered/left-aligned beneath. One per type style
   (Headline / Body / Label).
3. **Button specimens** — 2×2 grid: **Primary** (solid blue pill, white text), **Secondary**
   (pale blue pill, blue text), **Inverted** (solid navy/near-black pill, white text),
   **Outlined** (white pill, thin border, dark text).
4. **Search input specimen** — rounded light-gray input with a leading search icon and
   "Search" placeholder.
5. **Divider/rule specimens** — 3 horizontal colored rules stacked (primary blue, secondary
   violet, tertiary rust), demonstrating border/rule tokens at different weights.
6. **Nav/icon-button row specimen** — a filled circular blue icon button (avatar/home glyph)
   next to plain outline icon buttons (search, profile) — showing the "active vs inactive" icon
   button treatment.
7. **Small action button specimens** — a solid-color square icon button (rust orange bg, pencil
   icon) and a pill button with icon + text label ("Label", blue bg, pencil icon).
8. **Semantic icon-button row** — 4 small circular solid icon buttons, one per brand/status hue
   (blue = tool/settings, violet = award/badge, rust = shield, red = bell/alert) — the canonical
   set of "colored circular icon button" components used elsewhere in badges/avatars.

---

## 6. Do / Don't (for implementation fidelity)

**Do:**
- Keep the background a flat light gray (`#F1F3F4`) and let white cards do all the contrast work.
- Use pill shapes (`border-radius: 999px`) for every tab, badge, tag, and button.
- Pair every status color with both a soft background AND a matching ring/bar/left-border —
  never color text alone.
- Keep icons small, thin-stroke, and outline-style except for the small set of solid circular
  "brand" icon buttons defined in the style guide.
- Use uppercase Label-style micro-text for all metadata (course codes, dates, section headers).

**Don't:**
- Don't introduce gradients on cards or buttons (only the style-guide's own color-ramp swatches
  use a gradient, and that's a documentation device, not a UI pattern).
- Don't use heavy/dark shadows — elevation is barely-there.
- Don't mix in new accent colors outside Primary/Secondary/Tertiary/Neutral + the 4 semantic
  status colors above.
- Don't render markdown in Notes as fully "rendered" rich text — keep the raw `#`/`**`
  characters visible per the reference (styled, not hidden).

---

## 7. Suggested Tailwind token mapping (optional, for Claude Code)

```css
:root {
  --color-primary: #2563EB;
  --color-secondary: #7C3AED;
  --color-tertiary: #BC4800;
  --color-neutral: #64748B;

  --color-danger-bg: #FEE2E2;
  --color-danger-fg: #DC2626;
  --color-warning-bg: #FEF3C7;
  --color-warning-fg: #D97706;
  --color-success-bg: #DCFCE7;
  --color-success-fg: #16A34A;
  --color-info-bg: #DBEAFE;
  --color-info-fg: #2563EB;

  --bg-page: #F1F3F4;
  --bg-card: #FFFFFF;
  --bg-card-tint: #E5EEFF;
  --border-hairline: #E5E7EB;

  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;

  --radius-card: 18px;
  --radius-pill: 999px;
  --font-family: 'Inter', system-ui, sans-serif;
}
```

---

*Source: pixel-sampled from the user's reference screenshot showing 8 Academic OS screens
(Timetable, Home, Attendance, Tasks, Notes, Exams, Analytics) plus the "Academic Core"
style-guide screen. Treat this document as locked — implementations should match it exactly
rather than reinterpreting the aesthetic.*
