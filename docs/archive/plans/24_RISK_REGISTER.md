# Master Engineering Risk Register — Student Academic OS

**Document ID:** `24_RISK_REGISTER`  
**Author:** Engineering Director  
**Status:** Approved / Active Risk Management Matrix  
**Primary References:** [01_PRD_REVIEW.md §Risks](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#risks), [06_SYSTEM_ARCHITECTURE.md §6, §7](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#6-resilience--monitoring-strategy), [15_SECURITY_ARCHITECTURE.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/15_SECURITY_ARCHITECTURE.md#2-stride-threat-analysis-matrix), [17_DEPLOYMENT.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/17_DEPLOYMENT.md#4-disaster-recovery--vm-migration-runbook)  
**Target Audience:** Engineering Leadership, Systems Engineers, DevOps Leads, AI Implementation Agents  

---

## Risk Severity Matrix Definition

$$\text{Severity Score} = \text{Likelihood (1–3)} \times \text{Impact (1–3)}$$

- **1–2 (Low):** Standard monitoring.
- **3–4 (Medium):** Active mitigation strategy required.
- **6–9 (High / Critical):** Architectural safeguards mandatory.

---

## Engineering Risk Register

### Risk RSK-01: Oracle Cloud Free VM Reclamation
- **Category:** Infrastructure / Operational
- **Description:** Oracle Cloud reclaims inactive "Always Free" VM instances, causing backend API and background cron scheduler outage ([01_PRD_REVIEW.md §Risks](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#risks)).
- **Likelihood:** Medium (2) | **Impact:** Critical (3) | **Severity Score:** **6 (High)**
- **Mitigation:** In-process node-cron executes light compute ping. Automated nightly JSON data dump pushes encrypted database snapshots to a private GitHub repository ([17_DEPLOYMENT.md §1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/17_DEPLOYMENT.md#1-production-infrastructure-architecture--topology)).
- **Contingency Plan:** Execute 15-minute host migration runbook to restore server on Fly.io or backup VPS ([17_DEPLOYMENT.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/17_DEPLOYMENT.md#4-disaster-recovery--vm-migration-runbook)).
- **Owner:** Systems Engineer | **Review Frequency:** Monthly | **Status:** Active.

---

### Risk RSK-02: Two-Device Offline Edit Collision & Data Overwrite
- **Category:** Technical / Data Integrity
- **Description:** Phone and laptop mark attendance differently while offline; naive sync overwrites data silently ([01_PRD_REVIEW.md §Weakness #1](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#weaknesses)).
- **Likelihood:** Medium (2) | **Impact:** High (3) | **Severity Score:** **6 (High)**
- **Mitigation:** Enforce explicit `SyncConflictLog` conflict detection for `AttendanceRecord` entities, prompting the student with an interactive resolution modal ([11_OFFLINE_AND_SYNC.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/11_OFFLINE_AND_SYNC.md#3-conflict-detection--merge-strategies)).
- **Contingency Plan:** Roll back to pre-sync IndexedDB state snapshot if resolution fails.
- **Owner:** Lead Backend Architect | **Review Frequency:** Quarterly | **Status:** Active.

---

### Risk RSK-03: Public API Scanning & Unauthorized Access
- **Category:** Security
- **Description:** Automated bot scanners discover and attempt unauthorized PIN brute-force attacks on exposed Express API ports.
- **Likelihood:** High (3) | **Impact:** High (3) | **Severity Score:** **9 (Critical)**
- **Mitigation:** Lock backend API access exclusively inside a private WireGuard **Tailscale Mesh Network**. Block all incoming public HTTP ports on Oracle VM firewall ([06_SYSTEM_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#5-security--network-boundary-architecture)).
- **Contingency Plan:** Instantly revoke compromised Tailscale node key from Tailscale admin console.
- **Owner:** Security Lead | **Review Frequency:** Semi-Annual | **Status:** Active.

---

### Risk RSK-04: Service Worker Stale JavaScript Serving
- **Category:** Technical / UX
- **Description:** PWA service worker serves stale JS bundles after a deployment, causing client app bugs ([01_PRD_REVIEW.md §Weakness #5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#weaknesses)).
- **Likelihood:** Medium (2) | **Impact:** Medium (2) | **Severity Score:** **4 (Medium)**
- **Mitigation:** Inject versioned content-hashed asset manifest into `sw.js` and surface an immediate "Update Available" toast alert ([09_FRONTEND_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#6-pwa-lifecycle--cache-invalidation-strategy)).
- **Contingency Plan:** Provide a manual "Clear Cache & Reload" button in Settings.
- **Owner:** Frontend Lead | **Review Frequency:** Quarterly | **Status:** Active.

---

### Risk RSK-05: Database Bloat from File Attachments
- **Category:** Performance / Infrastructure
- **Description:** PDF/image note attachments stored in Postgres cause database bloat and slow backups.
- **Likelihood:** Low (1) | **Impact:** Medium (2) | **Severity Score:** **2 (Low)**
- **Mitigation:** Store attachments on VM filesystem or Cloudflare R2 object storage (10GB free tier); database holds lightweight file references only ([07_DATABASE_ARCHITECTURE.md §5.2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/07_DATABASE_ARCHITECTURE.md#52-file-attachment-storage-strategy)).
- **Owner:** Backend Lead | **Review Frequency:** Semi-Annual | **Status:** Active.
