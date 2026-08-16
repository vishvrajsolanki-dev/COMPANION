# User Personas — Student Academic OS

**Document ID:** `03_USER_PERSONAS`  
**Author:** Principal Software Architect  
**Status:** Approved / Frozen Under Architecture Freeze  
**Primary References:** [Student_OS_PRD.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#3-persona), [Student_OS_PRD.md §8](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#8-user-flows-core-three), [01_PRD_REVIEW.md §Risks](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#risks)  
**Target Audience:** Product Managers, UX Architects, Frontend Engineers, AI Implementation Agents  

---

## 1. Persona Landscape Overview

Student Academic OS is explicitly tailored for a hyper-focused single-user domain. Unlike commercial SaaS platforms designed for heterogeneous user bases, Student Academic OS optimizes for the longitudinal evolving needs of a single engineering student across four academic years (8 semesters). 

```
                                USER PERSONA EVOLUTION (2025 – 2029)
┌───────────────────────────────────────┬───────────────────────────────────────┬───────────────────────────────────────┐
│     PRIMARY PERSONA (YEARS 1 - 4)     │      FUTURE PERSONA (YEAR 4 / ALUMNI) │     SECONDARY PERSONA (PEER/STUDY)    │
│  Vishvraj Solanki                     │  Vishvraj (Alumni / Career Transition)│  Academic Peer / Study Group Member   │
│  • Daily execution & attendance math  │  • Historical archive lookup          │  • Exported schedule consumer         │
│  • Dual-device offline-first PWA      │  • Portfolio & project asset showcase │  • Shared syllabus checklist viewer   │
└───────────────────────────────────────┴───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Primary Persona: Vishvraj Solanki (Active Engineering Student)

### 2.1 Profile Summary
- **Identity:** Vishvraj Solanki  
- **Academic Standing:** B.Tech Student in Artificial Intelligence & Data Science (AI & DS)  
- **Institution:** A.D. Patel Institute of Technology (ADIT) / CVM University  
- **Timeline:** 4-Year Academic Lifecycle (Batch 2025–2029, Semesters 1 to 8)  
- **Technical Competency:** Highly proficient (AI & DS student, comfortable with local deployment, terminal commands, markdown, git, and custom automation).  

---

### 2.2 Device Environment & Hardware Footprint

```
                             DUAL-DEVICE OPERATIONAL ECOSYSTEM
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│           ANDROID SMARTPHONE (PWA)           │    ┌│            WINDOWS LAPTOP (PWA / DESKTOP)    │
│ • Usage: On-the-go, during/between lectures  │    │ • Usage: Lab sessions, evening study, coding  │
│ • Primary Interaction: Touch, Quick Mark FAB │    │ • Primary Interaction: Keyboard shortcuts,   │
│ • Network: Unstable cellular / Campus Wi-Fi  │ <==> Command Palette (Cmd+K), Markdown Editor     │
│ • Storage: IndexedDB primary local cache     │    │ • Network: Home Wi-Fi / Campus Ethernet      │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

---

### 2.3 Operational Mindset & Psychological Triggers
1. **Low Friction Priority:** Half-asleep before a 9:05 AM lecture, needing immediate clarity. Zero tolerance for slow loading, splash screens, complex navigation, or login prompts.
2. **Attendance Anxiety & Mathematical Precision:** CVM University strictly enforces a **75% minimum attendance rule** for exam eligibility. Vishvraj needs exact, live percentage feedback and "Safe-to-Skip" calculations that dynamically exclude cancelled lectures.
3. **Information Fragmentation Stress:** Annotations, verbal announcements ("Class moved to Room 302", "Assignment due Friday"), lab batch splits, and lecture notes scatter quickly across physical notebooks, WhatsApp groups, and gallery screenshots.
4. **Offline Reality:** Campus lecture halls and basement computer labs frequently have zero cellular reception or blocked Wi-Fi. The application MUST work seamlessly offline without spinner lockups or broken views.

---

### 2.4 Core Pain Points

| Category | Pain Point | System Solution / Feature |
| :--- | :--- | :--- |
| **Attendance** | Manual math error resulting in attendance falling below 75% | Automated 5-state tracking + live "Safe-to-Skip" calculation ([Student_OS_PRD.md §14](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#14-attendance-system)) |
| **Timetable** | Forgetting verbal room/faculty/slot overrides announced in class | Inline lecture slot overrides + substitute teacher tracking ([Student_OS_PRD.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#5-missing-features-added-this-round)) |
| **Notes** | Scattered lecture notes lost before mid-sem exams | Tagged Markdown note engine cross-linked to subjects & lecture dates ([Student_OS_PRD.md §16](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#16-notes-system)) |
| **Exams** | Panic over syllabus coverage & exam dates | Exam module with countdown push alerts & syllabus checklist ([Student_OS_PRD.md §19](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#19-exam-module)) |
| **Data Preservation** | Losing past semester records when moving to new semesters | Soft-delete everywhere + Semester Archive module ([Student_OS_PRD.md §23](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#23-database-architecture)) |

---

### 2.5 Daily Usage Workflows

#### Workflow 1: Morning Briefing (8:30 AM – Pre-Lecture)
- **Context:** Waking up / traveling to campus before 9:05 AM class.
- **Goal:** Know next class, room number, attendance buffer, and tasks due today in < 3 seconds.
- **Flow:** Opens PWA on Android -> Dashboard renders instantly from IndexedDB -> Sees "Data Structures (Room 204, Prof. Patel)" + Attendance 82% (Safe to skip: 2 lectures) + "Lab Report 2 due today".

#### Workflow 2: Post-Lecture Quick Capture & Attendance (10:00 AM)
- **Context:** Lecture finishes, leaving 5 minutes before the next slot.
- **Goal:** Mark attendance for the slot and capture any quick homework or note.
- **Flow:** Receives dismissible notification prompt / opens PWA -> Taps slot -> Marks `Present` (1 tap) -> Uses Quick Capture FAB to record "Assignment 3 given: Q1-Q5 due Monday" tagged to #DataStructures.

#### Workflow 3: Unannounced Schedule Shift Handling (1:30 PM)
- **Context:** Faculty announces verbally that tomorrow's 2:00 PM lecture is moved to Room 105 with a substitute teacher.
- **Goal:** Record override without breaking the master weekly timetable pattern.
- **Flow:** Opens Timetable -> Selects tomorrow 2:00 PM slot -> Taps "Override Slot" -> Sets Room = 105, Substitute = Prof. Shah, Status = Rescheduled -> Save. Master pattern remains untouched for subsequent weeks.

#### Workflow 4: Evening Study & Markdown Note Taking (7:00 PM)
- **Context:** Working on Windows laptop at home/hostel desk.
- **Goal:** Review lecture notes, complete tasks, prepare for upcoming lab viva.
- **Flow:** Opens PWA desktop layout -> Navigates to Notes / Tasks -> Uses Markdown editor with split preview -> Attaches PDF reference -> Checks off subtasks for assignment.

#### Workflow 5: Pre-Exam Revision & Syllabus Sweep (2 Weeks Pre-Exam)
- **Context:** Mid-semester or End-semester exams approaching.
- **Goal:** Track syllabus completion and locate all relevant notes.
- **Flow:** Opens Exam Prep module -> Selects "AI Fundamentals Mid-Sem" -> Sweeps checklist checkboxes -> Reviews linked markdown notes tagged `#exam-important`.

---

## 3. Future Persona: Vishvraj (Year 4 & Alumni / Career Transition)

### 3.1 Profile Summary
- **Timeline:** Semester 8 (2029) and Post-Graduation.
- **Context:** Preparing for placement drives, higher studies, or industry roles. Looking back across 4 years of stored academic history.
- **Core Requirements:**
  1. **Historical Querying:** Accessing notes, code snippets, and syllabus coverage from Semester 2 or 3 to refresh core fundamentals.
  2. **CGPA/SGPA Trend Analysis:** Verifying exact credit breakdowns and semester-by-semester SGPA trends for resume documentation.
  3. **Architectural Portfolio Showcase:** Utilizing the self-hosted Student Academic OS codebase and clean documentation as a software engineering portfolio asset ([01_PRD_REVIEW.md §Future Expansion](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#future-expansion-opportunities)).

---

## 4. Secondary Persona: Academic Peer / Study Group Partner

### 4.1 Profile Summary
- **Identity:** ADIT Classmate or Lab Partner.
- **Interaction Model:** Read-only / Export consumer.
- **Core Requirements:**
  1. **Timetable JSON Sharing:** Consuming exported timetable structure JSON to align lab batch slots.
  2. **Shared Exam Checklists:** Reviewing shared syllabus coverage or study resource links exported from Vishvraj's OS.
