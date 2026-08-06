# Functional QA Pass — Student Academic OS

**Date:** 2026-08-05  
**Method:** Every interactive element in every view audited by reading all source files.  
**Legend:** ✅ = looks correct | ⚠️ = minor issue | 🔴 = bug/gap

---

## 1. Dashboard (Home Tab) — `QuietDashboard.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| "View Schedule" quick-link | 53 | `navigateToSubview('timetable-builder')` — opens timetable builder, NOT the weekly schedule view | ⚠️ Label mismatch: button says "View Schedule" but opens Builder |
| "Take Attendance" quick-link | 57 | `navigateToSubview('attendance')` ✅ | ✅ |
| "View Performance" quick-link | 60 | `navigateToSubview('analytics')` ✅ | ✅ |
| "Add Task" quick-link | 63 | `navigateToSubview('tasks')` — opens Tasks view but doesn't auto-open the create form | ⚠️ Minor: user expects inline add, gets full view |
| Attendance alert banner | 96 | Tapping navigates to attendance view ✅ | ✅ |
| Next lecture hero card | 137-176 | Shows subject name, room, time, countdown, status badge ✅ | ✅ |
| "Today's Attendance" summary row | 180-190 | Shows attended/total + percentage ✅ | ✅ |
| "Today's Tasks" row | 192-203 | Navigates to Tasks tab ✅ | ✅ |
| Upcoming exams row | 207-228 | Shows next 2 exams with countdown, navigates to Exams on tap ✅ | ✅ |
| "Add a task →" empty state | 238-247 | Navigates to Tasks tab ✅ | ✅ |

### Dashboard Bug: "View Schedule" opens Timetable Builder
- `QuietDashboard.tsx:53` — the quick-link says "View Schedule" but calls `navigateToSubview('timetable-builder')`, which is the pattern editor, not the schedule viewer
- The WeeklyGrid (actual schedule view) is the Schedule tab, not a subview
- **Fix:** Either change the label to "Build Timetable" or change the handler to `setActiveTab('schedule')`

---

## 2. Schedule (Weekly Grid) — `WeeklyGrid.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Day strip (Mon-Sun chips) | 48-77 | Sets `selectedDay`, filters slots by day ✅ | ✅ |
| Day chip active state | 64-67 | Blue background + white text for selected day ✅ | ✅ |
| Time slot cards | 83-120 | Shows subject code badge, subject name, room, time range, status, attendance indicator | ✅ |
| Attendance indicator dot | 113-117 | Green check / red X / blue clock / yellow circle for each status ✅ | ✅ |
| Cancelled slot styling | 106 | `cancelled: opacity 0.5, line-through` ✅ | ✅ |
| Slot tap → SlotDetailSheet | 121 | `setActiveSlot({ slot, subject, record })` ✅ | ✅ |
| Empty day message | 80 | "No classes on {day}" ✅ | ✅ |
| "Add Extra Class" button | 123-128 | Opens inline form at bottom ✅ | ✅ |
| Extra class form — subject select | 135-149 | Select dropdown with all subjects ✅ | ✅ |
| Extra class form — date | 150-157 | Date input ✅ | ✅ |
| Extra class form — time range | 158-172 | Start + end time inputs | ⚠️ No validation that start < end |
| Extra class form — room | 173-184 | Text input ✅ | ✅ |
| Extra class form — Submit | 189 | `handleAddExtraClass()` → generates slot ID, adds to DB ✅ | ✅ |
| Extra class form — Cancel | 196 | Resets all state ✅ | ✅ |

### WeeklyGrid Note: No validation on extra class times
- `WeeklyGrid.tsx:189-202` — `handleAddExtraClass` doesn't check that `extraStartTime < extraEndTime`
- A slot with 16:00→15:00 would be created without error

---

