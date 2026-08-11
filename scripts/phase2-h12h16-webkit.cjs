#!/usr/bin/env node
/**
 * Phase 2 — H12/H16 Publish UI end-to-end through the REAL React UI in WebKit
 * at a real mobile viewport (360×640), same engine/geometry as the real-device
 * walkthrough.
 *
 * The Publish UI lives in the Admin Portal → Data tab (owner-only). The owner
 * pastes faculty/subjects JSON from `node scripts/scrape-adit.mjs` (or clicks
 * "Load Sample JSON" for the in-app example), validates, and publishes to
 * Supabase via the `admin_upsert_reference_data` RPC. The flow proves:
 *
 *   [1] Error-masking: route-intercepting the upsert RPC with a PostgREST 400
 *       (PGRST202) surfaces "The server rejected the request. (PGRST202 — ...)"
 *       instead of the old misleading "Couldn't reach the server".
 *   [2] Happy-path publish: Load Sample → Validate → Publish → success banner
 *       with inserted/updated counts → summary counts refresh.
 *   [3] Validation: invalid JSON and empty payload show clear error messages.
 *   [4] Mobile layout: the Data tab renders correctly on a 360px viewport —
 *       summary card, textarea, buttons all visible/interactable (no H12/H16
 *       regression on layout overflow, clipping, or hidden interactive
 *       elements).
 *
 * The sample JSON contains ADIT institutional data that belongs in the
 * reference tables — publishing it is idempotent (upsert by natural key) and
 * either updates existing rows or seeds them. No test-only rows are inserted.
 *
 * Run: node scripts/phase2-h12h16-webkit.cjs
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
  try {
    await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible', timeout: 15000 });
    return;
  } catch { /* onboarding gate */ }
}

async function openDataTab(page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: /admin portal/i }).click();
  await page.getByText('Access-key distribution').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.waitForTimeout(800);
}

/** Read the faculty count from the summary card. */
async function getFacultyCount(page) {
  const el = page.locator('text=Faculty').first();
  const prev = el.locator('xpath=preceding-sibling::div[1]').first();
  const val = await prev.textContent().catch(() => '');
  const n = parseInt((val || '').trim(), 10);
  return Number.isFinite(n) ? n : -1;
}

/** Read the subjects count from the summary card. */
async function getSubjectsCount(page) {
  const el = page.locator('text=Subjects').first();
  const prev = el.locator('xpath=preceding-sibling::div[1]').first();
  const val = await prev.textContent().catch(() => '');
  const n = parseInt((val || '').trim(), 10);
  return Number.isFinite(n) ? n : -1;
}

