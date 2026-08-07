#!/usr/bin/env node
/**
 * verify-security-fixes.cjs
 *
 * Live verification of the Part 1 security fixes (Gap A masking, Gap B atomic
 * race) + Part 2 one-key-per-person UI, against real Supabase and a real build.
 *
 * Two phases:
 *   1. SERVER PROBES  — direct RPC calls (anon key). Determines the deployed
 *      migration state, tests KEY_EXHAUSTED serial semantics, and admin-vs-owner
 *      deactivation authorization.
 *   2. UI WALKTHROUGH — Playwright against the built app on :4173. Verifies the
 *      generate-form defaults / labels / help text / >5 confirm dialog, and the
 *      Keys-tab masked-badge rendering (conditional on the server's masking
 *      state, so it is meaningful before AND after the migration is applied).
 *
 * Prereqs: .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, a built
 * app served on :4173 (`npm run build && npx vite preview --port 4173`), and
 * migration 0001 + 0002 applied to the live DB for the server-side parts that
 * depend on the new behavior.
 *
 * Run: node scripts/verify-security-fixes.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const SUPABASE_URL = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1].trim();
const ANON_KEY = (env.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1].trim();
const OWNER_KEY = 'SEFV-KMAA-2C6K-K72S';
const BASE = 'http://localhost:4173/';
const OUT = path.join(__dirname, 'shots', 'verify-security');
const KEY_RE = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/;

let passed = 0, failed = 0, skipped = 0;
function log(ok, msg, kind) {
  const tag = ok ? '  ✓' : kind === 'skip' ? '  ⚠ SKIP' : '  ✗ FAIL';
  console.log(`${tag} ${msg}`);
  if (ok) passed++; else if (kind === 'skip') skipped++; else failed++;
}

/* ── Supabase RPC helper (anon key) ───────────────────────────────────────── */
async function call(fn, params) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = text; }
  return { status: r.status, j };
}

const masked = code => typeof code === 'string' && code.includes('****');