## 3. Slot Detail Sheet — `SlotDetailSheet.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Subject code + name | 24-27 | Shows colored badge + full name ✅ | ✅ |
| Date display | 30-33 | Formatted as "Mon, Aug 5, 2026" ✅ | ✅ |
| Room | 35-38 | Shows `📍 LH-301` ✅ | ✅ |
| "Present" button | 46-53 | Green, marks as present ✅ | ✅ |
| "Absent" button | 54-61 | Red, marks as absent ✅ | ✅ |
| "Late" button | 62-69 | Yellow, marks as late ✅ | ✅ |
| "Medical" button | 70-77 | Blue, marks as medical ✅ | ✅ |
| "On Duty" button | 78-85 | Teal, marks as on duty ✅ | ✅ |
| "Cancel Class" button | 90-107 | Toggles `slot.status` between 'scheduled'/'cancelled' ✅ | ✅ |
| "Reschedule" button | 108-112 | Opens inline form ✅ | ✅ |
| Reschedule form — date | 121-129 | Date input with default "2026-08-06" ✅ | ✅ |
| Reschedule form — time range | 130-148 | Start + end time inputs | ⚠️ No validation start < end |
| Reschedule form — Submit | 151-173 | Creates new slot + marks old as 'rescheduled' + copies attendance ✅ | ✅ |
| "Delete Slot" button | 178-186 | Confirm dialog → `is_deleted: true` ✅ | ✅ |
| "Close" button | 187-189 | `onClose()` ✅ | ✅ |
| Edit history display | 194-227 | Shows old→new status changes with timestamps ✅ | ✅ |

### SlotDetailSheet: Reschedule creates link between old and new
- `SlotDetailSheet.tsx:156-157` — `linked_slot_id: slot.id` creates a bidirectional link ✅
- Old slot status set to 'rescheduled' ✅
- Attendance record carried forward if present ✅

---

## 4. Tasks — `TasksView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Filter tabs (Today/Upcoming/All) | 32-54 | Segmented control, filters by due date ✅ | ✅ |
| Task card — checkbox toggle | 74-84 | Toggles `todo` ↔ `completed` ✅ | ✅ |
| Task card — title | 86 | Shows task title ✅ | ✅ |
| Task card — due date | 87-88 | Shows "Due Aug 5" format ✅ | ✅ |
| Task card — priority dot | 90-94 | Color-coded dot (gray/amber/red/red) ✅ | ✅ |
| Task card — subject tag | 97-104 | Shows subject code in colored badge ✅ | ✅ |
| "Add Task" button | 57 | Opens create form ✅ | ✅ |
| Create form — title input | 64-73 | Text input, required | ⚠️ No visible "required" indicator |
| Create form — subject select | 77-90 | Dropdown, optional ✅ | ✅ |
| Create form — due date | 91-101 | Datetime input, defaults to today 23:59 ✅ | ✅ |
| Create form — priority | 102-114 | Dropdown: Low/Medium/High/Urgent ✅ | ✅ |
| Create form — Submit | 60 | Adds task to DB, resets form ✅ | ✅ |
| Create form — Cancel | 119 | Resets form ✅ | ✅ |
| Task detail sheet — Subject link | 138-148 | Shows subject with navigate-to-subject link ✅ | ✅ |
| Task detail sheet — Priority badge | 149-153 | Colored badge with text ✅ | ✅ |
| Task detail sheet — Status badge | 154-161 | Green completed / amber in-progress / gray todo ✅ | ✅ |
| Task detail sheet — Toggle Status | 165-173 | Cycles: todo→in_progress→completed→todo ✅ | ✅ |
| Task detail sheet — Edit form | 184-247 | Full edit form with all fields ✅ | ✅ |
| Task detail sheet — Delete | 250-257 | Soft delete ✅ | ✅ |
| Task detail sheet — Close | 258-265 | Closes sheet ✅ | ✅ |

---

## 5. Attendance — `AttendanceView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Overall attendance hero card | 19-40 | Shows total attended/total + percentage, color-coded ✅ | ✅ |
| Subject cards grid | 42-79 | Shows subject name, code, attended/total, percentage, bar, at-risk badge, safe-to-skip count ✅ | ✅ |
| Subject card tap | 78 | `setSelectedSubjectId(sub.id)` → opens detail sheet ✅ | ✅ |
| Detail sheet — subject header | 92-97 | Shows code, name, attendance stats ✅ | ✅ |
| Detail sheet — Backfill button | 99-101 | Opens backfill form ✅ | ✅ |
| Backfill form — slot select | 107-120 | Dropdown of unrecorded slots for this subject ✅ | ✅ |
| Backfill form — status select | 122-132 | Present/Absent/Late/Medical/OnDuty ✅ | ✅ |
| Backfill form — Submit | 134-148 | Creates or updates attendance record with version +1 + edit_history ✅ | ✅ |
| Detail slot list | 152-184 | Shows each slot with status badge, date, room ✅ | ✅ |
| Detail slot list — "Mark" button | 177-183 | Only shown for unrecorded slots, opens backfill form pre-filled ✅ | ✅ |

---

