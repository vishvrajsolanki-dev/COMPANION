# User Journey Specifications — Student Academic OS

**Document ID:** `UX/01_USER_JOURNEYS`
**Author:** Apple Human Interface Team · Things 3, Linear, Raycast Collaboration
**Status:** Approved UX Specification
**iOS Target:** iPhone 16 Pro, iPhone 15, iPhone 14 (iOS 17+)
**Design Constraint:** One-handed, thumb-reachable, offline-first, native iOS patterns only
**Primary References:**
- [Student_OS_PRD.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md)
- [04_USER_FLOWS.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md)
- [05_INFORMATION_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md)
- [03_USER_PERSONAS.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/03_USER_PERSONAS.md)

---

## Design Philosophy Preamble

Before specifying any journey, the team must internalize three axioms:

**Axiom 1 — The Three-Second Rule.**
Every primary action in this app must be reachable within three seconds of unlocking the phone. Vishvraj is between lectures, walking, or half-awake. The interface must never make him think.

**Axiom 2 — The Quiet Dashboard Covenant.**
The home screen does not alarm, does not badge unnecessarily, and does not interrupt. It surfaces exactly one piece of information — *what is happening right now* — and waits. Warning banners appear only when an action is required. The app earns the user's trust by staying silent when silence is appropriate.

**Axiom 3 — The Offline Contract.**
Every tap, every mark, every note created must produce an immediate, visible result — regardless of network state. The network is invisible infrastructure. The user never waits for it, never sees it fail, and never loses work because of it.

---

## Journey Index

| # | Journey | Expected Time | Complexity |
|:--|:--------|:-------------|:-----------|
| JRN-01 | Morning Planning | 60–90 sec | Low |
| JRN-02 | During Lecture — Attendance Mark | 3–8 sec | Very Low |
| JRN-03 | Teacher Announces Extra Lecture | 15–25 sec | Low |
| JRN-04 | Quick Attendance Backfill | 30–60 sec | Medium |
| JRN-05 | Quick Task Capture | 5–15 sec | Very Low |
| JRN-06 | Quick Note from Voice or Text | 10–30 sec | Low |
| JRN-07 | Night Review | 3–5 min | Medium |
| JRN-08 | Exam Preparation Mode | 5–10 min | High |
| JRN-09 | Search — Finding Anything | 5–15 sec | Low |
| JRN-10 | Semester Transition | 10–20 min | High |
| JRN-11 | Backup & Restore | 2–5 min | Medium |
| JRN-12 | Conflict Resolution (Sync) | 30–90 sec | Medium |

---

---

## JRN-01 — Morning Planning

### Purpose
Give the user a complete, anxiety-free picture of their academic day within 90 seconds of waking up — without requiring any input.

### Trigger
User opens the app in the morning, typically between 7:00 AM and 9:00 AM, before or during breakfast.

### Entry Point
App icon on Home Screen → Dashboard tab (tab index 0, always default).

### Primary Goal
Answer in one screen: *What classes do I have today? What is due? Am I safe on attendance?*

### User Intent
Passive consumption. The user does not want to type, tap repeatedly, or navigate. They want one authoritative glance.

---

### Step-by-Step Flow