/* ═══════════════════════════ PHASE 1 · SERVER PROBES ═══════════════════════ */
async function phase1() {
  console.log('\n═════════ PHASE 1 · SERVER PROBES (live RPC) ═════════\n');

  const owner = await call('activate_access_key', { p_code: OWNER_KEY });
  log(owner.j && owner.j.ok === true && owner.j.role === 'owner', 'Owner key activates (owner session works)');
  if (!owner.j || owner.j.ok !== true) return { maskingLive: false };

  // ── Mint a fresh admin key + a fresh student key (max_uses=1 default) ──────
  const mintAdmin = await call('admin_generate_key', {
    p_admin_code: OWNER_KEY, p_role: 'admin', p_label: 'VerifyAdmin', p_max_uses: 1, p_expires_at: null,
  });
  log(mintAdmin.j && mintAdmin.j.ok === true, 'Owner mints an admin key');
  const adminCode = mintAdmin.j?.key?.code;

  const mintStudent = await call('admin_generate_key', {
    p_admin_code: OWNER_KEY, p_role: 'student', p_label: 'VerifyStudent', p_max_uses: 1, p_expires_at: null,
  });
  log(mintStudent.j && mintStudent.j.ok === true, 'Owner mints a student key (max_uses=1)');
  const studentCode = mintStudent.j?.key?.code;

  if (!adminCode || !studentCode) {
    log(false, 'Could not mint keys — aborting server probes');
    return { maskingLive: false };
  }

  // ── Gap A · masking state ───────────────────────────────────────────────────
  const adminList = await call('admin_list_keys', { p_admin_code: adminCode });
  let maskingLive = false;
  if (adminList.j && adminList.j.ok) {
    const rows = adminList.j.keys || [];
    const privileged = rows.filter(k => k.role === 'owner' || k.role === 'admin');
    maskingLive = privileged.length > 0 && privileged.every(k => masked(k.code));
    const ownerRow = rows.find(k => k.role === 'owner');
    log(maskingLive, 'Gap A masking live: admin sees owner/admin codes masked (ACAD-****-****-1A2B)');
    if (!maskingLive) {
      const sample = (ownerRow && ownerRow.code) || '(no owner row)';
      log(false, `MIGRATION NOT APPLIED: admin_list_keys returned FULL owner code "${sample}" — masking fix is in 0002_admin_portal.sql but not deployed`, 'fail');
    } else {
      log(ownerRow ? masked(ownerRow.code) : false, 'Owner-role code is the literal masked shape for a non-owner caller');
    }
  } else {
    log(false, 'admin_list_keys failed as admin caller');
  }

  // ── Admin cannot deactivate the owner key (authorization) ──────────────────
  const ownerId = adminList.j?.keys?.find(k => k.role === 'owner')?.id;
  if (ownerId) {
    const deact = await call('admin_set_key_active', { p_admin_code: adminCode, p_key_id: ownerId, p_active: false });
    log(deact.j && deact.j.ok === false && deact.j.error === 'UNAUTHORIZED',
      'Admin caller cannot deactivate the owner key (UNAUTHORIZED)');
  } else {
    log(false, 'Could not resolve owner key id for the deactivation probe');
  }

  // ── KEY_EXHAUSTED serial semantics ──────────────────────────────────────────
  const a1 = await call('activate_access_key', { p_code: studentCode });
  log(a1.j && a1.j.ok === true, 'Student key (max_uses=1) activates once');
  const a2 = await call('activate_access_key', { p_code: studentCode });
  log(a2.j && a2.j.error === 'KEY_EXHAUSTED', 'Second activation of a used-up key returns KEY_EXHAUSTED');

  // ── Gap B · live concurrency probe (observed data, not deployment proof) ────
  // The atomic guard (new 0001) makes exactly-one-wins DETERMINISTIC. The old
  // read-then-write code can oversell or throw on a duplicate-profile insert,
  // but when HTTP requests happen to serialize it can also produce 1/7/0 — so
  // this probe reports what actually happened without claiming deployment.
  const mintRace = await call('admin_generate_key', {
    p_admin_code: OWNER_KEY, p_role: 'student', p_label: 'RaceProbe', p_max_uses: 1, p_expires_at: null,
  });
  const raceCode = mintRace.j?.key?.code;
  if (raceCode) {
    const shots = await Promise.all(Array.from({ length: 8 }, () => call('activate_access_key', { p_code: raceCode })));
    const okCount = shots.filter(r => r.j && r.j.ok === true).length;
    const exhausted = shots.filter(r => r.j && r.j.error === 'KEY_EXHAUSTED').length;
    const errored = shots.filter(r => r.status >= 400 || (r.j && typeof r.j === 'object' && r.j.error && r.j.error !== 'KEY_EXHAUSTED')).length;
    const consistent = okCount === 1 && exhausted === 7 && errored === 0;
    console.log(`\n  [concurrency probe] 8 parallel activations, max_uses=1 → ok=${okCount} key_exhausted=${exhausted} errored=${errored}`);
    log(consistent, 'Concurrency probe observed exactly 1 success (consistent with the atomic guard; deterministic proof lives in the vitest simulation)');
    if (!consistent) log(false, `Observed ok=${okCount} — would oversell under the old code`, 'fail');
  } else {
    log(false, 'Could not mint a race-probe key');
  }

  return { maskingLive, adminCode, studentCode };
}

