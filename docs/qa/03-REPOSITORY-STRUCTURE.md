# REPOSITORY STRUCTURE & CLEANUP PROPOSAL

**Project**: Academic OS  
**Date**: August 16, 2026  
**Status**: Proposal (Awaiting User Approval Prior to Execution)

---

## 1. Overview

This document presents the **CURRENT vs. PROPOSED** repository layout. The objective is to organize documentation, scripts, design artifacts, and tests into clear, standardized directories, keeping the repository root minimal and GitHub-ready.

---

## 2. Directory Transformation Summary

```
CURRENT ROOT (24 files, 18 directories)
├── ADMIN_GUIDE.md
├── APP_GUIDE.md
├── DEPLOY.md
├── DESIGN_SYSTEM.md
├── FEATURES_MAP.md
├── HANDOFF.md
├── RELEASE_NOTES.md
├── adit_calendar.pdf
├── claude-free.bat
├── design-prototypes/
│   ├── Analytics/
│   ├── Calendar/
│   └── ...
├── scripts/
│   ├── shots/ (mobile PNG screenshots)
│   └── *.cjs (30+ one-off audit scripts)
└── ...

PROPOSED CLEAN ROOT (10 core config files, 6 clean directories)
├── .github/                      # CI/CD workflows
├── docs/                         # Consolidated documentation hub
│   ├── architecture/             # Frontend architecture & data flow
│   ├── design/                   # Stitch design spec & design tokens
│   ├── guides/                   # App, Admin, and Deployment guides
│   ├── qa/                       # QA audits, regression tests, cleanup proposals
│   └── releases/                 # Release notes & changelogs
├── e2e/                          # Playwright E2E test suites
├── public/                       # Static web manifest, PWA icons, favicon
├── scripts/                      # Operational & seed scripts
│   ├── db/                       # DB migration & key management scripts
│   └── qa/                       # Automated QA verification utilities
├── src/                          # TypeScript React 18 application source
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── wrangler.toml
├── .gitignore
└── README.md
```

---

## 3. Structural Reorganization Detail

| Directory / File Category | Current Location | Proposed Destination | Rationale |
|---|---|---|---|
| **App Guide** | `APP_GUIDE.md` | `docs/guides/APP_GUIDE.md` | Clean root layout |
| **Admin Guide** | `ADMIN_GUIDE.md` | `docs/guides/ADMIN_GUIDE.md` | Clean root layout |
| **Deployment Guide** | `DEPLOY.md` | `docs/guides/DEPLOY.md` | Clean root layout |
| **Design System Doc** | `DESIGN_SYSTEM.md` | `docs/design/DESIGN_SYSTEM.md` | Consolidated design hub |
| **Release Notes** | `RELEASE_NOTES.md` | `docs/releases/RELEASE_NOTES.md` | Release tracking |
| **Features Map** | `FEATURES_MAP.md` | `docs/FEATURES_MAP.md` | Feature documentation |
| **Root Handoff Duplicate**| `HANDOFF.md` (Root) | Consolidated with `docs/HANDOFF.md` | Deduplication |
| **Legacy PDF Reference** | `adit_calendar.pdf` | `docs/references/adit_calendar.pdf` | References archive |
| **Pre-Stitch Prototypes** | `design-prototypes/` | `docs/archive/design-prototypes/` | Historical archive |
| **Mobile Screenshots** | `scripts/shots/` | `docs/archive/screenshots/` | Historical archive |
| **One-Off Verification** | `scripts/*.cjs` | `scripts/qa/` or `scripts/db/` | Operational grouping |

---

## 4. Recommended Order of Operations (Post-Approval)

1. **Step 1**: Move root markdown documentation files to `docs/guides/`, `docs/design/`, and `docs/releases/`.
2. **Step 2**: Reorganize `scripts/` into operational subdirectories (`scripts/db/`, `scripts/qa/`).
3. **Step 3**: Archive legacy prototypes (`design-prototypes/`) and PDF reference files into `docs/archive/`.
4. **Step 4**: Remove temporary timestamp files (`vite.config.ts.timestamp-*.mjs`).
5. **Step 5**: Perform Git hygiene verification (`git status`) to verify zero broken imports.
6. **Step 6**: Execute `npm run build` and `npm run test` to verify complete repository integrity.
