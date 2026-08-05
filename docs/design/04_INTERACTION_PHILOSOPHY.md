# Interaction Philosophy & Motion Architecture — Student Academic OS

**Document ID:** `04_INTERACTION_PHILOSOPHY`  
**Author:** Head of Product Design  
**Status:** Approved Discovery Report  
**Primary References:** [Student_OS_PRD.md §11, §27](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md), [05_INFORMATION_ARCHITECTURE.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#3-responsive-navigation--routing-philosophy), [09_FRONTEND_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#5-keyboard-navigation--accessibility-command-palette)  
**Target Audience:** UX Designers, Frontend Engineers, Motion Designers  

---

## 1. Interaction Paradigm Overview

**Student Academic OS** combines **Search-First Speed** with **Ergonomic Ergonomics**. The interaction system adapts dynamically based on device context:
- **Mobile PWA (Thumb-Reach Ergonomics):** 5-Tab Bottom Navigation Bar + Dismissible Quick-Capture FAB + Swipe Gestures.
- **Desktop PWA (Keyboard Velocity):** Collapsible Left Sidebar + Command Palette (`Cmd+K`) + Rich Keyboard Shortcuts.

---

## 2. Navigation Ergonomics (Sidebar vs. Bottom Bar)

```
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│        MOBILE PWA: BOTTOM BAR (5 TABS)       │    │      DESKTOP PWA: SIDEBAR + COMMAND PALETTE  │
│ [🏠 Home] [📅 Schedule] [📊 Att] [📝 Notes] [⚙️ More]│    │ • Left Collapsible Rail (Dashboard, Schedule) │
│ • Height: 64px with blur backdrop            │    │ • Cmd+K Command Palette centered top         │
│ • Thumb-zone safe bounds                     │    │ • Split-view editor drawers                  │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

---

## 3. Quick-Capture FAB (Floating Action Button)

- **Positioning:** Bottom-right floating button (`bottom: 80px, right: 20px` on mobile PWA).
- **Behavior:** Tapping opens a quick-capture sheet for instant text, voice (Wispr Flow), or attachment capture ([04_USER_FLOWS.md §Flow 07](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-07-notes-engine-multi-modal-quick-capture--voice-wispr-flow)).
- **Dismissibility:** Non-intrusive; auto-hides when scrolling down long lists to preserve screen real estate.

---

## 4. Command Palette (`Cmd+K` / `Ctrl+K`)

- **Search-First Paradigm:** Hitting `Cmd+K` opens a global fuzzy search modal powered by MiniSearch.
- **Instant Actions:** Enables students to jump routes, search notes, mark attendance, or export JSON without touching the mouse ([05_INFORMATION_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#6-search--command-palette-taxonomy-cmdk)).

---

## 5. Keyboard Shortcuts & Gestures

| Trigger | Shortcut / Gesture | Action Executed |
| :--- | :--- | :--- |
| **Command Palette** | `Cmd + K` / `Ctrl + K` | Opens global fuzzy search modal |
| **Quick Attendance** | `Alt + A` | Opens quick-mark sheet for active slot |
| **New Note** | `Alt + N` | Creates new Markdown note in active subject |
| **Swipe Left (Mobile)**| Swipe left on Lecture Slot | Quick-mark slot `Present` |
| **Swipe Right (Mobile)**| Swipe right on Lecture Slot | Quick-mark slot `Absent` |
| **Drag & Drop** | Drag note to task | Cross-links note to task entity |

---

## 6. Micro-Interactions & Motion Timing

1. **Attendance Mark Haptics:** Tapping a 5-state attendance pill executes a 120ms spring scale animation (`scale(0.96) -> scale(1.0)`) with a subtle green highlight ring.
2. **Page Transitions:** Views transition using a subtle 150ms cross-fade with 4px vertical slide.
3. **Quiet Banner Reveal:** When an attendance risk warning triggers, the banner slides down smoothly (`200ms ease-out`) without jumping the layout.