/* ═══════════════════════════ PHASE 2 · UI WALKTHROUGH ══════════════════════ */
async function phase2(maskingLive, adminCode) {
  console.log('\n═════════ PHASE 2 · UI WALKTHROUGH (Playwright :4173) ═════════\n');

  // Server reachable?
  try {
    const r = await fetch(BASE);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  } catch (e) {
    console.error(`  Preview server not reachable at ${BASE} — start it with:\n    npm run build && npx vite preview --port 4173\n  (server probes already ran; UI checks skipped)`);
    log(false, 'Preview server reachable at :4173', 'skip');
    return;
  }

  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  const activate = async code => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.removeItem('academic_os_activation'));
    await page.reload({ waitUntil: 'networkidle' });
    const input = page.locator('input[placeholder="XXXX-XXXX-XXXX-XXXX"]');
    await input.fill(code);
    await page.getByRole('button', { name: /activate/i }).click();
    await page.waitForTimeout(9000);
  };

  const openPortal = async () => {
    const profileTab = page.locator('text=Profile').last();
    if (await profileTab.isVisible().catch(() => false)) { await profileTab.click(); await page.waitForTimeout(1500); }
    const adminBtn = page.getByRole('button', { name: /admin portal/i });
    await adminBtn.click();
    await page.waitForTimeout(2000);
  };

  /* ── Owner flow: generate form ───────────────────────────────────────────── */
  console.log('\n— OWNER: generate-form defaults & guard —');
  await activate(OWNER_KEY);
  await openPortal();
  await page.getByRole('button', { name: /generate access key/i }).waitFor().catch(() => {});

  const maxUsesVal = await page.locator('input[type="number"]').inputValue().catch(() => null);
  log(maxUsesVal === '1', `Default "devices" value is 1 (observed: "${maxUsesVal}")`);

  const labelText = await page.getByText('Devices for this person (not for sharing with others)').isVisible().catch(() => false);
  log(labelText, 'Field label reads "Devices for this person (not for sharing with others)"');

  const helpText = await page.getByText(/Each key is meant for one person/).isVisible().catch(() => false);
  log(helpText, 'Inline help text shown below the devices field');

  // >5 confirmation — cancel path
  await page.locator('input[type="number"]').fill('6');
  let dialogSeen = null;
  const dialogP = new Promise(resolve => { page.once('dialog', d => { dialogSeen = d.message(); d.dismiss(); resolve(d.message()); }); });
  await page.getByRole('button', { name: /generate access key/i }).click();
  const msg1 = await Promise.race([dialogP, new Promise(r => setTimeout(() => r(null), 4000))]);
  log(msg1 !== null, `max_uses>5 raises a confirmation dialog (observed message: ${JSON.stringify(msg1)})`);
  if (msg1 !== null) log(/one person|separate key/i.test(msg1), 'Dialog text explains the one-key-per-person reason');
  await page.waitForTimeout(1200);
  const canceledNoCard = !(await page.getByText(/New key — share it now/i).isVisible().catch(() => false));
  log(canceledNoCard, 'Dismissing the dialog cancels generation');

  // >5 confirmation — accept path
  const dialogP2 = new Promise(resolve => { page.once('dialog', d => { d.accept(); resolve(true); }); });
  await page.locator('input[type="number"]').fill('6');
  await page.getByRole('button', { name: /generate access key/i }).click();
  await dialogP2;
  await page.waitForTimeout(3500);
  const acceptedCard = await page.getByText(/New key — share it now/i).isVisible().catch(() => false);
  log(acceptedCard, 'Accepting the dialog proceeds with generation (key minted with max_uses=6)');

  /* ── Admin flow: Keys tab masked rendering + can't deactivate owner ──────── */
  console.log('\n— ADMIN: Keys-tab masking & owner protection —');
  if (!adminCode) {
    log(false, 'No admin code available — admin UI checks skipped', 'skip');
  } else {
    await activate(adminCode);
    await openPortal();
    await page.locator('button').filter({ hasText: /^Keys$/ }).first().click();
    await page.waitForTimeout(2500);

    const maskedRows = page.locator('code', { hasText: '****' });
    const maskedCount = await maskedRows.count().catch(() => 0);
    const copyInsideMasked = maskedCount > 0
      ? await maskedRows.first().locator('xpath=..').getByRole('button', { name: /copy/i }).count()
      : 0;
    if (maskingLive) {
      log(maskedCount >= 2, `Admin sees masked codes in Keys tab (observed ${maskedCount} masked rows — owner + admin keys)`);
      log(copyInsideMasked === 0, 'Masked rows have no Copy button');
    } else {
      log(maskedCount === 0, `Masking not deployed — no masked rows shown to admin (observed ${maskedCount})`, 'skip');
      log(false, `MIGRATION NOT APPLIED: admin UI shows full codes + Copy buttons until 0002 is applied`, 'skip');
    }

    // Owner row protection — climb from the owner's code element to its card.
    const ownerCode = page.locator('code', { hasText: 'SEFV' }).first();
    if (await ownerCode.isVisible().catch(() => false)) {
      const ownerCard = ownerCode.locator('xpath=../..'); // code → code-row div → card
      const deactBtn = ownerCard.getByRole('button', { name: /deactivate/i });
      await deactBtn.click();
      await page.waitForTimeout(2500);
      const authBanner = await page.getByText("Your key doesn't have admin access.").isVisible().catch(() => false);
      log(authBanner, 'Admin cannot deactivate the owner key (UNAUTHORIZED banner shown)');
    } else {
      log(false, 'Owner key row visible in admin Keys tab');
    }
  }

  await browser.close();
}

/* ═══════════════════════════════ MAIN ══════════════════════════════════════ */
(async () => {
  const { maskingLive, adminCode } = await phase1();
  await phase2(maskingLive, adminCode);

  console.log(`\n  ───────────────────────────────────────────────`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`  Masks live on server: ${maskingLive ? 'YES' : 'NO — apply 0002_admin_portal.sql'}`);
  console.log(`  ───────────────────────────────────────────────`);
  if (failed > 0) process.exit(1);
})().catch(err => { console.error(err); process.exit(1); });