## 6. Notes — `NotesView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Search input | 299-315 | Filters notes by title + body text ✅ | ✅ |
| Tag filter chips | 319-349 | Dynamic from all note tags, "All" + individual tags ✅ | ✅ |
| Note cards | 359-416 | Shows title, subject badge, tags, edit/delete buttons ✅ | ✅ |
| "New Note" button | 278-293 | Opens editor with `editingNoteId = 'new'` ✅ | ✅ |
| Editor — title input | 156-171 | Text input ✅ | ✅ |
| Editor — subject select | 174-190 | Dropdown ✅ | ✅ |
| Editor — tags input | 192-206 | Comma-separated text ✅ | ✅ |
| Editor — Preview/Editor toggle | 115-129 | Toggles `isPreview` state ✅ | ✅ |
| Editor — Preview mode | 209-213 | Shows `whiteSpace: pre-wrap` for markdown body ✅ | ✅ |
| Editor — textarea | 215-231 | Monospace font, resizable ✅ | ✅ |
| Editor — Save button | 132-148 | Creates new or updates existing note, parses tags ✅ | ✅ |
| Editor — Back button | 106-107 | Discards changes, returns to list | ⚠️ No confirmation if there are unsaved changes |
| Editor — Attachment strip | 238-259 | "Link Resource" button → alert about Phase 3 | ✅ (placeholder) |
| Note card — Edit button | 406 | Opens editor with note data ✅ | ✅ |
| Note card — Delete button | 409 | `confirm()` → soft delete ✅ | ✅ |

---

## 7. Exams — `ExamsView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Filter tabs (Upcoming/Past) | 116-134 | Segmented control, filters by date vs simulatedNow ✅ | ✅ |
| Exam card — subject badge | 186-199 | Colored code badge ✅ | ✅ |
| Exam card — type | 200-202 | "Midsem" / "Endsem" / "Quiz" ✅ | ✅ |
| Exam card — date | 205-207 | "Wed, Aug 5, 2026 10:00 AM" format ✅ | ✅ |
| Exam card — countdown | 210-217 | Hours remaining, red if <24h, yellow if <48h ✅ | ✅ |
| Exam card — tap → details | 170-174 | Opens detail sheet ✅ | ✅ |
| "Add Exam" button | 95-110 | Opens bottom sheet form ✅ | ✅ |
| Add form — subject select | 258-278 | Required, shows all subjects ✅ | ✅ |
| Add form — exam type | 281-299 | Mid-Sem / End-Sem / Quiz dropdown ✅ | ✅ |
| Add form — date/time | 301-320 | datetime-local input ✅ | ✅ |
| Add form — syllabus topics | 322-341 | Comma-separated text input → parsed into checklist ✅ | ✅ |
| Add form — Submit | 344 | `handleCreateExam()` adds to DB ✅ | ✅ |
| Detail sheet — subject + type | 389-396 | Shows code, type, name, date with icon ✅ | ✅ |
| Detail sheet — syllabus checklist | 400-447 | Toggleable checklist items with strike-through ✅ | ✅ |
| Detail sheet — Delete button | 449-463 | Confirm → soft delete → closes sheet ✅ | ✅ |
| Detail sheet — Close button | 464-477 | Closes sheet ✅ | ✅ |
| Toggle syllabus item | 61-69 | Flips `completed` boolean, updates DB ✅ | ✅ |

---

## 8. Analytics/Performance — `AnalyticsView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Tab selector (Attendance/Tasks/Study) | 44-66 | Segmented control ✅ | ✅ |
| Attendance tab — overall % ring | 69-105 | Donut chart via CSS conic-gradient ✅ | ✅ |
| Attendance tab — weekday absence bar chart | 108-139 | Mon-Sun bars, blue/red color coding ✅ | ✅ |
| Attendance tab — subject ranking | 143-171 | Sorted by attendance %, color-coded ✅ | ✅ |
| Attendance tab — at-risk warning | 173-184 | Alert banner for subjects below 75% ✅ | ✅ |
| Tasks tab — stats cards (total, completed, in-progress, todo) | 192-228 | Four stat cards ✅ | ✅ |
| Tasks tab — priority distribution | 232-253 | Horizontal bars for urgent/high/medium/low ✅ | ✅ |
| Tasks tab — overdue alert | 255-266 | Shows count of overdue tasks ✅ | ✅ |
| Tasks tab — subject task distribution | 268-306 | Per-subject task counts ✅ | ✅ |
| Study tab — placeholder | 310-317 | "Study analytics coming soon" ✅ | ✅ |