**Step 1 — App Launch**
- App launches to the Dashboard tab unconditionally.
- If last session was on another tab, the Dashboard tab is still selected on relaunch (tab state is not persisted across sessions — always return home).
- The iOS system large navigation title ("Academic OS" or the user's chosen name) animates in with the standard UIKit large-title collapse behavior.
- The sync status badge in the top-right of the navigation bar resolves within 200ms: it shows "Synced" (green) or "Offline" (neutral gray, not alarming). Sync status is informational only — it never blocks UI.

**Step 2 — The Next Class Hero**
- The dominant element of the Dashboard is the "Next Class" card.
- It answers: Subject name, Room number, Faculty name, and a live countdown timer (e.g., "Starts in 14 min" or "In progress — 32 min remaining").
- If no class is scheduled today, the card shows a calm empty state: "No classes scheduled today. Enjoy the day."
- The card does not animate or pulse. It is static. Calmness is a feature.

**Step 3 — Today's Schedule Strip**
- Immediately below the hero card: a horizontally scrollable strip of lecture slots for the day, in chronological order.
- Each slot is a pill showing the subject abbreviation and time. The current or next slot is visually distinguished (no color change — only a different border weight or font weight, never a flashing indicator).
- Scroll is free. No snapping. The user can glance or ignore.

**Step 4 — Conditional Risk Banner**
- **This element renders ONLY if at least one subject's attendance is below 75%.** In all other cases, this vertical space is empty — no placeholder, no "You're safe" banner. Silence means safety.
- When rendered: a single-line, non-alarming banner above the task section. Text: "Discrete Math needs 2 more classes to reach 75%." A single tap navigates to the Attendance view for that subject.
- The banner slides in with a 200ms ease-out animation only when it renders. It does not throb, flash, or animate repeatedly.

**Step 5 — Tasks Due Today**
- A compact, non-scrollable list of the top 3 tasks due today (sorted by priority). If there are more than 3, a "View all X tasks" link appears.
- Each item shows the task title and subject tag only. No descriptions, no metadata. Brevity is the point.

**Step 6 — User Departs**
- User reads the Dashboard, gets their answers, and either stays (unlikely) or navigates to another tab.
- No confirmation. No log. The app passively served its purpose.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| No classes today | Hero card shows calm empty state |
| Class currently in progress | Hero card shows "In progress — X min remaining" |
| All attendance ≥ 75% | No banner renders. Page is clean. |
| One or more subjects < 75% | One consolidated banner renders. One per threshold breach. |
| No tasks due today | Task section shows nothing (no "All clear" message). |
| First ever app launch | Onboarding intercepts before Dashboard (see JRN-10). |

---

### Alternative Flows

- **User taps the Next Class hero card:** Navigates via push to the Timetable screen for today, scrolled to the active slot. Back button returns to Dashboard.
- **User taps the risk banner:** Navigates via push to the Attendance screen, filtered to the at-risk subject.
- **User taps a task:** Navigates via push to the Task detail view.

---

### Edge Cases

- **Multiple subjects at risk:** The banner consolidates. Text: "2 subjects need attention." Tap navigates to the Attendance screen (not filtered — shows all subjects).
- **Class starts in less than 1 minute:** Hero countdown shows "Starting now." No urgency pulse — just accurate text.
- **It is a weekend (Saturday/Sunday):** Hero shows "No classes scheduled today." The schedule strip is empty. The banner and task section behave normally (tasks can still be due on weekends).

---

### Navigation
- Entry: App launch → Tab Bar → Dashboard (tab 0)
- Exit: Tap on any element → push navigation into that module
- Return: Back swipe (iOS standard interactive pop gesture) or Back button

---

### Required Screens
1. Dashboard (primary)
2. Timetable (push destination from hero card tap)
3. Attendance (push destination from risk banner tap)
4. Task Detail (push destination from task row tap)

---

### Required Components
- Large Navigation Title with sync status badge
- Next Class Hero Card (static, data-driven)
- Today Schedule Horizontal Scroll Strip
- Conditional Risk Banner (rendered only when needed)
- Task Row List (top 3)
- Tab Bar (persistent)

---

### Empty States

| Context | Message | Action |
|:--------|:--------|:-------|
| No classes today | "No classes today." | None |
| No tasks due | (nothing rendered) | — |
| App first launch (no data) | Onboarding intercepts | Setup flow |

---

### Loading States
- No loading spinners are shown on the Dashboard. All data is read from local IndexedDB (Dexie.js) synchronously. Perceived latency is zero.
- If sync is in progress in the background, the sync badge shows a subtle animated indicator. The rest of the UI is fully functional and fully rendered.

---

### Error States
- No error states surface on the Dashboard. If sync fails, the badge shows "Offline" or "Sync failed" — tappable, navigates to Settings > Sync Status.
- Data displayed is always the last known local state. Never blank due to a network error.

---

### Offline Behavior
- **Fully functional.** All Dashboard data comes from IndexedDB. The network state is irrelevant to the user's morning review. No degradation. No warning beyond the sync badge state.

---

### Animations
- App launch: Standard iOS app launch animation (no custom launch screen animation needed — the native behavior is sufficient and fast).
- Risk banner entry: `UIView.animate` with ease-out, 200ms. Slides down from zero height. Only on first render.
- Navigation transitions: Standard iOS push/pop slide.

---

### Haptics
- No haptics on passive consumption (viewing Dashboard).
- Haptic feedback (`UIImpactFeedbackGenerator .light`) fires when user taps a row or card to navigate.

---

### Accessibility
- Dynamic Type: All text scales with the user's system font size preference. Layout reflows — smaller devices never clip.
- VoiceOver: Dashboard reads in priority order: Sync status → Next class → Schedule → Banner (if present) → Tasks.
- Reduce Motion: Banner appears instantly (no slide animation). No other animation changes needed.

---

### Thumb Reachability
- All interactive elements (hero card, risk banner, task rows) are positioned in the bottom 60% of the screen — within one-handed thumb reach on any iPhone 14/15/16 size.
- The sync badge in the navigation bar is informational only and does not require frequent tapping.

---

### Expected Completion Time
**60–90 seconds** for full review. Zero required interaction.

### Success Criteria
- User can answer all three core questions (next class, deadlines, attendance) without leaving the Dashboard.
- No more than 1 tap required to reach any piece of information surfaced on the Dashboard.
- Zero loading states visible to the user.

---

---

## JRN-02 — During Lecture: Attendance Mark

### Purpose
Allow the user to mark their attendance for a lecture slot with a single tap, in under 5 seconds, without disrupting the lecture, without unlocking the phone unnecessarily, and without navigating through multiple screens.

### Trigger
- User is seated in a lecture. Professor takes attendance.
- Or: User exits a lecture and wants to immediately record their state.
- Or: A local notification fires at the lecture start time (if notification permission is granted).

### Entry Point
Three valid entry points in priority order:
1. **Notification tap** → opens directly to the attendance mark sheet for that specific slot.
2. **Widget** (if implemented in future phase) → direct mark action.
3. **Dashboard hero card tap** → push to Timetable → active slot row → long-press or swipe to mark.

### Primary Goal
Record one of five states (Present / Absent / Late / Medical / On-Duty) for the currently active lecture slot in under 5 seconds.

### User Intent
Fast, discreet, single-handed. The phone should not be visible for more than 3 seconds.

---

### Step-by-Step Flow

**Step 1 — Entry via Active Slot**
- User arrives at the Timetable screen (via Dashboard tap or direct tab navigation).
- The currently active lecture slot is automatically scrolled into view and visually elevated (no animation required — it simply appears as the foreground element).
- Active slot is the only one with full opacity. Past slots are dimmed. Future slots are at medium opacity.

**Step 2 — Swipe Action (Primary Path)**
- User swipes right on the active slot row: reveals "Present" action with green background.
- User swipes left on the active slot row: reveals "Absent" action with red background.
- These are the two most common states and are reachable with a single swipe gesture.
- Full swipe commits the action without requiring a further tap (destructive full-swipe, but this is intentional — attendance marking is fast and deliberate).

**Step 3 — Long-Press (Full State Picker)**
- If the user long-presses the active slot: a native iOS context menu appears with all five states: Present, Absent, Late, Medical, On-Duty.
- Each item has an appropriate SF Symbol icon.
- Selecting an item commits the mark immediately.
- This path is for the three less-common states (Late, Medical, On-Duty).

**Step 4 — Confirmation**
- On commit: A subtle spring-scale animation plays on the slot row (scale 0.97 → 1.0 over 120ms). A checkmark badge appears on the slot.
- The attendance percentage badge for that subject updates immediately (Dexie live query).
- No modal confirmation. No "Are you sure?" dialog. The action is immediately reversible by long-pressing and selecting a different state.

**Step 5 — User Returns to Lecture**
- User locks the phone. Done.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| Slot already marked | The existing state is shown on the slot. Swipe/long-press changes it. |
| Slot is in the past (forgotten) | User navigates to Backfill flow (JRN-04). |
| Multiple slots active simultaneously (rare) | Both slots are elevated. User selects the relevant one. |
| Slot is cancelled | Slot is shown with a strikethrough label. Swipe actions are disabled. |

---

### Alternative Flows

- **User is late:** Swipe right is "Present." User long-presses and selects "Late." Same two taps.
- **On-Duty (placement/event):** Long-press → On-Duty. Done.
- **Medical:** Long-press → Medical. App notes the date. Medical leaves require no document upload (the app is a personal tracker, not an official system).

---

### Edge Cases

- **User marks Present then realizes they left early:** Long-press → Late. State is updated. The app uses LWW (Last Write Wins) — the latest mark is always the truth.
- **Class was cancelled mid-session:** Long-press → slot options include "Mark as Cancelled" (changes slot state, removes it from attendance denominator per the 5-state formula).
- **Notification does not fire (user has denied permission):** User enters via Dashboard or Timetable tab. No degradation — the swipe/long-press path is always available.

---

### Navigation
- Arrival: Tab Bar → Timetable (or notification tap → direct to slot)
- Exit: No required navigation. User locks phone.
- Undo: Immediate re-swipe or long-press to change state. No undo toast needed.

---

### Required Screens
1. Timetable — Day View (primary action surface)
2. Attendance — Subject detail (optional, post-mark, to verify percentage)

---

### Required Components
- Timetable slot row (with swipe actions configured)
- iOS native context menu (long-press) with 5 state options
- Attendance percentage badge (live-updating)
- State indicator badge on slot (Present/Absent/Late/Medical/OnDuty visual indicator)

---

### Empty States
- No empty states in this journey. If there are no classes today, the active-slot concept doesn't apply and the user wouldn't trigger this journey.

---

### Loading States
- None. All writes go to IndexedDB first. The UI reflects the write immediately.

---

### Error States
- No error states interrupt this journey. If the sync queue fails silently in the background, the local mark is still recorded and will sync later.

---

### Offline Behavior
- **Fully functional and indistinguishable from online.** The mark is written to IndexedDB. The sync engine queues the mutation for later reconciliation. The user sees a committed mark with zero latency.

---

### Animations
- Swipe reveal: Standard iOS UITableView swipe action animation.
- Commit animation: Spring scale on the slot row (120ms, `UISpringTimingParameters`).
- Percentage badge: Numeric counter animates to new value (150ms, ease-out). Number changes smoothly, not jumps.

---

### Haptics
- Swipe reveals "Present": `UIImpactFeedbackGenerator .light` on reveal.
- Commit (full swipe or context menu tap): `UINotificationFeedbackGenerator .success`. This is the most satisfying haptic in the app — marking attendance present should feel good.
- State already marked → attempt to re-swipe: `UIImpactFeedbackGenerator .rigid` to signal "already set."

---

### Accessibility
- VoiceOver: Each slot row reads as "Data Structures, 9:05 to 10:00, Room 204, currently unmarked. Swipe right for Present, swipe left for Absent, double-tap and hold for more options."
- Larger text: Slot rows expand height dynamically. Swipe area scales with the row.
- Reduce Motion: No spring animation. State badge appears instantly.

---

### Thumb Reachability
- The active slot is scrolled to the center-bottom of the screen (not the top). This is critical — the middle of the screen is thumb-reachable for all iPhone sizes. The app should auto-scroll to position the active slot in the reachable zone.
- Context menus appear anchored to the tapped row, within thumb reach.

---

### Expected Completion Time
**3–8 seconds** from notification tap or app open to committed mark.

### Success Criteria
- User can mark Present via a single right-swipe, without a confirmation dialog.
- The attendance percentage updates on screen before the user leaves the app.
- No network required at any point.
- The correct slot is auto-scrolled into view without the user searching.

---

---

## JRN-03 — Teacher Announces Extra Lecture

### Purpose
Allow the user to add an unscheduled, one-off lecture slot to a specific date in 15–25 seconds, correctly associating it with the right subject and incrementing the attendance denominator.

### Trigger
During a lecture or immediately after: Professor says "There will be an extra class this Saturday at 10 AM in Room 102."

### Entry Point
One of:
1. **Timetable screen** → tap `+` button in navigation bar.
2. **Quick Capture FAB** → select "Add Slot."
3. **Cmd+K palette** (desktop) → "Add lecture slot."

### Primary Goal
Create an `ExtraLectureSlot` entity with: Subject, Date, Start time, End time, Room (optional), and mark it as `type: EXTRA`.

### User Intent
Fast input. The user is in the middle of a lecture and cannot afford to navigate deeply. Input must be minimal.

---

### Step-by-Step Flow

**Step 1 — Open the Add Slot Sheet**
- Tap `+` in the Timetable navigation bar.
- A native iOS modal sheet rises from the bottom of the screen (`.pageSheet` presentation style — the standard iOS half-sheet). It does not full-screen. The lecture is still visible behind it.
- The sheet is dismissible by drag-down. No "Cancel" button needed for this — native iOS behavior handles it.

**Step 2 — Subject Picker (First Field)**
- The first interactive control is a scrollable subject picker (not a text field — the user should never type a subject name).
- Subjects are displayed as tappable rows. The most recently attended subject is pre-selected.
- One tap selects the subject. The row shows a checkmark. No confirm button needed yet.

**Step 3 — Date Picker**
- A native iOS `UIDatePicker` in `.inline` mode for the date. Default is "next Saturday" (the app infers this from the professor's announcement pattern — if the current day is Monday–Friday, the next Saturday is pre-selected).
- User adjusts if needed. The picker shows only the date (not time) in this step.

**Step 4 — Time Pickers**
- Two compact time pickers side-by-side: "Start" and "End."
- Native wheel-style pickers. Both default to reasonable values based on the subject's typical slot duration.
- The end time auto-adjusts to "Start + typical duration" when start time changes.

**Step 5 — Room (Optional)**
- A simple text field with keyboard. Placeholder: "Room (optional)."
- If skipped, the slot is created without a room.

**Step 6 — Confirm**
- A prominent "Add Slot" button at the bottom of the sheet, always visible above the keyboard.
- One tap: slot is created in IndexedDB. The sheet dismisses. The new slot appears in the Timetable on the correct date. The attendance denominator for that subject increments by 1.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| User tries to add a slot that conflicts with existing slot | A soft warning appears inline: "This time overlaps with [Subject] on [Date]. Continue?" Two options: Continue, or Adjust Time. Not a blocking error. |
| User cancels mid-flow | Sheet drag-down dismisses with no changes. |
| Timetable for that date was empty | Slot is created and date now appears in the weekly view. |

---

### Alternative Flows

- **Rescheduled slot (not extra):** The user wants to reschedule an existing slot, not add a new one. This is a different action: long-press on an existing slot → "Reschedule." Creates a new slot with `type: RESCHEDULED` and marks the original as `status: RESCHEDULED`. Not covered in this journey.
- **User doesn't know the room yet:** Skips the room field. Can edit later by long-pressing the slot.

---

### Edge Cases

- **User adds a slot for today:** Slot appears immediately in the today's schedule. If the time has already passed, it is shown as a past (dimmed) slot and the attendance state is "Unmarked — Backfill?" with a subtle prompt.
- **User adds a slot for a date in the past:** A warning appears: "This date is in the past. The slot will be marked as Unmarked. You can backfill attendance after saving." User proceeds or cancels.
- **Subject list is long (many subjects):** Subject picker has a search field at the top. One text input, instant filter.

---

### Navigation
- Entry: Timetable → sheet (modal, `.pageSheet`)
- Exit: Sheet dismisses → Timetable shows the new slot on correct date
- Undo: Long-press the new slot → "Delete Slot" (soft delete, `isDeleted: true`)

---

### Required Screens
1. Timetable screen (host view, visible behind sheet)
2. Add Slot sheet (modal)

---

### Required Components
- Bottom sheet (`.pageSheet` presentation)
- Subject picker (scrollable list with search)
- Native date picker (`.inline` mode)
- Compact time pickers
- Optional text field (Room)
- Primary action button (Add Slot)
- Inline overlap warning

---

### Empty States
- N/A. This journey creates data, not reads it.

---

### Loading States
- None. Write to IndexedDB is synchronous from the UI perspective.

---

### Error States
- **Validation failure (no subject selected):** The "Add Slot" button is disabled (grayed, not hidden) until a subject is selected. The user cannot submit an incomplete slot.
- **Write failure (extremely rare):** A non-blocking toast appears: "Couldn't save. Try again." The sheet stays open.

---

### Offline Behavior
- **Fully functional.** The slot is created locally. Sync happens later.

---

### Animations
- Sheet rise: Standard iOS `.pageSheet` presentation animation (spring curve, 300ms).
- New slot appearance in Timetable (after dismiss): The new slot animates in with a brief scale-from-zero spring (150ms). This signals "it was just created."

---

### Haptics
- Sheet opens: No haptic (modal presentation has no haptic in native iOS).
- "Add Slot" confirm: `UINotificationFeedbackGenerator .success`.
- Overlap warning appearance: `UIImpactFeedbackGenerator .medium`.

---

### Accessibility
- VoiceOver: Sheet is announced as "Add Extra Lecture" modal. All fields are labelled. Required fields announced as such.
- Dynamic Type: Sheet scrolls if content overflows with large text sizes.
- Reduce Motion: Sheet appears instantly (no spring animation).

---

### Thumb Reachability
- The "Add Slot" button is anchored to the bottom of the sheet (above safe area). Always within thumb reach.
- The subject picker is centered in the sheet — reachable with thumb.
- Date and time pickers are native iOS controls, designed for one-handed use.

---

### Expected Completion Time
**15–25 seconds** from opening the sheet to confirmed slot.

### Success Criteria
- User can add an extra slot without leaving the Timetable context.
- Attendance denominator for the subject increments correctly after save.
- The new slot is visible in the Timetable immediately, on the correct date.
- Zero navigation steps are required beyond the sheet itself.

---

---

## JRN-04 — Quick Attendance Backfill

### Purpose
Allow the user to retroactively mark attendance for one or more past lecture slots that were missed (unmarked), without losing data integrity or corrupting the 5-state attendance formula.

### Trigger
User opens the app and sees one or more slots in the past that are unmarked. Or: the Attendance screen shows a subject at an unexpectedly low percentage.

### Entry Point
1. **Attendance screen** → subject card → "Backfill X unmarked slots."
2. **Timetable screen** → past slot row → long-press → "Mark attendance."
3. **Dashboard** (if risk banner present and caused by unmarked slots).

### Primary Goal
Resolve all unmarked past slots by assigning them a state, with the minimum possible taps.

### User Intent
Remediation. The user is fixing a data gap. They want a clear list of what needs attention and a fast way to address each item.

---

### Step-by-Step Flow

**Step 1 — Identify Unmarked Slots**
- On the Attendance subject detail screen, a section header reads: "Unmarked slots (3)" with a list of past slots that have no attendance state assigned.
- Each row shows: Subject, Date, Time. No cluttered metadata.

**Step 2 — Quick-Mark Inline**
- Each row in the unmarked list has inline swipe actions: swipe right for Present, swipe left for Absent.
- Long-press for the full five-state context menu.
- The user works down the list. Each mark removes the row from the "Unmarked" section with a subtle slide-and-fade animation.

**Step 3 — Percentage Recalculates**
- As each slot is marked, the subject's attendance percentage animates to its new value in real time.
- The "Safe to skip" counter also updates in real time.

**Step 4 — Completion**
- When all unmarked slots are resolved, the "Unmarked slots" section disappears. The subject card is now fully resolved.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| User doesn't remember if they attended | They use the best estimate. The app trusts the user — no verification system. |
| Slot was cancelled (user didn't know until later) | They long-press → "Mark as Cancelled." The slot is removed from the denominator. |
| User wants to mark all as Present at once | A "Mark all as Present" bulk action is available via the section's trailing swipe or Edit mode. |

---

### Edge Cases

- **Backfill goes back several weeks:** The list can be long. It supports scrolling. There is no truncation — all unmarked slots are shown.
- **User backfills incorrectly:** Any mark can be changed by long-pressing the now-marked slot. LWW applies.
- **Backfill brings attendance above 75%:** The risk banner on the Dashboard disappears on next Dashboard view. No celebration animation — just clean resolution.

---

### Offline Behavior
- **Fully functional.** All backfill writes go to IndexedDB immediately.

---

### Animations
- Row dismissal (slot is marked and leaves the "Unmarked" list): Slide-right and height-collapse, 200ms ease-out.
- Percentage counter: Live numeric animation as each slot is marked.

---

### Haptics
- Each mark commit: `UIImpactFeedbackGenerator .light`.
- Last unmarked slot is resolved (section disappears): `UINotificationFeedbackGenerator .success` — a single satisfying signal.

---

### Thumb Reachability
- Unmarked slot list appears in the scrollable body of the Attendance screen. Edit/Mark buttons are reachable via swipe gestures from any row position.

---

### Expected Completion Time
**30–60 seconds** for 3–5 unmarked slots.

### Success Criteria
- Zero unmarked slots remain after the flow.
- Attendance percentage reflects the correct value immediately.
- No network required.

---

---

## JRN-05 — Quick Task Capture

### Purpose
Capture a task (assignment, deadline, reminder) in under 10 seconds, from anywhere in the app, without navigating to the Tasks screen.

### Trigger
Professor announces an assignment. User thinks of something they must not forget.

### Entry Point
1. **Quick Capture FAB** (floating action button, visible on most screens) → tap → capture sheet opens.
2. **Quick Capture sheet** can also be triggered from the Dashboard via a dedicated button.
3. Cmd+K (desktop) → "New Task."

### Primary Goal
Persist a task with at minimum: a title. Everything else is optional and can be filled in later.

### User Intent
Capture speed is the entire value proposition here. The user cannot miss the announcement while fumbling with a form. Title → Subject → Due Date → Done. Three interactions maximum.

---

### Step-by-Step Flow

**Step 1 — Open Capture Sheet**
- FAB tap opens a native `.pageSheet` (half-sheet).
- The keyboard is raised immediately and focus is placed on the title text field. No animation delay — the cursor is blinking before the sheet finishes animating.

**Step 2 — Type the Title**
- User types the task name. Examples: "Lab Report 2," "Read Chapter 4."
- Title is the only required field. The "Save" button activates the moment the first character is typed.

**Step 3 — Subject Tag (Optional, Fast)**
- Below the title field: a single horizontal row of subject abbreviation chips (DSA, DM, AI Lab, OOP, DBMS). Tap one to associate. Tap again to deselect.
- No dropdown. No navigation. Chips are always visible. The user taps the correct abbreviation in 0.3 seconds.

**Step 4 — Due Date (Optional, Fast)**
- A "Due date" button opens an inline date picker within the sheet. Default: Today. Common shortcuts: "Today," "Tomorrow," "This Week" as chip buttons above the date picker. One tap selects a shortcut.

**Step 5 — Save**
- Tap "Save" or press Return on the keyboard.
- Sheet dismisses. The task appears in the Tasks list. A brief haptic confirms.
- The user is back to wherever they were in the app. Zero navigation disruption.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| User opened capture sheet by accident | Drag-down dismisses with no save. |
| User wants to add priority immediately | A priority selector (Low/Medium/High/Urgent) is available as a secondary row in the sheet, visible but not required. |
| Task has a dependent task | That link is made later in the Task detail view. Not in quick capture. |

---

### Edge Cases

- **The title is very long:** The text field scrolls. The sheet does not resize beyond its natural height.
- **User is in the middle of another sheet (e.g., Add Slot):** The quick capture FAB is hidden when another modal is open. Not accessible mid-sheet. The user finishes the current action first.
- **User types the same task title twice:** No deduplication. The app trusts the user.

---

### Offline Behavior
- **Fully functional.** Task writes to IndexedDB immediately.

---

### Animations
- Sheet rise: Standard iOS spring animation.
- Keyboard appearance: Simultaneous with sheet rise (not sequential). Zero perceived delay.
- Task row appearance in Tasks list: After sheet dismisses, if Tasks tab is visible, the new task slides in from the top of the correct group.

---

### Haptics
- FAB tap: `UIImpactFeedbackGenerator .medium`.
- Save: `UINotificationFeedbackGenerator .success`.

---

### Thumb Reachability
- The entire capture sheet — title field, subject chips, date shortcuts, Save button — is designed to fit within the half-sheet height, placing everything in the lower 60% of the screen. All controls are thumb-reachable without scrolling the sheet.

---

### Expected Completion Time
**5–10 seconds** for a titled + tagged + dated task.

### Success Criteria
- Task is persisted before the user locks the phone.
- No navigation away from the user's current context.
- Title can be captured in under 5 seconds (just title + Save).

---

---

## JRN-06 — Quick Note from Voice or Text

### Purpose
Capture a lecture idea, concept, or reference material in under 30 seconds, associated with the correct subject, without interrupting the lecture experience.

### Trigger
Professor mentions a key concept. User hears something important during lecture.

### Entry Point
1. **Quick Capture FAB** → "New Note."
2. **Notes tab** → `+` button.
3. **Cmd+K** → "New Note."

### Primary Goal
Create a note with a title and at least the beginning of content, associated with the correct subject.

### User Intent
Speed and invisibility. The phone should appear to be on standby. The note must be created before the professor moves on. Voice input (via Wispr Flow integration or iOS dictation) is explicitly supported for this journey.

---

### Step-by-Step Flow

**Path A — Text Input**

**Step 1 — Open Note Sheet**
- Half-sheet opens. Keyboard raised immediately. Subject chip row visible.

**Step 2 — Type Title (Optional)**
- Title field is pre-focused. User types a quick identifier: "BFS algorithm," "Proof of contradiction."
- Title can be left blank — the first line of the body becomes the title in the list view.

**Step 3 — Subject Association**
- Tap the subject chip that matches the current lecture. One tap.

**Step 4 — Body**
- User types freely. Markdown is interpreted in real-time (bold, lists, code blocks render).
- The note auto-saves every 500ms after the last keystroke. No manual save button needed.

**Step 5 — Exit**
- Tap the sheet drag handle to dismiss (or press the system back gesture).
- Note is saved. It appears in the Notes list under the correct subject folder.

**Path B — Voice Input (Wispr Flow / iOS Dictation)**

**Step 1 — Open Capture Sheet → Voice Mode**
- FAB tap → a second icon in the sheet header switches to voice mode.
- OR: Long-press the FAB → "Voice Note" option in context menu.

**Step 2 — Dictate**
- iOS native dictation is active. The microphone icon pulses.
- User speaks: "BFS algorithm uses a queue. Visited array prevents cycles. Time complexity O V plus E."
- Text appears in real time.

**Step 3 — Auto-Close**
- After 2 seconds of silence, dictation ends. User can review or extend.
- Dismiss sheet → note is saved.

---

### Edge Cases

- **Note created without a subject:** The note is saved to an "Uncategorized" folder. Easily reassignable later.
- **Very long voice note:** Voice input continues until explicitly stopped. There is no time limit.
- **Device orientation change mid-capture:** The sheet adapts. The text field does not lose focus or content.

---

### Offline Behavior
- **Fully functional.** All notes write to IndexedDB. Voice dictation uses on-device processing (iOS native dictation) and does not require the internet.

---

### Haptics
- Note auto-save: No haptic (silent background operation).
- Sheet dismiss: `UIImpactFeedbackGenerator .light`.
- Voice dictation start: `UIImpactFeedbackGenerator .medium`.

---

### Expected Completion Time
**10–30 seconds** for a titled, tagged text note. **15–20 seconds** for a voice note.

### Success Criteria
- Note is persisted locally before user locks phone.
- The note appears in the correct subject folder in the Notes list view.
- No network request is made during note creation.

---

---

## JRN-07 — Night Review

### Purpose
Give the user a complete academic overview at the end of the day — tasks completed, attendance health, notes captured today, and tomorrow's schedule — in a calm, low-pressure session lasting 3–5 minutes.

### Trigger
Evening, typically between 9:00 PM and 11:00 PM. User opens the app voluntarily for end-of-day reflection.

### Entry Point
App launch → Dashboard (which now shows tomorrow's schedule as the hero, since today's lectures are done).

### Primary Goal
Confirm the day is complete, review any at-risk subjects, check tomorrow's plan, and optionally set tasks for tomorrow.

### User Intent
Reflective, unhurried. The user is sitting down. One-handed but not rushed.

---

### Step-by-Step Flow

**Step 1 — Dashboard (Evening State)**
- The Dashboard hero card adapts automatically: it now shows "Tomorrow's First Class" instead of the active class (since today's are done).
- Text: "Tomorrow — Discrete Math · 9:05 AM · Room 101."
- The attendance risk banner (if present) is still visible and actionable.

**Step 2 — Task Review**
- User navigates to the Tasks tab.
- The "Due Today" section shows checkboxes for all tasks. The user marks any they completed.
- If tasks were missed, they remain visible. No penalty, no alarm — they carry forward automatically to tomorrow's list (due date is unchanged, the item is simply still visible).

**Step 3 — Attendance Check**
- User navigates to the Attendance tab.
- Scrolls through subject cards. All data is current (based on today's marks).
- If a slot from today is unmarked: a subtle "Unmarked" badge appears on that subject. User can backfill now (JRN-04).

**Step 4 — Analytics (Optional)**
- User navigates to the Analytics tab for a broader view.
- Weekly attendance bar chart shows today's column.
- SGPA progress tracker shows current trajectory.

**Step 5 — Tomorrow's Schedule**
- User navigates to the Timetable tab → taps "Tomorrow."
- Reads tomorrow's classes. No action required.

**Step 6 — App Closed**
- User closes the app. Background sync (if Tailscale is connected) runs automatically.

---

### Edge Cases

- **It is 11:00 PM:** Quiet hours begin. No push notifications will fire until 7:00 AM. The app does not surface this to the user — it simply stays silent.
- **All tasks are done and attendance is healthy:** The night review is 60 seconds of confirmation. The app gracefully presents nothing alarming. This is the best possible state.

---

### Offline Behavior
- **Fully functional.** All night review data is read from IndexedDB. The network is irrelevant.

---

### Haptics
- Task checkbox mark: `UIImpactFeedbackGenerator .light` for each check.
- All tasks completed: `UINotificationFeedbackGenerator .success` — once, on the last task marked done.

---

### Expected Completion Time
**3–5 minutes** for a thorough review. **60 seconds** for a quick check.

### Success Criteria
- User leaves the app knowing their attendance status, tomorrow's schedule, and outstanding tasks.
- No action is required — the review is purely informational if all is well.

---

---

## JRN-08 — Exam Preparation Mode

### Purpose
Give the user a unified view of everything relevant to an upcoming exam: the subject's notes, attendance status, task completion, and grade targets — aggregated in one navigation context.

### Trigger
User becomes aware of an upcoming exam (typically 1–3 weeks before the exam date).

### Entry Point
1. **Calendar screen** → upcoming exam event → tap → "Study Mode."
2. **Analytics screen** → SGPA Solver → subject deep-link.
3. **Search** → search exam name or subject → exam event in results.

### Primary Goal
Surface all notes, tasks, and data for a specific subject in one unified preparation view.

### User Intent
Purposeful research. The user is at their desk or on the floor with their laptop. This is a longer session. One-handed not required for this journey.

---

### Step-by-Step Flow

**Step 1 — Exam Event Tap**
- User taps an exam event in Calendar.
- A detail sheet expands (`.pageSheet`): shows the exam name, date, time, and subject.
- A prominent "Prepare for This Exam" button is at the bottom.

**Step 2 — Subject Preparation Hub**
- Tapping "Prepare" navigates (full push) to a Subject Preparation Hub screen.
- This is not a generic screen — it is assembled on-the-fly for this specific subject.
- Sections in order:
  1. Attendance Summary (% and safe-to-skip count for this subject).
  2. SGPA Impact: "If you score X in this exam, your SGPA will be Y." (Live slider).
  3. Notes (all notes tagged to this subject, most recently edited first).
  4. Tasks (all incomplete tasks tagged to this subject).
  5. Past exam slots (if any rescheduled or cancelled slots exist, flagged here).

**Step 3 — Study the Notes**
- User taps a note → pushed to the note editor/viewer.
- Back swipe returns to the Preparation Hub (not to Calendar — the nav stack preserves the hub).

**Step 4 — Mark Tasks Done**
- User marks tasks complete inline within the Preparation Hub. No navigation required.

**Step 5 — SGPA Target Calculation**
- User drags the "Expected Score" slider.
- SGPA updates in real time below it.
- This is the mental model: "I need an 82 in DSA to maintain an 8.5 SGPA."

---

### Edge Cases

- **Exam has passed (user reviewing post-exam):** The hub still shows notes and tasks. The SGPA solver shows the actual score field (user can input their result, which feeds the CGPA tracker).
- **No notes exist for this subject:** The Notes section shows an empty state with a "Take your first note" call to action.
- **Multiple exams on the same day:** Each exam event has its own hub. User navigates between them via the Calendar.

---

### Navigation
- Entry: Calendar event → push to Subject Preparation Hub
- Within hub: Push to note viewer, push to task detail, back returns to hub
- Full stack: Calendar → Hub → Note Viewer. Three levels. Never deeper.

---

### Offline Behavior
- **Fully functional.** All notes, tasks, attendance data, and analytics come from IndexedDB.

---

### Expected Completion Time
**5–10 minutes** for a focused exam preparation session. Can be revisited multiple times over days.

### Success Criteria
- User can access all subject-specific study materials in one navigation context without tab-switching.
- SGPA calculator gives real-time academic impact feedback.
- Notes are readable within the hub without a separate navigation flow.

---

---

## JRN-09 — Search: Finding Anything

### Purpose
Allow the user to locate any piece of information in the app — a note, a subject, a task, a slot, a date — in under 10 seconds, regardless of where they currently are in the navigation hierarchy.

### Trigger
- User wants to find a specific note they vaguely remember.
- User wants to jump to a specific screen quickly.
- User cannot remember which tab contains a piece of information.

### Entry Point
1. **Cmd+K** (primary — desktop).
2. **Search icon** in any navigation bar → native `UISearchController`.
3. **Pull-to-reveal** search on the Dashboard (iOS standard behavior: pull down to reveal search bar).

### Primary Goal
Surface the correct result with one search query and one tap.

### User Intent
Fast retrieval. The user knows what they want — they just don't know where it lives.

---

### Step-by-Step Flow

**Step 1 — Activate Search**
- `UISearchController` activates. The navigation bar collapses, replaced by the search input. The keyboard rises.
- The search scope is global (all content types: notes, tasks, subjects, slots, commands).

**Step 2 — Type Query**
- User types. Results update with every keystroke (debounced 150ms).
- Results are grouped by type: Notes (showing title + preview), Tasks (showing title + subject + due date), Schedule (showing slot + date + room), Actions (navigation shortcuts: "Go to Attendance," "Go to Analytics").
- The "Actions" group is always shown first — so the user can navigate via search even if they just want to jump to a screen.

**Step 3 — Tap a Result**
- Tapping a note: navigates to the note editor (full push from wherever the user is).
- Tapping a task: navigates to the task detail sheet.
- Tapping a slot: navigates to the Timetable, scrolled to that date and slot.
- Tapping an action: navigates to the specified screen.

**Step 4 — Back**
- Standard iOS back gesture. Search state is cleared. User is back at origin.

---

### Decision Points

| State | Behavior |
|:------|:---------|
| Query matches nothing | A calm empty state: "No results for '[query]'." No error, no suggestion. |
| Query is very short (1 character) | Results are shown but unordered. No ranking needed for short queries. |
| Query matches content in multiple types | All groups appear. The highest-confidence group is shown first. |

---

### Offline Behavior
- **Fully functional.** All search runs against IndexedDB via MiniSearch. No network requests.

---

### Animations
- Search activation: Standard iOS `UISearchController` animation (navigation bar transforms into search bar, 200ms).
- Results appear: Fade in, 100ms. No slide.

---

### Haptics
- Search activation: No haptic.
- Result tap: `UIImpactFeedbackGenerator .light`.

---

### Expected Completion Time
**5–10 seconds** from search activation to result tap.

### Success Criteria
- Any note, task, or screen is reachable within one search query.
- Results appear within 150ms of the last keystroke (MiniSearch is fast enough for this).

---

---

## JRN-10 — Semester Transition

### Purpose
Allow the user to archive the current semester's data and set up the next semester — with new subjects, new timetable, and a clean slate — without losing any historical data.

### Trigger
End of academic semester. Exam results are in. Next semester is about to begin.

### Entry Point
**Settings** → "Semester Management" → "Start New Semester."

### Primary Goal
Preserve all data from the current semester (notes, attendance history, analytics) in an archived, read-only state, and create a fresh workspace for the new semester.

### User Intent
Annual ritual. The user is not in a hurry. They are setting up their academic environment for the next 4–6 months. Accuracy is more important than speed.

---

### Step-by-Step Flow

**Step 1 — Archive Confirmation**
- A full-screen confirmation sheet (not a standard modal — this is a high-stakes action). It lists:
  - Current semester: "Semester 3, Jul 2025 – Dec 2025."
  - What will be archived: All notes, attendance records, analytics, tasks.
  - What will remain: App settings, backup configuration, user profile.
- A prominent "Archive Semester 3" button. Requires a deliberate tap (not swipe-to-confirm — a tap with a brief 1-second delay on the button to prevent accidental activation).

**Step 2 — Archive Runs**
- A progress indicator (not a spinner — a linear progress bar showing "Archiving notes... Archiving attendance... Archiving analytics...").
- This runs offline, on device. It reorganizes IndexedDB structure. Typically 2–5 seconds.

**Step 3 — New Semester Setup**
- After archive: A guided setup flow (`.fullScreenCover` presentation, iOS onboarding style).
- Step 3a: Semester name ("Semester 4") and date range (start/end).
- Step 3b: Add subjects. Same input pattern as initial onboarding — subject name, code, credits, faculty name (all optional except name).
- Step 3c: Set timetable. User configures recurring slots per day.
- Step 3d: Set attendance target (default 75%, but user can customize to 80% or 85% for safety).

**Step 4 — Complete Setup**
- Tap "Start Semester 4."
- Dashboard loads with the new semester's clean state.
- A single, non-recurring notification fires: "Semester 4 started. Good luck!"

---

### Edge Cases

- **User starts setup but doesn't finish:** The current semester remains active. Setup progress is saved (each step is committed to IndexedDB as it completes — there is no "transaction" that can partially fail from the UX perspective).
- **User wants to view archived data:** Settings → "Past Semesters" → tap semester → read-only view of all historical data.
- **User sets up wrong subject name:** Subject names are editable at any time in Settings → Subjects.

---

### Offline Behavior
- **Fully functional.** Semester transition is entirely local.

---

### Expected Completion Time
**10–20 minutes** for full new semester setup (mainly timetable configuration).

### Success Criteria
- All current semester data is preserved and accessible in read-only archive.
- New semester dashboard is clean and accurate.
- Zero data loss at any point.

---

---

## JRN-11 — Backup & Restore

### Purpose
Allow the user to create an encrypted off-device backup of all their academic data, and restore from it in the event of a device change, factory reset, or data loss.

### Trigger
- **Backup:** User wants peace of mind. Or: they are getting a new phone.
- **Restore:** New device or reinstall. User needs to recover their data.

### Entry Point
- **Backup:** Settings → "Backup & Restore" → "Create Backup."
- **Restore:** First app launch on a new device → "Restore from Backup."

---

### Backup Flow

**Step 1 — Backup Settings**
- Settings screen shows: Last backup timestamp, backup destination (iCloud Drive / GitHub Gist / Local File), and backup encryption status (AES-256, always on).
- Automatic backup: configurable frequency (Daily / Weekly / Manual). Default: Weekly.

**Step 2 — Manual Backup**
- Tap "Create Backup Now."
- Progress indicator: "Exporting data... Encrypting... Uploading to iCloud Drive."
- On completion: "Backup complete. File: academic_os_sem3_20250804.enc · iCloud Drive."
- A system share sheet can optionally send the file to another destination (AirDrop, Files, email).

---

### Restore Flow

**Step 1 — Locate Backup File**
- iOS Files picker opens. User navigates to their backup file (typically in iCloud Drive > Academic OS folder).
- Tap the file.

**Step 2 — Decrypt**
- The app prompts for the backup passphrase (or uses biometric to retrieve it from the iOS Keychain if previously saved).
- Decryption runs on-device. Progress indicator.

**Step 3 — Restore Confirmation**
- The app shows: "This backup contains: 3 semesters · 47 notes · 310 attendance records. Restore will replace all current data."
- A "Restore" button (with the same 1-second deliberate tap delay as semester archive — this is a high-stakes action).

**Step 4 — Complete**
- App restarts (soft restart, not a full OS restart).
- Dashboard loads with restored data.

---

### Offline Behavior
- **Backup to iCloud requires network.** If offline: "Backup saved locally. It will upload when connected." The local file is still created.
- **Restore from local file:** Fully functional offline (file is already on device).

---

### Expected Completion Time
**2–3 minutes** for backup. **3–5 minutes** for restore.

### Success Criteria
- All data (notes, attendance, analytics, tasks, timetable) is fully restored on a fresh device.
- Restoration is idempotent — running it twice produces the same result.
- The encrypted file cannot be read without the passphrase.

---

---

## JRN-12 — Conflict Resolution (Sync Conflict)

### Purpose
Allow the user to resolve a data conflict — when the same attendance record was marked differently on two different devices (phone + laptop) — without data loss and with full user control.

### Trigger
Sync engine detects an HTTP 409 response from the backend when reconciling a high-stakes entity (`AttendanceRecord`, `LectureSlot` status).

### Entry Point
A notification badge appears on the sync status badge in any navigation bar. Tapping it navigates to the Conflict Queue.

### Primary Goal
The user sees both conflicting versions and chooses the correct one. One tap. Data is preserved.

---

### Step-by-Step Flow

**Step 1 — Conflict Badge**
- The sync status badge changes from "Synced" to "1 Conflict." It is not alarming — it is amber, not red.
- The badge persists across tab navigation until resolved.

**Step 2 — Conflict Queue Screen**
- Settings → Sync → "Conflicts (1)."
- Each conflict shows:
  - The entity in conflict: "DSA · Aug 4, 9:05 AM slot."
  - Version A: "Marked PRESENT on iPhone at 9:12 AM."
  - Version B: "Marked ABSENT on MacBook at 9:08 AM."
- A "Which is correct?" prompt with two tappable cards.

**Step 3 — User Selects**
- User taps the correct version.
- The conflict is resolved. The winning version propagates to both devices via sync.
- The conflict row dismisses (slide-right animation). The queue badge clears if no conflicts remain.

---

### Edge Cases

- **User doesn't know which is correct:** They can dismiss the conflict without resolving. It remains in the queue. The local device's version is used for display in the meantime.
- **Multiple conflicts:** Shown as a scrollable list. Each resolved independently.
- **Conflict in a note (LWW applies):** Notes use LWW — no conflict queue is generated. The most recent edit wins automatically.

---

### Offline Behavior
- Conflict queue is viewable offline. Resolution is stored locally and syncs when connected.

---

### Haptics
- Conflict badge appears: `UIImpactFeedbackGenerator .medium`.
- Conflict resolved: `UINotificationFeedbackGenerator .success`.

---

### Expected Completion Time
**30–90 seconds** per conflict.

### Success Criteria
- User resolves the conflict by choosing one of exactly two options.
- No data is silently discarded.
- The conflict queue is empty after all conflicts are resolved.

---

---

## Cross-Journey Design Rules

These rules apply globally to every journey specified above.

### 1. Never Block the User
No journey may present a blocking error that prevents navigation. Error states are always additive (a banner, a badge, an alert) — never gates.

### 2. Never Lose Data
Every write is to IndexedDB first. The UI reflects the write before any network attempt. If the app crashes after a write, the data is still in IndexedDB.

### 3. The Quiet Dashboard Covenant (Repeated Intentionally)
The Dashboard only shows warnings when action is required. "All is well" is communicated by silence. A clean Dashboard with no banners is good news.

### 4. Thumb Reach is a Constraint, Not a Preference
All primary actions in all journeys must be reachable in the bottom 60% of the screen. Secondary actions (settings, info, navigation) may be higher.

### 5. Haptics Signal Meaning
- `.success` → something important was saved or completed.
- `.light` → a navigation or selection was made.
- `.medium` → something needs attention.
- `.rigid` → an action was blocked or is unavailable.
- Never use haptics decoratively.

### 6. Offline Means Zero Degradation
No journey shows a "You're offline" warning unless the user explicitly requests data that requires the network (e.g., a backup upload). Every core workflow works identically offline.

### 7. Animation Duration Budget
- Navigation transitions: Standard iOS (350ms). Never customized.
- Micro-interactions: 100–200ms. Never longer.
- Progress indicators: Only for operations the user explicitly initiated. Never for background sync.

### 8. Never More Than 3 Navigation Levels
Calendar → Preparation Hub → Note Viewer. That is the deepest stack permitted. Any design that requires 4 levels must be re-architected.
