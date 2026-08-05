# Open Questions & Engineering Inquiries — Student Academic OS

**Document ID:** `21_OPEN_QUESTIONS`  
**Author:** Engineering Director  
**Status:** Active Repository Log  
**Primary References:** [Student_OS_PRD.md](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md), [01_PRD_REVIEW.md §Open Questions](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#open-questions), [06_SYSTEM_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#6-resilience--monitoring-strategy)  
**Target Audience:** Engineering Manager, Lead Architects, Technical Reviewers  

---

## Unresolved Inquiries Matrix

| ID | Description | Priority | Impact | Decision Owner |
| :--- | :--- | :--- | :--- | :--- |
| **Q-001** | Backup Encryption Passphrase Storage Strategy | LOW | Non-Blocking | Lead Architect |
| **Q-002** | Phase 1 Single-Device vs Multi-Device Sync Rollout | MEDIUM | Non-Blocking | Product Owner |
| **Q-003** | Public Portfolio Showcase Architecture Export | LOW | Non-Blocking | Developer / Vishvraj |
| **Q-004** | Local Vector Search Engine Selection for Phase 7+ AI | LOW | Non-Blocking | AI Systems Architect |
| **Q-005** | Browser Storage Quota Pressure Warning Banner | MEDIUM | Non-Blocking | UX / Frontend Lead |

---

## Detailed Question Logs

### Q-001: Off-Site Backup Encryption Key Management Strategy
- **Description:** Should automated nightly off-site backups pushed to the private GitHub repository be encrypted using a user-managed master passphrase or an auto-generated server key file ([01_PRD_REVIEW.md §Open Questions](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#open-questions))?
- **Why It Matters:** User-managed passphrases require manual input during disaster recovery; server key files risk loss if the VM disk dies completely.
- **Possible Approaches:**
  1. User enters a master encryption passphrase during initial server setup.
  2. Server generates a key pair and displays a 24-word recovery seed phrase during setup.
- **Recommended Next Step:** Adopt Option 2 (24-word recovery seed phrase) during Phase 3 backend deployment.
- **Priority:** LOW | **Status:** Non-Blocking | **Owner:** Lead Architect.
- **Related Specs:** [06_SYSTEM_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#6-resilience--monitoring-strategy), [15_SECURITY_ARCHITECTURE.md §3](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/15_SECURITY_ARCHITECTURE.md#3-cryptographic--secret-management-standards).

---

### Q-002: Phase 1 Single-Device MVP vs Multi-Device Sync Rollout
- **Description:** Should two-device offline sync be tested during Phase 1, or kept strictly deferred to Phase 3 as scheduled ([01_PRD_REVIEW.md §Open Questions](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#open-questions))?
- **Why It Matters:** Attempting multi-device sync in Phase 1 increases scope before core attendance math is validated locally.
- **Possible Approaches:**
  1. Keep Phase 1 strictly local single-device (IndexedDB only).
  2. Prototype sync endpoints early in Phase 1.
- **Recommended Next Step:** Strictly adhere to Option 1 (Single-device Phase 1 MVP).
- **Priority:** MEDIUM | **Status:** Non-Blocking | **Owner:** Product Owner / Vishvraj.
- **Related Specs:** [18_ROADMAP.md §2](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/18_ROADMAP.md#2-milestone-phase-breakdown).

---

### Q-003: Public Portfolio Showcase Architecture Export
- **Description:** Should a sanitized version of the architecture documentation be automatically generated at the conclusion of Phase 3 for inclusion in engineering portfolios ([01_PRD_REVIEW.md §Future Expansion](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#future-expansion-opportunities))?
- **Why It Matters:** High portfolio value for resume/LinkedIn documentation.
- **Recommended Next Step:** Defer export script creation to Phase 6.
- **Priority:** LOW | **Status:** Non-Blocking | **Owner:** Vishvraj.

---

### Q-004: Local Vector Embeddings Engine Choice for Phase 7+ AI
- **Description:** Which client-side vector search library (MiniSearch, Orama, or Transformers.js + LanceDB WASM) should power Phase 7+ semantic note search?
- **Why It Matters:** Affects client JS bundle size and WASM initialization overhead.
- **Recommended Next Step:** Defer selection until Phase 7 research.
- **Priority:** LOW | **Status:** Non-Blocking | **Owner:** AI Systems Architect.
- **Related Specs:** [14_AI_ARCHITECTURE.md §5](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/14_AI_ARCHITECTURE.md#5-local-vector-embeddings--privacy-controls).

---

### Q-005: Browser Storage Quota Pressure Warning Banner
- **Description:** How should the app alert the student if their browser's IndexedDB storage approaches browser storage eviction limits?
- **Recommended Next Step:** Add a `navigator.storage.estimate()` check inside Settings page in Phase 6.
- **Priority:** MEDIUM | **Status:** Non-Blocking | **Owner:** UX / Frontend Lead.
- **Related Specs:** [09_FRONTEND_ARCHITECTURE.md §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/09_FRONTEND_ARCHITECTURE.md#6-pwa-lifecycle--cache-invalidation-strategy).
