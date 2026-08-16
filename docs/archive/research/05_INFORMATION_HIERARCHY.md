# Information Hierarchy & Attention Flow — Student Academic OS

**Document ID:** `05_INFORMATION_HIERARCHY`  
**Author:** Head of Product Design  
**Status:** Approved Discovery Report  
**Primary References:** [Student_OS_PRD.md §10, §12](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#10-screen-by-screen-breakdown), [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-by-screen-breakdown--ui-layout-hierarchy)  
**Target Audience:** Information Architects, UX Designers, Frontend Developers  

---

## 1. Information Priority & Attention Flow

Information density and visual priority in **Student Academic OS** follow the **3-Second Attention Hierarchy**:
1. **Primary Focal Point (0–1 sec):** *What class is next and where is it?*
2. **Secondary Focal Point (1–2 sec):** *Am I at attendance risk, and what is due today?*
3. **Tertiary Depth (2–3+ sec):** *Detailed subject history, notes search, and long-term analytics.*

---

## 2. Module Information Hierarchies

### 2.1 Dashboard Information Hierarchy
```
[Priority 1] Next Class Hero Card (Subject, Room, Faculty, Countdown)
[Priority 2] Persistent Header Sync Status Badge (🟢 Synced / 🟠 Offline)
[Priority 3] Today's Timetable Slot Strip (Horizontal chronological pills)
[Priority 4] Attendance Risk Banner (CONDITIONAL: Renders ONLY if attendance < 75%)
[Priority 5] Tasks Due Today Checklist (Top 3 urgent items)
[Priority 6] Quick-Capture Floating Action Button (FAB)
```

---

### 2.2 Attendance Center Information Hierarchy
```
[Priority 1] Big Subject Percentage Badges (e.g. "84.6%")
[Priority 2] Safe-to-Skip Count Pill (e.g. "Safe to skip: 2 lectures")
[Priority 3] Subject Progress Bar with 75% Threshold Marker Line
[Priority 4] Calendar Attendance Heatmap Grid
[Priority 5] Backfill Forgotten Dates Action Button
[Priority 6] Audit Trail Edit Log (Inlined drawer)
```

---

### 2.3 Timetable Engine Information Hierarchy
```
[Priority 1] Weekly Schedule Grid / Daily Stream Tabs
[Priority 2] Active Slot Indicators (Color-coded by subject)
[Priority 3] Exception Status Badges (Rescheduled, Cancelled, Extra)
[Priority 4] Slot Detail Sheet (Inline 5-state marking buttons)
```

---

### 2.4 Task Management Information Hierarchy
```
[Priority 1] Due Today / Overdue Section Header
[Priority 2] Task Title & Subject Tag Chip
[Priority 3] Priority Level Badge (Low, Medium, High, Urgent)
[Priority 4] Subtask Progress Counter (e.g. "2/5 done")
[Priority 5] Task Dependency Lock Icon (Blocked by Task X)
```

---

### 2.5 Notes Engine Information Hierarchy
```
[Priority 1] Note Title & Subject Folder Breadcrumb
[Priority 2] Markdown Body Workspace
[Priority 3] Tag Chips & Attachment Cards (PDF/Images)
[Priority 4] Version History Audit Drawer
```

---

### 2.6 Analytics Hub Information Hierarchy
```
[Priority 1] Target SGPA / CGPA Solvers & Program Credit Gauge
[Priority 2] Attendance Trend Lines & Weekday Absence Heatmaps
[Priority 3] Task Completion Velocity Graphs
```

---

### 2.7 Command Palette & Search Hierarchy
```
[Priority 1] Search Input Bar with Instant Fuzzy Match Results
[Priority 2] Category Grouping: Navigation -> Subjects -> Notes -> Tasks -> Actions
[Priority 3] Keyboard Shortcut Badges (e.g. "⏎ to select")
```

---

### 2.8 Settings & Sync Hierarchy
```
[Priority 1] Sync Status & Tailscale Mesh Gateway Connection Health
[Priority 2] Automated Off-Site GitHub Backup Status & Manual Export Button
[Priority 3] Theme Configuration & Notification Quiet Hours Rules
```