---

## 9. Semester Setup — `SemesterSetupView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Semester cards | 48-81 | Shows label, date range, active badge ✅ | ✅ |
| "Set Active" button | 63 | Deactivates all, activates this one ✅ | ✅ |
| Edit button | 67-69 | Opens form with existing data ✅ | ✅ |
| Delete button | 73-76 | Confirm → soft delete ✅ | ✅ |
| "Add Semester" button | 40-44 | Opens empty form ✅ | ✅ |
| Form — label input | 39-44 | Required ✅ | ✅ |
| Form — start/end dates | 46-47 | Required, date inputs ✅ | ✅ |
| Form — Save | 48 | Creates or updates semester ✅ | ✅ |

---

## 10. Manage Subjects — `ManageSubjectsView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Subject cards | 41-60 | Shows color bar, code, name, credits, faculty, edit/delete ✅ | ✅ |
| "Add" button | 35-38 | Opens bottom sheet ✅ | ✅ |
| Color picker (8 locked tokens) | 76-90 | Click to select, blue ring on active ✅ | ✅ |
| Form — code input | 100-107 | Text input, placeholder "2AI501" | ⚠️ No uniqueness validation |
| Form — name input | 109-116 | Text input | ⚠️ No validation |
| Form — credits | 118-125 | Number input, min 0, max 10 | ✅ |
| Form — faculty | 127-134 | Text input ✅ | ✅ |
| Form — Submit | 59 | Creates or updates subject | ⚠️ No duplicate code check |
| Delete subject | 86-87 | Confirm dialog → soft delete ✅ | ✅ |

---

## 11. Timetable Builder — `TimetableBuilderView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Day chips (Mon-Sun) | 111-130 | Filter patterns by day ✅ | ✅ |
| Pattern cards | 134-167 | Shows subject badge, time range, room, faculty, delete button ✅ | ✅ |
| Pattern card — delete | 152-158 | Soft delete ✅ | ✅ |
| "Add Pattern" button | 103 | Toggles form ✅ | ✅ |
| Pattern form — subject select | 138-154 | Dropdown ✅ | ✅ |
| Pattern form — day select | 155-165 | Dropdown Mon-Sun ✅ | ✅ |
| Pattern form — start time | 166-176 | time input, default 09:00 | ⚠️ No start < end validation |
| Pattern form — end time | 177-187 | time input, default 10:15 | ⚠️ No start < end validation |
| Pattern form — room | 188-198 | Text input ✅ | ✅ |
| Pattern form — Submit | 103 | Validates + generates slots + commits ✅ | ✅ |
| Pattern form — Cancel | 211 | Resets form ✅ | ✅ |
| Slot generation | 24-68 | `generateSlotsForPattern()` creates one slot per week per pattern ✅ | ✅ |
| Commit to DB | 71-87 | Validates subjects exist, bulk-creates missing subjects + all slots ✅ | ✅ |
| Success banner | 90-95 | "Added {n} lecture slots" ✅ | ✅ |

---

## 12. Timetable Import — `TimetableImportView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| JSON textarea | 69-77 | Paste or type JSON ✅ | ✅ |
| "Copy Conversion Prompt" button | 78-80 | Copies `CONVERSION_PROMPT` to clipboard, shows "Copied ✓" for 2s ✅ | ✅ |
| "Load Sample JSON" button | 83-85 | Pre-fills sample timetable ✅ | ✅ |
| "Validate JSON Payload" button | 86-88 | `handleValidate()` → parses, checks structure, shows preview ✅ | ✅ |
| Validation — JSON parse | 164-166 | try/catch with error message ✅ | ✅ |
| Validation — subjects array check | 168 | ✅ | ✅ |
| Validation — patterns array check | 171 | ✅ | ✅ |
| Validation — subject_code resolution | 179-192 | Checks all pattern codes have matching subjects, shows warning for unresolvable ✅ | ✅ |
| Validation — preview panel | 194-214 | Shows subjects defined, patterns, slot count estimate, warnings ✅ | ✅ |
| "Commit Import" button | 216-220 | `handleCommitImport()` ✅ | ✅ |
| Commit — creates subjects | 204-209 | Skips existing codes (dedup by code), auto-assigns token colors ✅ | ✅ |
| Commit — generates slots | 211-213 | Calls `generateSlotsForPattern` for each pattern ✅ | ✅ |
| Commit — bulk inserts | 221-224 | `bulkAdd` for subjects + slots ✅ | ✅ |
| Commit — success banner | 225-230 | Shows counts ✅ | ✅ |
| CONVERSION_PROMPT content | 35-56 | Documents all rules: 1=Monday encoding, no lab subjects, no color field, HH:MM 24h, confirm-only ✅ | ✅ |