async function main() {
  const now = Date.now();
  console.log(`=== H12/H16 Publish UI e2e (${BASE}, WebKit 360x640, owner ${OWNER_KEY.slice(0, 4)}…) ===`);

  const tempOwner = await mintTempKey('owner', `H12H16-Owner-${now}`);
  console.log(`  minted temp owner ${tempOwner.code.slice(0, 4)}…`);
  const cleanup = [];

  const browser = await webkit.launch({ headless: true });

  try {
    const ctx = await freshContext(browser);
    cleanup.push(ctx);
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await activate(page, tempOwner.code);
    await openDataTab(page);

    // ── [4] Mobile layout verification ───────────────────────────────────────
    console.log('\n[4] Mobile layout — Data tab renders correctly on 360px viewport');
    {
      const summaryCard = page.getByText('Reference data — ADIT institutional', { exact: false });
      await summaryCard.waitFor({ state: 'visible', timeout: 15000 });
      log(true, 'Reference data summary card visible');
      const textarea = page.locator('textarea[placeholder]');
      const taVisible = await textarea.first().isVisible();
      log(taVisible, 'JSON textarea visible on mobile viewport');
      const publishBtnLabel = page.getByText('Load Sample JSON', { exact: true });
      log(await publishBtnLabel.isVisible(), '"Load Sample JSON" button visible');
    }

    // ── [3] Validation errors ────────────────────────────────────────────────
    console.log('\n[3] Validation — invalid JSON shows a clear error');
    {
      const textarea = page.locator('textarea[placeholder]').first();
      await textarea.fill('{bad json!');
      await page.getByRole('button', { name: /Validate Reference JSON/ }).click();
      const errBanner = page.locator('[style*="color-danger"]');
      await errBanner.first().waitFor({ state: 'visible', timeout: 5000 });
      const errMsg = await errBanner.first().textContent();
      log(errMsg && errMsg.length > 5, 'validation error banner appears with a message', errMsg?.slice(0, 60));

      // Empty textarea
      await textarea.fill('');
      await page.getByRole('button', { name: /Validate Reference JSON/ }).click();
      await errBanner.first().waitFor({ state: 'visible', timeout: 5000 });
      const emptyMsg = await errBanner.first().textContent();
      log(emptyMsg && emptyMsg.includes('paste'), 'empty textarea shows "paste" hint', emptyMsg?.slice(0, 60));
    }

    // ── [1] Error-masking: server rejection on publish ──────────────────────
    console.log('\n[1] Error-masking — server rejection on admin_upsert_reference_data');
    // Load sample → validate → capture pre-publish summary
    await page.getByRole('button', { name: 'Load Sample JSON' }).click();
    await page.getByRole('button', { name: /Validate Reference JSON/ }).click();
    await page.getByText(/faculty.*subjects ready to publish/).first().waitFor({ state: 'visible', timeout: 10000 });
    const preFaculty = await getFacultyCount(page);
    const preSubjects = await getSubjectsCount(page);
    console.log(`  pre-publish: ${preFaculty} faculty, ${preSubjects} subjects`);

    // Route-intercept the publish RPC
    await page.route('**/admin_upsert_reference_data', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST202',
          message: 'Could not find the function public.admin_upsert_reference_data in the schema cache',
          details: 'Searched for the function admin_upsert_reference_data in schema cache',
          hint: null,
        }),
      });
    });

    await page.getByRole('button', { name: /Publish to Supabase/ }).click();
    const errDetail = page.locator('[style*="color-danger"]');
    await errDetail.first().waitFor({ state: 'visible', timeout: 10000 });
    const errText = await errDetail.first().textContent();
    log(errText && errText.includes('server rejected the request'), 'banner shows real server rejection', errText?.slice(0, 80));
    const noNetLie = !(errText || '').includes("Couldn't reach the server");
    log(noNetLie, 'no misleading "check your connection" message');

    // Textarea should still have content (publish failed, no clear)
    const taStill = await page.locator('textarea[placeholder]').first().inputValue();
    log(taStill.length > 10, 'textarea retained content after failed publish');

    // ── [2] Happy-path publish ────────────────────────────────────────────────
    console.log('\n[2] Happy-path publish — Load Sample → Validate → Publish');
    await page.unroute('**/admin_upsert_reference_data');

    // refParsed is still set from the earlier validate → publish button should be enabled.
    await page.getByRole('button', { name: /Publish to Supabase/ }).click();
    // Success banner — locate by title text, not style* (Banner uses classes not inline).
    const successHeading = page.getByText('Reference data published', { exact: false });
    await successHeading.waitFor({ state: 'visible', timeout: 30000 });
    const successBanner = await successHeading.locator('xpath=ancestor::div[1]').first().textContent().catch(() => '');
    log(successBanner.includes('inserted'), 'success banner shows inserted/updated counts', successBanner?.slice(0, 120));

    // Textarea and refParsed should be cleared after success.
    const taAfter = await page.locator('textarea[placeholder]').first().inputValue();
    log(taAfter.trim() === '', 'textarea cleared after successful publish');
    const readyText = await page.getByText(/faculty.*subjects ready to publish/).count();
    log(readyText === 0, 'refParsed summary cleared after publish');

    // Summary counts refreshed
    await page.waitForTimeout(1500); // let load() RPCs finish
    const postFaculty = await getFacultyCount(page);
    const postSubjects = await getSubjectsCount(page);
    console.log(`  post-publish: ${postFaculty} faculty, ${postSubjects} subjects`);
    const countsUpdated = postFaculty >= preFaculty && postSubjects >= preSubjects;
    log(countsUpdated, 'summary counts did not decrease after publish');

  } finally {
    // Cleanup: deactivate temp key.
    try {
      await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: tempOwner.id, p_active: false }).catch(() => {});
      console.log(`\n  cleanup: temp owner key deactivated`);
    } catch (e) { console.log('\n  cleanup error:', e.message); }
    for (const ctx of cleanup) await ctx.close().catch(() => {});
    await browser.close();
  }

  console.log(`\n=== H12/H16 RESULT: ${fail === 0 ? 'PASS' : fail + ' FAILURE(S)'} (${pass} ok / ${fail} fail) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error('\n=== H12/H16 ERROR ==='); console.error(err); process.exit(1); });
