# REPOSITORY CLEANUP & CLASSIFICATION AUDIT

**Project**: Academic OS  
**Date**: August 16, 2026  
**Status**: Comprehensive Inventory (No Deletions Performed)

---

## 1. Executive Summary

This audit classifies all files and directories across the Academic OS repository to prepare for production repository hygiene, GitHub readiness, and backend/database hardening. **Zero files have been deleted during this phase.**

---

## 2. File & Directory Classification

### Legend
- **A. REQUIRED RUNTIME**: Production app source, styles, assets, configuration (`src/`, `public/`, `index.html`, `vite.config.ts`, `package.json`).
- **B. REQUIRED DEVELOPMENT**: Tooling, types, build configs (`tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `vite.config.ts`).
- **C. REQUIRED TESTING**: E2E suites, unit tests, mock fixtures (`e2e/`, `src/**/__tests__/`).
- **D. REQUIRED DOCUMENTATION**: Core architecture, design specs, user guides (`docs/`, `DESIGN_SYSTEM.md`, `APP_GUIDE.md`, `RELEASE_NOTES.md`).
- **E. REQUIRED DEPLOYMENT/CI**: GitHub Actions, Wrangler/Supabase deployment scripts (`.github/`, `supabase/`, `wrangler.toml`).
- **F. GENERATED/BLOCKED FROM GIT**: Build outputs, temporary node modules, OS files (`dist/`, `node_modules/`, `test-results/`, `.vite/`).
- **G. TEMPORARY/DEBUG**: Ad-hoc node scripts, temporary test outputs (`scripts/*.cjs`, `vite.config.ts.timestamp-*`).
- **H. LEGACY/OBSOLETE**: Outdated HTML visual prototypes, legacy PDF references (`design-prototypes/`, `adit_calendar.pdf`).
- **I. DUPLICATE**: Redundant root markdown files that duplicate docs folder specs (`HANDOFF.md`, `ADMIN_GUIDE.md`).
- **J. UNCERTAIN**: Files requiring user/maintainer decision (`claude-free.bat`, `skills-lock.json`).

---

## 3. Inventory & Proposed Action Matrix

| Path | Classification | Why | Referenced By | Safe To Remove? | Recommended Action |
|---|---|---|---|---|---|
| `src/` | **A** | Primary React 18 TypeScript application source | `main.tsx`, `index.html` | ❌ NO | Preserve |
| `public/` | **A** | Static PWA icons, favicon, web manifest | `vite.config.ts`, `index.html` | ❌ NO | Preserve |
| `supabase/` | **E** | SQL migrations 0005–0007 & RLS security policies | Supabase CLI, production DB | ❌ NO | Preserve |
| `e2e/` | **C** | 246 Playwright E2E tests (visual, responsive, motion) | `playwright.config.ts` | ❌ NO | Preserve |
| `docs/design/01-ACADEMIC-OS-STITCH-DESIGN.md` | **D** | Canonical Stitch design contract | UI components, CSS tokens | ❌ NO | Preserve |
| `docs/architecture/` | **D** | Core architecture specifications | Developer docs | ❌ NO | Preserve |
| `docs/qa/` | **D** | QA sweep inventory & audit logs | Developer docs | ❌ NO | Preserve |
| `package.json` | **A/B** | Project dependencies, scripts, engines | Node, npm, Vite, Vitest | ❌ NO | Preserve |
| `package-lock.json` | **A/B** | Locked dependency tree | npm install | ❌ NO | Preserve |
| `tsconfig.json` | **B** | TypeScript compiler configuration | `npm run build`, Vite | ❌ NO | Preserve |
| `vite.config.ts` | **B** | Vite bundler & PWA plugin config | `npm run dev/build` | ❌ NO | Preserve |
| `vitest.config.ts` | **B** | Vitest unit/integration test config | `npm run test` | ❌ NO | Preserve |
| `playwright.config.ts` | **B** | Playwright E2E configuration | `npx playwright test` | ❌ NO | Preserve |
| `wrangler.toml` | **E** | Cloudflare Pages deployment config | Cloudflare deployment | ❌ NO | Preserve |
| `.gitignore` | **B** | Git ignore rules | Git VCS | ❌ NO | Preserve |
| `.env.example` | **B** | Template environment variables | Developers | ❌ NO | Preserve |
| `.env.local` | **F** | Local environment secrets (ignored) | Vite runtime | ❌ NO (Local runtime) | Keep in .gitignore |
| `vite.config.ts.timestamp-*.mjs` | **G** | Temporary Vite build artifact | None | ✅ YES | Remove upon approval |
| `HANDOFF.md` (Root) | **I** | Duplicate of `docs/HANDOFF.md` | None | ✅ YES | Move/Consolidate to `docs/` |
| `ADMIN_GUIDE.md` (Root) | **I** | Root level admin guide | None | ✅ YES | Move to `docs/guides/` |
| `APP_GUIDE.md` (Root) | **D** | Product application guide | Developer docs | ❌ NO | Move to `docs/guides/` |
| `DESIGN_SYSTEM.md` (Root) | **D** | Design system documentation | Developer docs | ❌ NO | Move to `docs/design/` |
| `RELEASE_NOTES.md` (Root) | **D** | Release changelog | Developer docs | ❌ NO | Move to `docs/releases/` |
| `FEATURES_MAP.md` (Root) | **D** | Feature matrix documentation | Developer docs | ❌ NO | Move to `docs/` |
| `DEPLOY.md` (Root) | **E/D** | Deployment instructions | Developer docs | ❌ NO | Move to `docs/deployment/` |
| `adit_calendar.pdf` | **H** | Legacy PDF reference file | `scripts/` (historical) | ✅ YES | Archive or remove |
| `design-prototypes/` | **H** | Pre-Stitch HTML prototype files | None | ✅ YES | Archive or remove |
| `scripts/shots/` | **G/H** | Legacy PNG screenshot captures | None | ✅ YES | Remove upon approval |
| `scripts/*.cjs` | **G** | Ad-hoc one-off JS verification scripts | Internal dev (historical) | ⚠️ UNCERTAIN | Retain in `scripts/qa/` |
| `claude-free.bat` | **J** | Local API launcher script (ignored) | Maintainer local setup | ❌ NO (Local utility) | Keep in `.gitignore` |

---

## 4. Secret Exposure Audit

| File Path | Secret Type | Tracked in Git? | Status | Recommended Action |
|---|---|---|---|---|
| `.env.local` | Supabase Anon Key / URL | ❌ NO (Ignored) | Safe | Ensure `.gitignore` entry remains locked |
| `.env.example` | Placeholder strings (`YOUR_SUPABASE_URL`) | ✅ YES | Safe | No real secrets present |
| `src/lib/supabaseClient.ts` | Fallback Anon Key / URL | ✅ YES | Safe | Public anon key only (RLS protected) |
| `claude-free.bat` | Machine-local launcher | ❌ NO (Ignored) | Safe | Listed in `.gitignore` line 38 |
| `supabase/migrations/` | Database DDL / SECURITY DEFINER | ✅ YES | Safe | RLS policies only, no service-role secrets |

---

## 5. Summary of Root Cleanup Proposal

The root directory currently contains **24 files and 18 subdirectories**. 

**Proposed Clean Root Target (10 Files)**:
1. `index.html`
2. `package.json`
3. `package-lock.json`
4. `tsconfig.json`
5. `vite.config.ts`
6. `vitest.config.ts`
7. `playwright.config.ts`
8. `wrangler.toml`
9. `.gitignore`
10. `README.md`
