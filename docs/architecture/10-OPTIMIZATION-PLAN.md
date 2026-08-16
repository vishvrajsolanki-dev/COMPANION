# ACADEMIC OS CODEBASE OPTIMIZATION PLAN (REVISED)

**Project**: Academic OS  
**Date**: August 16, 2026  
**Document Number**: `10-OPTIMIZATION-PLAN.md`  
**Revision**: Post-Audit Correction Pass  
**Status**: PROPOSED — Awaiting Approval  

---

## 1. Revised Work Execution Batches

Following evidence-based reclassification, tasks are organized into 3 modular batches:

### Batch 1: Security & Database Tuning (P2-DB-01, P2-DB-02)
- **Target Files**: `supabase/migrations/0008_optimization_indexes.sql`
- **Scope**:
  - Add compound index `idx_device_sessions_account_active` on `device_sessions(account_id, is_active)`.
  - Add compound index `idx_access_keys_status_expires` on `access_keys(status, expires_at)`.
- **Expected Benefit**: Improved indexing for admin session listing and key expiration sweeps as dataset size grows.
- **Risk**: Very low (non-blocking DDL statements).

### Batch 2: Navigation Dispatch & Route Optimization (P2-FE-01, P2-FE-02)
- **Target Files**: `src/hooks/useHashLocation.ts`, `src/components/layout/AppShell.tsx`
- **Scope**:
  - Unify window hash listener dispatch in `useHashLocation.ts` to eliminate secondary re-renders when toggling hub navigation tabs.
- **Expected Benefit**: Cleaner, single-pass render cycle during hub switching.
- **Risk**: Low.

### Batch 3: UI Component & Render Polish (P3-FE-01, P3-FE-02)
- **Target Files**: `src/features/analytics/AnalyticsView.tsx`, `src/features/dashboard/QuietDashboard.tsx`, `src/components/ui/LoadingState.tsx`
- **Scope**:
  - Add optional `useMemo` wrapper around analytics statistics array calculations.
  - Simplify `QuietDashboard` daily slot loop.
  - Simplify `LoadingState` primitive wrapper.
- **Expected Benefit**: Code elegance and minor render hygiene.
- **Risk**: Low.

---

## 2. Verification Steps After Each Batch

1. Run `npm run test` (152 Vitest unit tests).
2. Run `npx playwright test` (306 Playwright E2E tests).
3. Run `npm run build` (TypeScript compilation & Vite production bundle).

---

*Optimization plan revision complete. Standing by for approval before executing Batch 1.*
