# FRONTEND DATA FLOW SPECIFICATION

**Project**: Academic OS  
**Date**: August 16, 2026  
**Pattern**: Local-First Reactive Data Flow (`UI` → `Component` → `State/Store` → `Service/Dexie` → `Live Query` → `UI`)

---

## 1. Data Flow Architecture Standard

Every feature domain in Academic OS complies with the Local-First state pipeline:

```
[User Action in UI]
       │
       ▼
[React View Component]
       │
       ▼
[Zustand Store / Custom Hook Handler]
       │
       ▼
[Dexie.js Service Mutation (Async Write to IndexedDB)]
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[Local Dexie DB Update]        [Background Sync to Supabase] (If online)
       │
       ▼
[dexie-react-hooks (useLiveQuery)]
       │
       ▼
[Reactive State Re-render in UI]
```

---

## 2. Feature Data Flow Maps

### A. Timetable & Attendance Flow
1. **UI**: Student taps "Mark Present" inside `SlotDetailSheet.tsx` or `QuietDashboard.tsx`.
2. **Component**: Invokes `markAttendance(slotId, 'present', date)` from `useAcademicData()`.
3. **Service**: Writes a record into Dexie table `db.attendanceRecords.put({ id, slotId, status: 'present', date })`.
4. **Local DB**: IndexedDB transaction completes locally asynchronously.
5. **Reactive Return**: `useLiveQuery` detects table update and emits refreshed `attendanceRecords` array to `QuietDashboard` & `AttendanceView`.
6. **UI Update**: Progress gauge recalculates instantly; stat card updates.

---

### B. Tasks Flow
1. **UI**: Student submits "New Task" form in `TasksView.tsx`.
2. **Component**: Assembles `TaskItem` object `{ title, dueDate, subjectId, completed: false }`.
3. **Service**: Invokes `db.tasks.add(newTask)`.
4. **Local DB**: Persists task record locally.
5. **Reactive Return**: `useLiveQuery` updates tasks query subscriber in `TasksView.tsx`.
6. **UI Update**: Task appears instantly in the "Pending Tasks" list.

---

### C. Notes Flow
1. **UI**: Student edits markdown note content in `NotesView.tsx`.
2. **Component**: Debounced `onChange` handler calls `saveNote(noteId, title, content, subjectId)`.
3. **Service**: Calls `db.notes.put({ id, title, content, updatedAt: new Date() })`.
4. **Local DB**: Saved in IndexedDB `notes` store.
5. **Reactive Return**: Live query returns updated notes list sorted by `updatedAt`.
6. **UI Update**: Note list status updates to "Saved".

---

### D. Exams Flow
1. **UI**: Student adds exam entry in `ExamsView.tsx`.
2. **Component**: Construct `ExamItem` object with exam date, subject, and syllabus weightage.
3. **Service**: Calls `db.exams.add(newExam)`.
4. **Local DB**: Stored in `exams` table.
5. **Reactive Return**: `useLiveQuery` recalculates upcoming exams count.
6. **UI Update**: Exam banner appears on Today Dashboard.

---

### E. Resources Flow
1. **UI**: Student adds web link or drive PDF in `ResourcesView.tsx`.
2. **Component**: Builds `ResourceItem` payload `{ title, url, type, subjectId }`.
3. **Service**: Calls `db.resources.add(resource)`.
4. **Local DB**: Saved locally in IndexedDB `resources` table.
5. **Reactive Return**: Live query re-renders categorized resource list.
6. **UI Update**: Resource card appears under subject filter.

---

### F. Analytics Flow
1. **UI**: Student switches to `#study/analytics`.
2. **Component**: Reads live `attendanceRecords`, `tasks`, `exams`, and `academicSlots` via `useAcademicData()`.
3. **Derived Calculation**: Passes raw arrays into `attendanceMath.ts` and `attendanceTrend.ts`.
4. **Pure Function Output**: Computes current percentage, projected trend, and task completion metrics.
5. **UI Update**: Renders SVG progress ring and stat tiles without secondary DB queries.

---

### G. Account & Student Profile Flow
1. **UI**: Student updates target attendance or name in `ProfileView.tsx`.
2. **Component**: Calls `saveProfile(updatedProfile)` in `profileStore.ts`.
3. **Store & DB**: Updates Zustand `profileStore` state and persists to `db.studentProfile.put()`.
4. **UI Update**: App header greeting and target indicators re-render across all hubs.

---

### H. Activation & Onboarding Flow
1. **UI**: User enters 16-character access key on `ActivationView.tsx`.
2. **Component**: Submits code to `accessKeys.ts` validation service.
3. **Service**: Evaluates rate limits (`accessKeyRateLimit.ts`) and verifies key locally or against Supabase RPC `verify_access_key`.
4. **State Transition**: On success, invokes `authStore.getState().activate(role, keyData)`.
5. **UI Update**: Hash router unlocks main application shell `#today`.
