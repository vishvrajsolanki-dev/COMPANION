# REST API Specification — Student Academic OS

**Document ID:** `08_API_SPECIFICATION`  
**Author:** Principal Software Architect  
**Status:** Approved / Frozen Under Architecture Freeze  
**Primary References:** [Student_OS_PRD.md §24](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#24-api-design), [01_PRD_REVIEW.md §Security](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#security-concerns), [06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture)  
**Target Audience:** Backend Engineers, Frontend Engineers, Integration Developers, AI Implementation Agents  

---

## 1. REST API Overview & Protocol Guidelines

### 1.1 Base Transport & Network Boundary
- **Protocol:** HTTP/1.1 or HTTP/2 over TLS 1.3
- **Network Boundary:** Accessible **exclusively** via the private **Tailscale Mesh Network** (`100.x.y.z` range). The API is NOT exposed to public internet interfaces ([06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture)).
- **Base URL:** `http://100.64.0.1:4000/api/v1` (or internal Tailscale DNS `http://student-os-vm.tailnet:4000/api/v1`)
- **Versioning:** URI Path Versioning (`/api/v1/...`).

### 1.2 Common Headers

| Header Name | Type | Mandatory? | Description |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `string` | Yes | Must be `application/json` (or `multipart/form-data` for uploads) |
| `X-Student-OS-PIN-Token` | `string` | Yes | Hashed session token verifying user PIN authorization |
| `X-Client-Id` | `string` | Yes | Unique identifier of client device (e.g. `phone-pwa-v1`) |
| `X-Client-Timestamp` | `string` | Yes | ISO-8601 timestamp of request origination on client |

---

## 2. Standardized Response & Error Schemas

### 2.1 Standard Success Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-08-04T19:07:00.000Z",
  "data": {}
}
```

### 2.2 Standard Error Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-08-04T19:07:00.000Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Start time must precede end time",
    "details": [
      { "field": "endTime", "issue": "Must be greater than startTime" }
    ]
  }
}
```

---

## 3. Detailed Endpoint Specifications

### 3.1 Module: Dashboard

#### `GET /api/v1/dashboard`
- **Purpose:** Pre-aggregated payload returning next class, slot strip, attendance risk subjects, due tasks, and sync metadata in a single network round-trip ([Student_OS_PRD.md §24](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#24-api-design)).
- **Method:** `GET`
- **Authentication:** Required (`X-Student-OS-PIN-Token`)
- **Query Parameters:** None.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-08-04T19:07:00.000Z",
  "data": {
    "activeSemester": { "id": "sem-1-uuid", "label": "Semester 1 (Fall 2025)" },
    "nextClass": {
      "slotId": "slot-101-uuid",
      "subjectCode": "2AI01",
      "subjectName": "Data Structures",
      "roomName": "Room 204",
      "teacherName": "Prof. Patel",
      "startTime": "2026-08-05T09:05:00.000Z",
      "endTime": "2026-08-05T10:00:00.000Z"
    },
    "attendanceRisks": [
      {
        "subjectId": "subj-2-uuid",
        "subjectCode": "2AI02",
        "subjectName": "Discrete Math",
        "currentPercentage": 71.4,
        "safeToSkipCount": 0
      }
    ],
    "tasksDueToday": [
      { "taskId": "task-50-uuid", "title": "Lab Report 2", "priority": "high", "dueAt": "2026-08-04T23:59:00.000Z" }
    ]
  }
}
```

---

### 3.2 Module: Attendance & Marking

#### `POST /api/v1/attendance/mark`
- **Purpose:** Record or update a single lecture slot attendance mark (5 states).
- **Method:** `POST`
- **Authentication:** Required
- **Request Body:**
```json
{
  "lectureSlotId": "slot-101-uuid",
  "status": "present",
  "markedAt": "2026-08-04T10:05:00.000Z",
  "editReason": "Initial mark post-lecture"
}
```
- **Validation Rules:**
  - `status` MUST be one of: `'present'`, `'absent'`, `'late'`, `'medical'`, `'onduty'`.
  - `lectureSlotId` MUST reference a valid, non-deleted `LectureSlot`.
  - Marking future slot dates is BLOCKED at API validation level ([Student_OS_PRD.md §7](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#7-edge-cases)).
- **Success Response (201 Created / 200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "attendanceRecordId": "rec-99-uuid",
    "updatedSubjectPercentage": 84.6,
    "safeToSkipCount": 3
  }
}
```

#### `POST /api/v1/attendance/bulk-mark`
- **Purpose:** Bulk mark multiple slots for a day (e.g. "Mark All Present").
- **Request Body:**
```json
{
  "date": "2026-08-04",
  "status": "present",
  "slotIds": ["slot-101-uuid", "slot-102-uuid", "slot-103-uuid"]
}
```

---

### 3.3 Module: Synchronization & Conflict Resolution

#### `POST /api/v1/sync/reconcile`
- **Purpose:** Batch client mutation queue reconciliation against remote Neon Postgres DB ([06_SYSTEM_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#4-offline--synchronization-architecture)).
- **Method:** `POST`
- **Request Body:**
```json
{
  "lastSyncedTimestamp": "2026-08-04T18:00:00.000Z",
  "mutations": [
    {
      "entityName": "AttendanceRecord",
      "action": "UPSERT",
      "recordId": "rec-99-uuid",
      "clientVersion": 2,
      "data": {
        "lectureSlotId": "slot-101-uuid",
        "status": "present",
        "markedAt": "2026-08-04T10:05:00.000Z"
      }
    }
  ]
}
```
- **Error Response (409 Conflict):**
```json
{
  "success": false,
  "statusCode": 409,
  "error": {
    "code": "SYNC_CONFLICT_DETECTED",
    "message": "1 collision detected requiring user resolution",
    "conflicts": [
      {
        "conflictLogId": "log-12-uuid",
        "entityName": "AttendanceRecord",
        "recordId": "rec-99-uuid",
        "clientData": { "status": "present", "markedAt": "2026-08-04T10:05:00.000Z" },
        "serverData": { "status": "absent", "markedAt": "2026-08-04T10:04:00.000Z" }
      }
    ]
  }
}
```

#### `POST /api/v1/sync/resolve-conflict`
- **Purpose:** User submits resolution decision for a flagged conflict.
- **Request Body:**
```json
{
  "conflictLogId": "log-12-uuid",
  "chosenWinner": "client",
  "resolvedData": { "status": "present" }
}
```

---

### 3.4 Module: Data Import & Export

#### `POST /api/v1/data/import`
- **Purpose:** Full JSON database import with conflict checking ([Student_OS_PRD.md §26](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#26-import--export)).
- **Request Body:** Complete JSON dump containing `subjects`, `lectureSlots`, `teachers`, `rooms`.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "importedCounts": { "subjects": 6, "lectureSlots": 140 },
    "conflictWarnings": []
  }
}
```

#### `GET /api/v1/data/export`
- **Purpose:** On-demand export of full raw database JSON for off-site backup.

---

### 3.5 Module: Health & Observability

#### `GET /api/v1/health`
- **Purpose:** Lightweight heartbeat ping endpoint used by VM uptime checker ([04_USER_FLOWS.md §Flow 15](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-15-vm-downtime-detection--email-failover-alerting)).
- **Response:** `{ "status": "UP", "database": "CONNECTED", "cron": "RUNNING" }`
