#!/usr/bin/env node
/**
 * Phase 2 — H14 Sessions Revoke + error-masking, end-to-end through the REAL
 * React UI in WebKit at a real mobile viewport (360×640) against the live
 * backend, same engine/geometry as the real-device walkthrough.
 *
 * H14 has two halves:
 *
 *   1. ERROR-MASKING (the fix): admin/reference RPC failures were collapsed
 *      into "Couldn't reach the server — check your connection", which is
 *      misleading when the server actually rejected the call (migration not
 *      applied → PGRST202, privilege error → 42501). classifyPostgrestError
 *      now distinguishes a server rejection (SERIAL detail) from a genuine
 *      transport failure, and formatAdminError/formatRefError surface that
 *      detail in the UI banner.
 *
 *   2. SESSIONS REVOKE (the flow): the owner sees an active device session and
 *      taps Revoke → the session is deleted server-side and the row vanishes
 *      from the Sessions tab. The revoked session is then dead — a second
 *      revoke of the same id is rejected.
 *
 * The error-masking half is proven in the REAL UI by route-intercepting the
 * `admin_revoke_session` RPC and returning a genuine PostgREST 400 (PGRST202),
 * then asserting the banner shows "The server rejected the request. (PGRST202
 * — …)" and NOT the misleading network copy — then un-intercepting so the
 * happy-path revoke completes against the real backend.
 *
 * Run: node scripts/phase2-h14-webkit.cjs
 */
'use strict';

const { webkit } = require('playwright');
const { requireOwnerKey } = require('./lib/env.cjs');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3001/';
const OWNER_KEY = requireOwnerKey();

