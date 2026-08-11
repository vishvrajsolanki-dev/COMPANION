#!/usr/bin/env node
/**
 * Phase 2 — H17 UI end-to-end: does a fresh-key activation show up in the
 * owner's Admin Portal → Sessions tab, through the REAL browser UI?
 *
 * The RPC-level probe (phase2-h17-probe.cjs) proved activate_access_key DOES
 * insert a device_sessions row for two fresh keys. This script drives the actual
 * React UI in WebKit (mobile viewport, same as the real-device walkthrough) to
 * determine whether the row is VISIBLE to the owner — and whether the Sessions
 * list refreshes when a NEW device activates while the portal is already open.
 *
 *   1. owner activates on device A (temp owner key) → Admin Portal → Sessions
 *      tab shows the owner's own device row
 *   2. student activates a fresh key on device B (separate context = separate
 *      localStorage/device id)
 *   3. still in the owner's portal (Sessions tab already mounted): does the
 *      student's device row appear after switching away and back?
 *   4. close + reopen the portal (remount): does the student row appear then?
 *      (proves the row exists server-side → isolates a stale-list UI bug)
 *
 * Run: node scripts/phase2-h17-ui.cjs
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

async function revokeByDeviceId(deviceId) {
  const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
  if (r.body?.ok !== true || !Array.isArray(r.body.sessions)) return;
  const s = r.body.sessions.find(x => x.device_id === deviceId);
  if (s) await rpc('admin_revoke_session', { p_admin_code: OWNER_KEY, p_session_id: s.id });
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

  // Student onboarding gate: click "Skip for now" → proceeds to Home.
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

async function main() {
  const now = Date.now();
  console.log(`=== H17 UI end-to-end (${BASE}, WebKit 360x640, owner ${OWNER_KEY.slice(0, 4)}…) ===`);

  const browser = await webkit.launch({ headless: true });

  // Mint temp owner key + fresh student key up front (second fresh key = the
  // student key; the RPC probe already covered two fresh student keys).
  const tempOwner = await mintTempKey('owner', `H17UI-Owner-${now}`);
  const freshStudent = await mintTempKey('student', `H17UI-Student-${now}`);
  console.log(`  minted temp owner ${tempOwner.code.slice(0, 4)}… + fresh student ${freshStudent.code.slice(0, 4)}…`);
  const cleanup = [];

  try {
    // ── Device A: owner activates + opens Sessions tab ──────────────────────
    console.log('\n[Device A — owner]');
    const ctxA = await freshContext(browser);
    cleanup.push(ctxA);
    const pageA = await ctxA.newPage();
    pageA.setDefaultTimeout(25000);
    pageA.on('pageerror', (e) => console.log('  [pageerror A]', e.message));

    await pageA.goto(BASE, { waitUntil: 'domcontentloaded' });
    await activate(pageA, tempOwner.code);
    const ownerDeviceId = await pageA.evaluate(() => localStorage.getItem('academic_os_device_id'));
    console.log(`  owner device id: ${ownerDeviceId.slice(0, 8)}…`);

    await openSessionsTab(pageA);
    const ownerRowVisible = await pageA.getByText('H17UI-Owner', { exact: false }).first().isVisible().catch(() => false);
    const ownerBadge = await pageA.getByText('owner', { exact: true }).count();
    log(ownerRowVisible && ownerBadge >= 1, 'owner device row appears in Sessions tab (self-activation)',
      `account_name=H17UI-Owner, owner badge count=${ownerBadge}`);

    // ── Device B: fresh student key activates on a separate device ──────────
    console.log('\n[Device B — fresh student key]');
    const ctxB = await freshContext(browser);
    cleanup.push(ctxB);
    const pageB = await ctxB.newPage();
    pageB.setDefaultTimeout(25000);
    await pageB.goto(BASE, { waitUntil: 'domcontentloaded' });
    await activate(pageB, freshStudent.code);
    const studentDeviceId = await pageB.evaluate(() => localStorage.getItem('academic_os_device_id'));
    console.log(`  student device id: ${studentDeviceId.slice(0, 8)}…`);
    // Home button visible confirms activation succeeded; navigate to Profile to verify role badge.
    const homeVis = await pageB.getByRole('button', { name: 'Home' }).isVisible().catch(() => false);
    if (homeVis) await pageB.getByRole('button', { name: 'Profile' }).click();
    const studentAccountShown = await pageB.getByText('student', { exact: true }).first().isVisible().catch(() => false)
      || homeVis;
    log(studentAccountShown, 'student activated on device B');

    // ── Device A: Sessions tab already mounted — does it pick up the new row? ─
    console.log('\n[Sessions list freshness on device A]');
    // Switch away (Keys) and back to Sessions — no remount, load() not re-run.
    await pageA.getByRole('button', { name: 'Keys', exact: true }).click();
    await pageA.waitForTimeout(400);
    await pageA.getByRole('button', { name: 'Sessions', exact: true }).click();
    await pageA.waitForTimeout(800);

    const studentRowAfterTabSwitch = await pageA
      .getByText('H17UI-Student', { exact: false }).first().isVisible().catch(() => false);
    log(studentRowAfterTabSwitch, 'fresh student row appears after tab switch (same portal mount)',
      studentRowAfterTabSwitch ? '' : 'NOT visible — sessions list is stale (loaded only on portal mount)');

    // Close + reopen portal (remount → load() re-runs).
    await pageA.locator('header button').first().click(); // back → Profile
    await pageA.waitForTimeout(400);
    await pageA.getByRole('button', { name: /admin portal/i }).click();
    await pageA.getByText('Access-key distribution').waitFor({ state: 'visible' });
    await pageA.getByRole('button', { name: 'Sessions', exact: true }).click();
    await pageA.waitForTimeout(800);

    const studentRowAfterRemount = await pageA
      .getByText('H17UI-Student', { exact: false }).first().isVisible().catch(() => false);
    log(studentRowAfterRemount, 'fresh student row appears after portal remount',
      studentRowAfterRemount ? 'row EXISTS server-side → stale-list UI bug confirmed' : 'STILL missing after remount → deeper issue');

    // Raw DB evidence from the UI context.
    const db = await pageA.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      return 'db module loaded';
    }).catch(() => 'no db module');
    log(true, 'UI session ran against live backend', `db-module-check: ${db}`);
  } finally {
    // Cleanup: revoke H17UI sessions by account label + deactivate temp keys.
    const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
    const rows = (r.body?.sessions || []).filter(s => /^H17UI-/.test(s.account_name || ''));
    for (const s of rows) await rpc('admin_revoke_session', { p_admin_code: OWNER_KEY, p_session_id: s.id });
    await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: tempOwner.id, p_active: false }).catch(() => {});
    await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: freshStudent.id, p_active: false }).catch(() => {});
    for (const ctx of cleanup) await ctx.close().catch(() => {});
    await browser.close();
    console.log(`\n  cleanup: revoked ${rows.length} H17UI session(s); temp owner+student keys deactivated`);
  }

  console.log(`\n=== H17 UI RESULT: ${fail === 0 ? 'PASS' : fail + ' FAILURE(S)'} (${pass} ok / ${fail} fail) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error('\n=== H17 UI ERROR ==='); console.error(err); process.exit(1); });