---

## 13. Calendar Import — `AcademicCalendarImportView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| JSON textarea | 58-65 | Paste or type JSON ✅ | ✅ |
| "Load Sample JSON" button | 68-70 | Pre-fills sample calendar ✅ | ✅ |
| "Validate & Preview" button | 71-73 | `handleValidate()` ✅ | ✅ |
| Validation — JSON parse | 51-53 | try/catch ✅ | ✅ |
| Validation — events array check | 57 | ✅ | ✅ |
| Validation — preview panel | 75-86 | Shows semester defaults, events list ✅ | ✅ |
| "Commit to Database" button | 88-90 | `handleCommitImport()` ✅ | ✅ |
| Commit — semester defaults | 92-96 | Creates semester if none exists, activates it ✅ | ✅ |
| Commit — events | 98-115 | Dedup by `date|title|type`, skips existing, adds new ✅ | ✅ |
| Commit — success banner | 116-121 | Shows counts + navigates to Calendar Events ✅ | ✅ |
| "Copy AI Conversion Prompt" button | 123-125 | Copies prompt to clipboard ✅ | ✅ |

---

## 14. Calendar Events — `CalendarEventsView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Event type filter chips | 55-72 | All + individual types ✅ | ✅ |
| Event cards (grouped by month) | 74-124 | Month header + event list with colored type badge, date, title, description ✅ | ✅ |
| Edit button | 126 | Opens form with existing data ✅ | ✅ |
| Delete button | 127 | Confirm → soft delete ✅ | ✅ |
| "Add" button | 51-53 | Opens empty form ✅ | ✅ |
| Form — title | 77 | Text input ✅ | ✅ |
| Form — date | 78 | Date input ✅ | ✅ |
| Form — type | 79-83 | Dropdown with 4 types ✅ | ✅ |
| Form — description | 84 | Text input ✅ | ✅ |
| Form — Submit | 62 | Creates or updates ✅ | ✅ |
| "Reset to Defaults" button | 130-132 | Confirm → `handleResetToDefaults()` ✅ | ✅ |
| Reset logic | 90-120 | Reactivates defaults, deletes edited defaults, adds missing defaults, adds new custom events ✅ | ✅ |
| "Manage Semester Dates" link | 135-137 | Navigates to semester-setup ✅ | ✅ |

---

## 15. Faculty Directory — `DirectoryView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Teacher cards | 28-68 | Shows name, email, cabin, office hours, phone, subject badges ✅ | ✅ |
| Contact icons | 52-56 | Email, phone, map pin, clock icons ✅ | ✅ |
| Empty state | 23-26 | "No faculty records found" ✅ | ✅ |
| Subject color bar | 38 | Derived from first taught subject's color ✅ | ✅ |

### Directory Note: No seeded teacher data
- `src/db/seeds.ts` — `seedDatabaseIfEmpty` does NOT seed any teachers
- The directory will always show "No faculty records found" until Phase 2 integration

---

## 16. Resources Shelf — `ResourcesView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Subject filter dropdown | 56-68 | Filter by subject ✅ | ✅ |
| Resource cards (grouped by subject) | 70-109 | Shows type icon, title, subject badge, description, external link ✅ | ✅ |
| External link button | 105 | `window.open(url)` ✅ | ✅ |
| "Add Resource" button | 52-54 | Opens form ✅ | ✅ |
| Form — title | 67 | Required ✅ | ✅ |
| Form — subject | 68 | Required dropdown ✅ | ✅ |
| Form — type | 69-73 | PDF/Drive/GitHub/URL/Other ✅ | ✅ |
| Form — URL | 74 | Required, text input | ⚠️ No URL format validation |
| Form — description | 75 | Optional ✅ | ✅ |
| Form — Submit | 52 | Adds to DB ✅ | ✅ |
| Delete button | 119 | Confirm → soft delete ✅ | ✅ |
| Empty state | 85-88 | "No resources saved" ✅ | ✅ |
| Type icon mapping | 7-13 | PDF→FileText, Drive→Link, GitHub→Github, URL→Globe ✅ | ✅ |

---