function loadEnv() {
  const env = {};
  for (const line of require('fs').readFileSync(require('path').resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}
const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

async function rpc(name, params) {
  const r = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return { status: r.status, body: JSON.parse(await r.text()) };
}

async function mintTempKey(role, label) {
  const r = await rpc('admin_generate_key', {
    p_admin_code: OWNER_KEY, p_role: role, p_label: label, p_max_uses: 5, p_expires_at: null,
  });
  if (r.body?.ok !== true || !r.body.key?.code) throw new Error(`mint failed: ${JSON.stringify(r.body)}`);
  return { id: r.body.key.id, code: String(r.body.key.code).toUpperCase() };
}

let pass = 0, fail = 0;
function log(ok, msg, extra) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}${extra ? '  → ' + extra : ''}`);
  ok ? pass++ : fail++;
}

/** Fresh mobile WebKit context (own localStorage + device id). */
async function freshContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
  await ctx.addInitScript(() => {
    localStorage.removeItem('academic_os_activation');
    localStorage.removeItem('academic_os_device_id');
  });
  return ctx;
}

async function activate(page, code) {
  const input = page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX');
  await input.fill(code);
  await page.getByRole('button', { name: /activate/i }).click();

  // Owner/admin → dashboard (Home button visible). Student → onboarding gate first.
  try {
    await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible', timeout: 15000 });
    return; // owner/admin — done
  } catch { /* onboarding gate — continue */ }

  const skipBtn = page.getByRole('button', { name: /skip for now/i });
  await skipBtn.waitFor({ state: 'visible', timeout: 10000 });
  await skipBtn.click();
  await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible', timeout: 15000 });
}

async function openSessionsTab(page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: /admin portal/i }).click();
  await page.getByText('Access-key distribution').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.waitForTimeout(800);
}

/** The Sessions-tab card for the account with the given label (deepest div that
 *  contains both the label text and a Revoke button). */
function sessionCard(page, label) {
  return page
    .locator('div')
    .filter({ hasText: label })
    .filter({ has: page.getByRole('button', { name: /^Revoke/ }) })
    .last();
}

async function main() {
  const now = Date.now();
  const ownerLabel = `H14-Owner-${now}`;
  const studentLabel = `H14-Student-${now}`;
  console.log(`=== H14 Sessions Revoke + error-masking e2e (${BASE}, WebKit 360x640, owner ${OWNER_KEY.slice(0, 4)}…) ===`);

  const tempOwner = await mintTempKey('owner', ownerLabel);
  const freshStudent = await mintTempKey('student', studentLabel);
  console.log(`  minted temp owner ${tempOwner.code.slice(0, 4)}… + fresh student ${freshStudent.code.slice(0, 4)}…`);
  const cleanup = [];

  const browser = await webkit.launch({ headless: true });

  try {
    // ── Device A: owner activates, opens Sessions tab ──────────────────────
    console.log('\n[Device A — owner]');
    const ctxA = await freshContext(browser);
    cleanup.push(ctxA);
    const pageA = await ctxA.newPage();
    pageA.setDefaultTimeout(25000);
    pageA.on('pageerror', (e) => console.log('  [pageerror A]', e.message));

    await pageA.goto(BASE, { waitUntil: 'domcontentloaded' });
    await activate(pageA, tempOwner.code);
    await openSessionsTab(pageA);
    // Owner's own device row must appear (self-activation proof from H17).
    // Card renders `account_name · last seen <date>` in one text node, so match as substring.
    await pageA.getByText(ownerLabel, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('  owner Sessions tab loaded with own device row');

    // ── Device B: fresh student key activates on a separate device ─────────
    console.log('\n[Device B — fresh student key]');
    const ctxB = await freshContext(browser);
    cleanup.push(ctxB);
    const pageB = await ctxB.newPage();
    pageB.setDefaultTimeout(25000);
    pageB.on('pageerror', (e) => console.log('  [pageerror B]', e.message));
    await pageB.goto(BASE, { waitUntil: 'domcontentloaded' });
    await activate(pageB, freshStudent.code);
    const studentDeviceId = await pageB.evaluate(() => localStorage.getItem('academic_os_device_id'));
    console.log(`  student device id: ${studentDeviceId.slice(0, 8)}…`);

    // Owner's Sessions tab should pick the new row up on the H17 refresh path
    // (tab switch away + back keeps the portal mounted).
    await pageA.getByRole('button', { name: 'Keys', exact: true }).click();
    await pageA.waitForTimeout(400);
    await pageA.getByRole('button', { name: 'Sessions', exact: true }).click();
    await pageA.waitForTimeout(800);
    const studentCard = sessionCard(pageA, studentLabel);
    await studentCard.waitFor({ state: 'visible', timeout: 15000 });
    log(true, 'fresh student session visible in owner Sessions tab');

    // Grab the session id server-side for later dead-session assertions.
    let studentSessionId = null;
    {
      const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
      const s = (r.body?.sessions || []).find(x => x.device_id === studentDeviceId);
      studentSessionId = s?.id ?? null;
      log(!!studentSessionId, 'student device_sessions row exists server-side', studentSessionId ? s.account_name : 'NOT FOUND');
    }

    // ── [1] Error-masking: server rejection surfaces, NOT a network lie ─────
    console.log('\n[1] Error-masking — revoke rejected by the server (route-injected PGRST202)');
    await pageA.route('**/admin_revoke_session', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST202',
          message: 'Could not find the function public.admin_revoke_session in the schema cache',
          details: 'Searched for the function public.admin_revoke_session in the schema cache',
          hint: null,
        }),
      });
    });

    await studentCard.getByRole('button', { name: /^Revoke/ }).click();
    await pageA.getByText(/The server rejected the request\. \(PGRST202 — Could not find the function/).waitFor({ state: 'visible', timeout: 10000 });
    log(true, 'banner shows the real server rejection + PostgREST detail');
    const netLie = await pageA.getByText(/Couldn.t reach the server/).count();
    log(netLie === 0, 'no misleading "check your connection" message on a server rejection',
      netLie ? `found ${netLie} network banners` : '');

    // Row must still be there (the revoke did not happen).
    await studentCard.waitFor({ state: 'visible', timeout: 10000 });
    log(true, 'session row still present after the rejected revoke (no false removal)');

    // ── [2] Happy path: revoke the student session for real ────────────────
    console.log('\n[2] Revoke happy path (real backend call)');
    await pageA.unroute('**/admin_revoke_session');
    await studentCard.getByRole('button', { name: /^Revoke/ }).click();
    await pageA.getByText(studentLabel, { exact: false }).first().waitFor({ state: 'detached', timeout: 20000 });
    log(true, 'student session row removed from the owner Sessions tab');

    // Server agrees the row is gone.
    {
      const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
      const still = (r.body?.sessions || []).find(x => x.device_id === studentDeviceId);
      log(!still, 'server confirms the device_sessions row is deleted', still ? `STILL LISTED: ${still.id}` : '');
    }

    // ── [3] Revoked session is dead: second revoke is rejected server-side ──
    console.log('\n[3] Revoked session is dead server-side');
    if (studentSessionId) {
      const r2 = await rpc('admin_revoke_session', { p_admin_code: OWNER_KEY, p_session_id: studentSessionId });
      const body = r2.body || {};
      log(body?.ok === false, 're-revoking the same session is rejected (session gone)',
        JSON.stringify(body).slice(0, 120));
      const err = typeof body?.error === 'string' ? body.error : String(body?.error ?? '');
      log(err.includes('NOT_FOUND'), 'rejection is the app-level NOT_FOUND code', err || '(no code)');
    } else {
      log(false, 'skipped dead-session check — no session id captured');
    }
  } finally {
    // Cleanup: revoke H14-* sessions by account label + deactivate temp keys.
    try {
      const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
      const rows = (r.body?.sessions || []).filter(s => /^H14-/.test(s.account_name || ''));
      for (const s of rows) await rpc('admin_revoke_session', { p_admin_code: OWNER_KEY, p_session_id: s.id });
      await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: tempOwner.id, p_active: false }).catch(() => {});
      await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: freshStudent.id, p_active: false }).catch(() => {});
      console.log(`\n  cleanup: revoked ${rows.length} H14 session(s); temp keys deactivated`);
    } catch (e) { console.log('\n  cleanup error:', e.message); }
    for (const ctx of cleanup) await ctx.close().catch(() => {});
    await browser.close();
  }

  console.log(`\n=== H14 RESULT: ${fail === 0 ? 'PASS' : fail + ' FAILURE(S)'} (${pass} ok / ${fail} fail) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error('\n=== H14 ERROR ==='); console.error(err); process.exit(1); });
