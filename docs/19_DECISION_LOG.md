# Architecture Decision Log (ADR) — Student Academic OS

**Document ID:** `19_DECISION_LOG`  
**Author:** Engineering Director / Principal Architect  
**Status:** Approved / Active Repository Record  
**Primary References:** [Student_OS_PRD.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md), [01_PRD_REVIEW.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md), [06_SYSTEM_ARCHITECTURE.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md)  
**Target Audience:** Core Developers, System Architects, Technical Reviewers, AI Implementation Agents  

---

## Executive Overview

This document records the official **Architecture Decision Records (ADRs)** for **Student Academic OS**. Every key design decision, trade-off, rejected alternative, and future review trigger across the 4-year project lifecycle is cataloged below to ensure total engineering transparency.

---

## Decision Records Index

1. [ADR-001: Tailscale Private Mesh Isolation vs Public Endpoints](#adr-001-tailscale-private-mesh-isolation-vs-public-endpoints)
2. [ADR-002: Dual Primary Database Store (Dexie.js + Neon Postgres)](#adr-002-dual-primary-database-store-dexiejs--neon-postgres)
3. [ADR-003: 5-State Attendance Calculation Engine & Formula](#adr-003-5-state-attendance-calculation-engine--formula)
4. [ADR-004: Explicit Multi-Device Conflict Queue for Attendance](#adr-004-explicit-multi-device-conflict-queue-for-attendance)
5. [ADR-005: Soft-Delete Everywhere & Historical Immutability](#adr-005-soft-delete-everywhere--historical-immutability)
6. [ADR-006: Active Semester Partitioning for 4-Year Performance](#adr-006-active-semester-partitioning-for-4-year-performance)
7. [ADR-007: Attachment Storage on VM Disk / R2 vs DB Blobs](#adr-007-attachment-storage-on-vm-disk--r2-vs-db-blobs)
8. [ADR-008: In-Process node-cron with External Email Failover](#adr-008-in-process-node-cron-with-external-email-failover)
9. [ADR-009: Pre-Normalized Event Store (`AnalyticsEvent`) for Deferred AI](#adr-009-pre-normalized-event-store-analyticsevent-for-deferred-ai)
10. [ADR-010: Offline-First Client Architecture with Dexie `useLiveQuery`](#adr-010-offline-first-client-architecture-with-dexie-uselivequery)

---

## Detailed Decision Logs

### ADR-001: Tailscale Private Mesh Isolation vs Public Endpoints
- **Status:** Accepted
- **Confidence Level:** High (95%)
- **Problem:** Exposing a single-user Node/Express API to the public internet protected only by a PIN presents significant security risks from automated scanning botnets ([01_PRD_REVIEW.md §Security Concerns](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#security-concerns)).
- **Alternatives Considered:** 
  1. Public REST API with Let's Encrypt TLS + OAuth2 / JWT authentication.
  2. Public REST API protected by Cloudflare Access / Rate Limiting.
- **Chosen Solution:** Isolate the API within a private **Tailscale Mesh Network** (`100.x.y.z`). Block all public HTTP/S ports on the Oracle VM firewall.
- **Reasoning:** Eliminates the public attack surface entirely, removes Let's Encrypt renewal maintenance cycles, and costs $0.
- **Trade-offs:** Client devices (Android phone, Windows laptop) must run the Tailscale client.
- **Consequences:** API cannot be accessed from untrusted guest devices without Tailscale node authorization.
- **Future Review Trigger:** If multi-user public sharing features are introduced in Year 4.
- **Related Specs:** [06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture), [15_SECURITY_ARCHITECTURE.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/15_SECURITY_ARCHITECTURE.md#2-stride-threat-analysis-matrix).

---

### ADR-002: Dual Primary Database Store (Dexie.js + Neon Postgres)
- **Status:** Accepted
- **Confidence Level:** High (98%)
- **Problem:** Pure cloud database queries fail when cellular reception drops in campus lecture halls; pure local storage risks data loss on device loss.
- **Alternatives Considered:** 
  1. Cloud-only database (Neon Postgres) with standard HTTP caching.
  2. Client-only database (IndexedDB) with manual JSON file export backups.
- **Chosen Solution:** Dual database architecture: Client IndexedDB (via Dexie.js) as primary local read/write store, mirrored asynchronously to Neon Postgres over Tailscale.
- **Reasoning:** Guarantees 100% offline capability with $<10\text{ms}$ local execution while preserving cloud durability.
- **Trade-offs:** Requires asynchronous reconciliation and conflict handling logic.
- **Related Specs:** [07_DATABASE_ARCHITECTURE.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#1-database-design-philosophy), [11_OFFLINE_AND_SYNC.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#1-offline-philosophy--data-ownership).

---

### ADR-003: 5-State Attendance Calculation Engine & Formula
- **Status:** Accepted
- **Confidence Level:** High (100%)
- **Problem:** Binary (Present/Absent) attendance tracking fails to model CVM University's official academic policy, which recognizes Late, Medical Leave, On-Duty, and Cancelled lectures ([Student_OS_PRD.md §14](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#14-attendance-system)).
- **Chosen Solution:** Implement 5-state attendance tracking (`Present`, `Absent`, `Late`, `Medical`, `On-Duty`) and auto-exclude cancelled lectures from the denominator:
$$\text{Percentage} = \frac{\text{Present} + \text{Late} + \text{Medical} + \text{OnDuty}}{\text{Scheduled} - \text{Cancelled}}$$
- **Reasoning:** Matches exact university evaluation logic, eliminating manual math errors.
- **Related Specs:** [04_USER_FLOWS.md §Flow 02](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/04_USER_FLOWS.md#flow-02-single-slot-5-state-attendance-marking), [07_DATABASE_ARCHITECTURE.md §3.4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#34-entity-attendancerecord).

---

### ADR-004: Explicit Multi-Device Conflict Queue for Attendance
- **Status:** Accepted
- **Confidence Level:** High (95%)
- **Problem:** Naive Last-Write-Wins (LWW) sync silently overwrites attendance records marked on separate offline devices (e.g. phone vs laptop), corrupting 75% attendance math ([01_PRD_REVIEW.md §Weakness #1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#weaknesses)).
- **Chosen Solution:** Enforce explicit conflict logging (`SyncConflictLog`) and prompt the user with an interactive UI resolution modal when high-stakes entity versions collide.
- **Trade-offs:** Requires user intervention when multi-device offline collisions occur.
- **Related Specs:** [11_OFFLINE_AND_SYNC.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#3-conflict-detection--merge-strategies).

---

### ADR-005: Soft-Delete Everywhere & Historical Immutability
- **Status:** Accepted
- **Confidence Level:** High (100%)
- **Problem:** Accidental user deletion of subjects, past notes, or faculty records permanently destroys 4-year academic history.
- **Chosen Solution:** Flag deletions using `isDeleted: boolean` and `deletedAt: timestamp`. Execute zero hard `DELETE` SQL queries or Dexie calls.
- **Related Specs:** [00_PROJECT_OVERVIEW.md §5.3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/00_PROJECT_OVERVIEW.md#53-soft-delete-everywhere--historical-immutability), [07_DATABASE_ARCHITECTURE.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#3-comprehensive-entity-specifications--schema-dictionary).

---

### ADR-006: Active Semester Partitioning for 4-Year Performance
- **Status:** Accepted
- **Confidence Level:** High (95%)
- **Problem:** Querying 4 years of stored lecture slots (~2,000 slots) on every app open slows down performance over time.
- **Chosen Solution:** Partition client queries by default to `Semester.is_active = true`. Move historical semesters to a read-mostly `Semester Archive` module ([01_PRD_REVIEW.md §Scalability](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#scalability-concerns)).
- **Related Specs:** [05_INFORMATION_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/05_INFORMATION_ARCHITECTURE.md#screen-10-semester-archive-archive), [07_DATABASE_ARCHITECTURE.md §5.1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#51-semester-partitioning--data-lifecycle).

---

### ADR-007: Attachment Storage on VM Disk / R2 vs DB Blobs
- **Status:** Accepted
- **Confidence Level:** High (98%)
- **Problem:** Storing PDF/image attachments directly inside Postgres bytea columns causes database bloat and slows down automated backups ([01_PRD_REVIEW.md §Scalability](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#scalability-concerns)).
- **Chosen Solution:** Store file attachments on the VM filesystem or Cloudflare R2 object storage (10GB free tier). The database stores lightweight JSON file references only.
- **Related Specs:** [06_SYSTEM_ARCHITECTURE.md §7](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#7-architecture-trade-offs--rejected-alternatives), [07_DATABASE_ARCHITECTURE.md §5.2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#52-file-attachment-storage-strategy).

---

### ADR-008: In-Process node-cron with External Email Failover
- **Status:** Accepted
- **Confidence Level:** High (90%)
- **Problem:** Third-party push services risk discontinuation; if the VM crashes, in-process push engines die and cannot alert the user of VM failure ([01_PRD_REVIEW.md §Weakness #3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#weaknesses)).
- **Chosen Solution:** Run an in-process `node-cron` daemon for minute-precision VAPID push alerts. Use an external heartbeat ping (UptimeRobot) to send an **Email Alert** if the VM goes down.
- **Related Specs:** [12_NOTIFICATION_SYSTEM.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/12_NOTIFICATION_SYSTEM.md#5-vm-downtime--failure-failover-pipeline).

---

### ADR-009: Pre-Normalized Event Store (`AnalyticsEvent`) for Deferred AI
- **Status:** Accepted
- **Confidence Level:** High (95%)
- **Problem:** Layering future AI/ML features (Phase 7+) could require expensive database schema rewrites if historical telemetry is missing.
- **Chosen Solution:** Deploy an append-only JSONB event log (`AnalyticsEvent`) from Day 1 to record structured user action sequences without blocking core functionality ([Student_OS_PRD.md §23](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#23-database-architecture)).
- **Related Specs:** [13_ANALYTICS_SYSTEM.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/13_ANALYTICS_SYSTEM.md#2-append-only-telemetry-schema-analyticsevent), [14_AI_ARCHITECTURE.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/14_AI_ARCHITECTURE.md#1-ai-system-roadmap--zero-break-philosophy).

---

### ADR-010: Offline-First Client Architecture with Dexie `useLiveQuery`
- **Status:** Accepted
- **Confidence Level:** High (100%)
- **Problem:** Standard REST data-fetching patterns cause loading spinners, blank screens, and network errors when offline.
- **Chosen Solution:** React components subscribe directly to local IndexedDB tables using Dexie's `useLiveQuery` hook. UI updates execute locally in $<10\text{ms}$; HTTP APIs execute asynchronously in the background.
- **Related Specs:** [09_FRONTEND_ARCHITECTURE.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#4-state-management--reactive-data-layer).
