# DOCUMENTATION CONSOLIDATION AUDIT

**Project**: Academic OS  
**Date**: August 16, 2026  
**Authoritative Visual Source**: `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md` (Stitch Project ID `10253714570536683011`)  
**Authoritative Frontend Architecture**: `docs/architecture/FRONTEND_ARCHITECTURE.md`

---

## 1. Classification Categories
1. **CURRENT / AUTHORITATIVE**: Primary source of truth for design, architecture, guides, PRD, or active specifications.
2. **DUPLICATE — MERGE**: Documents that overlap significantly with an authoritative document and should be consolidated.
3. **LEGACY — ARCHIVE**: Historical phase plans, old research, or completed overhaul specs preserved in `docs/archive/`.
4. **OBSOLETE — DELETE**: Outdated audit logs, duplicate handoff drafts, or temporary markdown artifacts with zero reference value.
5. **UNCERTAIN — DO NOT TOUCH**: Items requiring explicit maintainer review.

---

## 2. Comprehensive Inventory Audit Matrix

| Document | Classification | Canonical? | Duplicate Of | Keep/Merge/Archive/Delete | Reason |
|---|---|---|---|---|---|
| `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative Stitch visual & interaction design contract |
| `docs/architecture/FRONTEND_ARCHITECTURE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative v0.2.0 frontend architecture specification |
| `docs/architecture/FRONTEND_CODEBASE_MAP.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative codebase directory & component map |
| `docs/architecture/FRONTEND_DATA_FLOW.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative Local-First data flow specification |
| `docs/Student_OS_PRD.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative product requirements document |
| `docs/guides/APP_GUIDE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative user application guide |
| `docs/guides/ADMIN_GUIDE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative administration portal guide |
| `docs/guides/DEPLOY.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Authoritative deployment guide |
| `docs/releases/RELEASE_NOTES.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Release notes and version history |
| `docs/FEATURES_MAP.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Complete feature inventory matrix |
| `docs/00_PROJECT_OVERVIEW.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Core project summary |
| `docs/06_SYSTEM_ARCHITECTURE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Full system architecture specification |
| `docs/07_DATABASE_ARCHITECTURE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Database schema & Dexie table definitions |
| `docs/08_API_SPECIFICATION.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Supabase RPC & API contract |
| `docs/10_BACKEND_ARCHITECTURE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Backend & database boundary spec |
| `docs/11_OFFLINE_AND_SYNC.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Local-First IndexedDB sync policy |
| `docs/15_SECURITY_ARCHITECTURE.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Security & RLS policy spec |
| `docs/16_TESTING_STRATEGY.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Testing strategy document |
| `docs/qa/REAL_DEVICE_UI_SWEEP.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Real-device responsive sweep log |
| `docs/qa/REPOSITORY_CLEANUP_AUDIT.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Repository classification audit log |
| `docs/qa/REPOSITORY_STRUCTURE_PROPOSAL.md` | **CURRENT / AUTHORITATIVE** | ✅ YES | None | **KEEP** | Repository structure proposal |
| `docs/design/DESIGN_SYSTEM.md` | **DUPLICATE — MERGE** | ❌ NO | `01-ACADEMIC-OS-STITCH-DESIGN.md` | **MERGE & ARCHIVE** | Pre-Stitch design system notes; consolidate non-conflicting tokens to design spec |
| `docs/09_FRONTEND_ARCHITECTURE.md` | **DUPLICATE — MERGE** | ❌ NO | `architecture/FRONTEND_ARCHITECTURE.md` | **MERGE & ARCHIVE** | Early initial architecture document; superseded by `docs/architecture/FRONTEND_ARCHITECTURE.md` |
| `docs/HANDOFF.md` | **DUPLICATE — MERGE** | ❌ NO | `docs/releases/RELEASE_NOTES.md` | **MERGE & ARCHIVE** | Milestone 16 handoff notes; retain historical context in `docs/archive/` |
| `docs/superpowers/plans/2026-08-15-academic-os-ui-overhaul.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical Milestone plan for the UI Overhaul pass |
| `docs/design/00_DESIGN_RESEARCH.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical pre-Stitch design research |
| `docs/design/01_COMPETITOR_ANALYSIS.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical competitor research |
| `docs/design/02_VISUAL_DIRECTIONS.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical visual exploration options |
| `docs/design/03_MOODBOARDS.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical moodboard references |
| `docs/design/04_INTERACTION_PHILOSOPHY.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Early interaction design draft |
| `docs/design/05_INFORMATION_HIERARCHY.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Early hierarchy exploration |
| `docs/design/06_DESIGN_COMPARISON_MATRIX.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical design matrix |
| `docs/design/07_VISUAL_EXPLORATION_REPORT.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Pre-Stitch visual exploration summary |
| `scripts/FACULTY-DIRECTORY-RESEARCH.md` | **LEGACY — ARCHIVE** | ❌ NO | None | **ARCHIVE** | Historical ADIT faculty scraping notes |
| `scripts/FULL-STACK-AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REPOSITORY_CLEANUP_AUDIT.md` | **DELETE** | Superseded early repository audit log |
| `scripts/QA-AUDIT-2026-08-07.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REAL_DEVICE_UI_SWEEP.md` | **DELETE** | Outdated intermediate QA log |
| `scripts/QA-AUDIT-2026-08-08.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REAL_DEVICE_UI_SWEEP.md` | **DELETE** | Outdated intermediate QA log |
| `scripts/FUNCTIONAL-QA-PASS.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REAL_DEVICE_UI_SWEEP.md` | **DELETE** | Outdated intermediate QA log |
| `docs/ARCHITECTURE_AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/architecture/FRONTEND_ARCHITECTURE.md` | **DELETE** | Superseded intermediate audit log |
| `docs/DOCUMENTATION_AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/DOCUMENTATION_CONSOLIDATION_AUDIT.md` | **DELETE** | Superseded intermediate audit log |
| `docs/ENGINEERING_SYSTEMS_AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REPOSITORY_CLEANUP_AUDIT.md` | **DELETE** | Superseded intermediate audit log |
| `docs/FINAL_DOCUMENTATION_AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/DOCUMENTATION_CONSOLIDATION_AUDIT.md` | **DELETE** | Superseded intermediate audit log |
| `docs/26_REPOSITORY_AUDIT.md` | **OBSOLETE — DELETE** | ❌ NO | `docs/qa/REPOSITORY_CLEANUP_AUDIT.md` | **DELETE** | Superseded repository audit file |

---

## 3. Proposed Final `docs/` Directory Tree

```
docs/
├── Student_OS_PRD.md                     # Primary Product Requirements Document
├── FEATURES_MAP.md                       # Feature Matrix
├── 00_PROJECT_OVERVIEW.md                # Project Overview
├── architecture/                         # Authoritative Technical Architecture Hub
│   ├── FRONTEND_ARCHITECTURE.md          # Primary Frontend Architecture Spec
│   ├── FRONTEND_CODEBASE_MAP.md          # Codebase Directory & Component Map
│   ├── FRONTEND_DATA_FLOW.md             # Local-First Data Flow Specification
│   ├── SYSTEM_ARCHITECTURE.md            # Overall System Architecture
│   ├── DATABASE_ARCHITECTURE.md          # Dexie & SQL Schema Architecture
│   ├── API_SPECIFICATION.md              # Supabase RPC & API Contract
│   ├── BACKEND_ARCHITECTURE.md           # Backend Boundary Specification
│   └── SECURITY_ARCHITECTURE.md          # Security & RLS Policy Spec
├── design/                               # Authoritative Visual & Design System Hub
│   └── 01-ACADEMIC-OS-STITCH-DESIGN.md # Primary Canonical Design Contract (Stitch)
├── guides/                               # Documentation & Operational Guides
│   ├── APP_GUIDE.md                      # Application User Guide
│   ├── ADMIN_GUIDE.md                    # Admin Portal Guide
│   └── DEPLOY.md                         # Deployment Guide
├── qa/                                   # QA Audits & Test Results Hub
│   ├── REAL_DEVICE_UI_SWEEP.md           # Real-Device UI Defect Sweep Log
│   ├── REPOSITORY_CLEANUP_AUDIT.md       # Repository Inventory & Classification
│   ├── REPOSITORY_STRUCTURE_PROPOSAL.md  # Clean Repository Structure Proposal
│   └── DOCUMENTATION_CONSOLIDATION_AUDIT.md # Documentation Consolidation Matrix
├── releases/                             # Release Notes & Changelogs
│   └── RELEASE_NOTES.md                  # Application Release Changelog
├── references/                           # Institutional Reference Data & Assets
│   └── adit_calendar.pdf                 # ADIT Academic Calendar Reference PDF
└── archive/                              # Historical Planning & Exploration Archive
    ├── plans/                            # Past Overhaul Plans (2026-08-15 UI Overhaul)
    ├── research/                         # Pre-Stitch Research (00-07 Design Files)
    └── design-prototypes/                # Legacy Pre-Stitch HTML Prototypes
```

---

*Documentation Consolidation Audit complete. Zero files deleted or moved during this pass. Awaiting approval prior to consolidation execution.*