## 17. Profile — `ProfileView.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Theme toggle (Dark/Light) | 38-39 | `toggleTheme()` → sets `data-theme` attribute ✅ | ✅ |
| "Manage Database" button | 41-42 | Navigates to manage-subjects | ⚠️ Misleading label — opens Manage Subjects, not a DB management view |
| "Manage Subjects" button | 44 | Navigates to manage-subjects ✅ | ✅ |
| "Semesters & Dates" button | 46 | Navigates to semester-setup ✅ | ✅ |
| "Build Timetable Pattern" button | 48 | Navigates to timetable-builder ✅ | ✅ |
| "Import Timetable JSON" button | 50 | Navigates to timetable-import ✅ | ✅ |
| "Import Academic Calendar JSON" button | 52 | Navigates to calendar-import ✅ | ✅ |
| "Calendar Events" button | 54 | Navigates to calendar-events ✅ | ✅ |
| "Faculty Directory" button | 56 | Navigates to directory ✅ | ✅ |
| "Resources Shelf" button | 58 | Navigates to resources ✅ | ✅ |
| "Export JSON Backup" button | 108 | Downloads full DB as JSON ✅ | ✅ |
| "Delete All Data" button | 112-115 | Opens confirmation sheet ✅ | ✅ |
| Confirmation sheet — "DELETE" input | 124-135 | Must type "DELETE" to enable button ✅ | ✅ |
| Confirm action | 137-138 | Exports backup → clears all tables → sets localStorage flag → reloads ✅ | ✅ |
| "Reload App" button | 78-86 | `window.location.reload()` ✅ | ✅ |
| Active semester display | 93-98 | Shows semester label + date range ✅ | ✅ |
| Stats row | 100-106 | Total subjects, credits, calendar events ✅ | ✅ |
| Version display | 141 | Shows "Version 0.1.0 — Phase 1 Complete" ✅ | ✅ |

---

## 18. Bottom Navigation — `TabBar.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Home tab | 14 | `onSelectTab('home')` ✅ | ✅ |
| Schedule tab | 15 | `onSelectTab('schedule')` ✅ | ✅ |
| Tasks tab | 16 | `onSelectTab('tasks')` ✅ | ✅ |
| Profile tab | 17 | `onSelectTab('profile')` ✅ | ✅ |
| Active state styling | 28 | Blue color + thicker stroke ✅ | ✅ |
| Safe area padding | CSS | `padding-bottom: env(safe-area-inset-bottom)` via `.nav-bar-safe` class ✅ | ✅ |

---

## 19. App Shell — `App.tsx`

| Element | Line | Behavior | Status |
|---------|------|----------|--------|
| Database seeding | 35-38 | `seedDatabaseIfEmpty()` on mount ✅ | ✅ |
| Theme initialization | 40-43 | Reads theme from store, applies to `<html>` ✅ | ✅ |
| Subview routing | 59-84 | Maps `activeSubview` to component, with fallback ✅ | ✅ |
| ErrorBoundary wrap | 54, 88 | Entire app wrapped ✅ | ✅ |
| TabBar + main content | 77-83 | Flex layout with `flex: 1; min-height: 0` for scroll containment ✅ | ✅ |
| Subview scroll reset | 79-80 | `key={activeSubview || activeTab}` forces remount on navigation ✅ | ✅ |

---

## Summary: Bugs & Issues Found

### 🔴 Bugs
1. **Dashboard "View Schedule" opens Timetable Builder** — `QuietDashboard.tsx:53` navigates to `timetable-builder` subview instead of the Schedule tab. Misleading label.
2. **"Manage Database" button in Profile opens Manage Subjects** — `ProfileView.tsx:41-42` navigates to `manage-subjects`, not a database management view. Misleading.

### 🟡 Medium Issues
3. **No time validation** — start_time can be after end_time in TimetableBuilder, SlotDetailSheet reschedule, and WeeklyGrid extra class forms (3 locations)
4. **No subject code uniqueness check** — duplicate codes can be created in ManageSubjectsView and TimetableImportView
5. **No unsaved-changes protection** in Notes editor — clicking Back discards without confirmation
6. **Task cards are clickable `<div>` without `role="button"` or keyboard access** — `TasksView.tsx:168`
7. **No URL validation** in ResourcesView form — any string is accepted as a URL

### 🟢 Minor / Informational
8. No skeleton loaders (acceptable for IndexedDB speed)
9. "Add Task" quick-link opens full Tasks view, not inline add form
10. No `aria-label` on icon-only buttons (covered in a11y section)
11. Teacher directory always empty — no seeded data yet (by design, Phase 2)
