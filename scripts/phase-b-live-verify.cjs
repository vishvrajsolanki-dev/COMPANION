#!/usr/bin/env node
/**
 * Phase B — live verification with Supabase configured.
 * Tests the full activation flow against the real Supabase backend.
 *
 * NOTE: This script mints a throwaway temp owner key for its UI activations, so
 * it never consumes a use of the real VERIFY_OWNER_KEY.  For the current,
 * comprehensive security audit use scripts/verify-security-fixes.cjs instead.
 *
 * Prereqs: preview server on :4173 built with .env.local configured.
 * Run: node scripts/phase-b-live-verify.cjs
 */
'use strict';
const { chromium } = require('playwright');
const { requireOwnerKey } = require('./lib/env.cjs');

const BASE = 'http://localhost:4173/';
const OUT  = 'scripts/shots/phase-b';
const KEY_RE = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/;

const OWNER_KEY = requireOwnerKey();

let passed = 0, failed = 0;
function log(ok, msg) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}`);
  if (ok) passed++; else { failed++; process.exitCode = 1; }
}

async function setTheme(page, theme) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(400);
}

/**
 * Mint a throwaway owner key (max_uses=1) via the RPC and return its code.
 * This is used in place of the real owner key in the UI so the script
 * never consumes a use of VERIFY_OWNER_KEY.
 */
async function mintTempOwnerKey() {
  const envPath = require('fs').readFileSync(require('path').resolve(process.cwd(), '.env.local'), 'utf8');
  const url = (envPath.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim();
  const anon = (envPath.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim();
  if (!url || !anon) throw new Error('.env.local missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  const r = await fetch(`${url}/rest/v1/rpc/admin_generate_key`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_admin_code: OWNER_KEY, p_role: 'owner', p_label: 'PhaseB-VerifyTempOwner', p_max_uses: 1, p_expires_at: null }),
  });
  const { data, error } = JSON.parse(await r.text());
  if (error || data?.ok !== true || !data.key?.code) throw new Error(`Could not mint temp owner key: ${JSON.stringify(data || error)}`);
  return String(data.key.code).toUpperCase();
}

/**
 * Deactivate a temp owner key by ID via the public RPC.
 */
async function deactivateTempOwnerKey(id) {
  const envPath = require('fs').readFileSync(require('path').resolve(process.cwd(), '.env.local'), 'utf8');
  const url = (envPath.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim();
  const anon = (envPath.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim();
  if (!url || !anon) return;
  await fetch(`${url}/rest/v1/rpc/admin_set_key_active`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_admin_code: OWNER_KEY, p_key_id: id, p_active: false }),
  }).catch(() => {});
}

async function main() {
  // Mint a throwaway owner key so the UI never burns a use of the real owner key.
  let tempOwnerCode;
  try {
    tempOwnerCode = await mintTempOwnerKey();
    console.log(`  Temp owner key minted (max_uses=1): ${tempOwnerCode.slice(0,4)}…${tempOwnerCode.slice(-4)}`);
  } catch (e) {
    console.error(`\n✗ Could not mint a temp owner key — is the owner key active in the database?\n  ${e.message}`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  // ── 1. Fresh profile → activation gate shown ──────────────────────────────
  console.log('\n1. FRESH PROFILE — activation gate');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Clear any stored activation to simulate fresh device
  await page.evaluate(() => { localStorage.removeItem('academic_os_activation'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const gateVisible = await page.getByText('Activate this device').isVisible().catch(() => false);
  log(gateVisible, 'ActivationView is visible on fresh device');

  const inputVisible = await page.locator('input[placeholder="XXXX-XXXX-XXXX-XXXX"]').isVisible().catch(() => false);
  log(inputVisible, 'Access-key input is present');

  // Screenshots of the activation gate
  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/03-gate-dark.png` });
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT}/04-gate-light.png` });
  console.log('  captured gate screenshots');

  // ── 2. Wrong key → error message ─────────────────────────────────────────
  console.log('\n2. WRONG KEY — error feedback');
  const input = page.locator('input[placeholder="XXXX-XXXX-XXXX-XXXX"]');
  await input.fill('AAAA-BBBB-CCCC-DDDD');
  await page.getByRole('button', { name: /activate/i }).click();
  await page.waitForTimeout(3000);

  const errorVisible = await page.locator('text=/access key.*recognized|invalid key|error|failed/i').first().isVisible().catch(() => false);
  log(errorVisible, 'Error message shown for wrong key');

  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/05-wrong-key-dark.png` });
  console.log('  captured wrong-key screenshot');

  // ── 3. Correct temp owner key → activates ──────────────────────────────
  console.log('\n3. CORRECT KEY — activation flow');
  await input.fill('');
  await input.fill(tempOwnerCode);
  await page.getByRole('button', { name: /activate/i }).click();

  // Wait for activation + redirect to dashboard
  await page.waitForTimeout(5000);

  const dashboardVisible = await page.getByText(/Good (morning|afternoon|evening)/i).isVisible().catch(() => false)
    || await page.getByText('No more classes today').isVisible().catch(() => false);
  log(dashboardVisible, 'Dashboard visible after activation');

  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/06-post-activate-dark.png` });
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT}/07-post-activate-light.png` });
  console.log('  captured post-activation screenshots');

  // ── 4. Profile page — account card with owner role ───────────────────────
  console.log('\n4. PROFILE — account card');
  // Navigate to profile tab via text (no data-tab attribute exists)
  const profileTab4 = page.locator('text=Profile').last();
  if (await profileTab4.isVisible().catch(() => false)) {
    await profileTab4.click();
    await page.waitForTimeout(1500);
  }

  const ownerBadge = await page.getByText('owner').isVisible().catch(() => false);
  log(ownerBadge, 'Owner role badge visible on profile');

  const signOutVisible4 = await page.getByRole('button', { name: /sign out/i }).isVisible().catch(() => false);
  log(signOutVisible4, 'Sign out button visible');

  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/08-profile-owner-dark.png` });
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT}/09-profile-owner-light.png` });
  console.log('  captured profile screenshots');

  // ── 5. Reload → stays activated ──────────────────────────────────────────
  console.log('\n5. RELOAD — persistence');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const stillActivated = await page.getByText(/Good (morning|afternoon|evening)/i).isVisible().catch(() => false)
    || await page.getByText('No more classes today').isVisible().catch(() => false);
  log(stillActivated, 'Dashboard still visible after reload (activation persisted)');

  // ── 6. Sign out → gate returns ──────────────────────────────────────────
  console.log('\n6. SIGN OUT — gate returns');
  // After reload, activeTab defaults to 'home' — navigate to profile via text
  const profileTab6 = page.locator('text=Profile').last();
  if (await profileTab6.isVisible().catch(() => false)) {
    await profileTab6.click();
    await page.waitForTimeout(1500);
  }

  // Click the sign-out button (text: "Sign out (remove from this device)")
  const signOutBtn6 = page.getByRole('button', { name: /sign out/i });
  const signOutVisible6 = await signOutBtn6.isVisible().catch(() => false);
  if (signOutVisible6) {
    await signOutBtn6.click();
    // Wait for state update + re-render to activation gate
    await page.waitForTimeout(3000);
  } else {
    console.log('  [warn] sign-out button not found');
  }

  const gateReturned = await page.getByText('Activate this device').isVisible().catch(() => false);
  log(gateReturned, 'Activation gate returns after sign out');

  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/10-signout-gate-dark.png` });
  console.log('  captured sign-out gate screenshot');

  // ── 7. Re-activate with a second temp owner key ────────────────────────
  console.log('\n7. RE-ACTIVATE — same role works again');
  if (!gateReturned) {
    log(false, 'Re-activation skipped (gate did not return)');
  } else {
    // Mint a fresh temp owner key for re-activation (the first was already used).
    let tempOwnerCode2;
    try {
      tempOwnerCode2 = await mintTempOwnerKey();
    } catch (e) {
      log(false, `Could not mint a second temp owner key: ${e.message}`);
    }
    if (tempOwnerCode2) {
      const input2 = page.locator('input[placeholder="XXXX-XXXX-XXXX-XXXX"]');
      await input2.fill(tempOwnerCode2);
      await page.getByRole('button', { name: /activate/i }).click();
      await page.waitForTimeout(5000);

      // activeTab persists from step 6 (profile) — navigate Home to see the greeting
      const homeTab7 = page.getByRole('button', { name: /^home$/i }).first();
      if (await homeTab7.isVisible().catch(() => false)) {
        await homeTab7.click();
        await page.waitForTimeout(1500);
      }

      const reActivated = await page.getByText(/Good (morning|afternoon|evening)/i).isVisible().catch(() => false)
        || await page.getByText('No more classes today').isVisible().catch(() => false);
      log(reActivated, 'Re-activation successful with a fresh temp owner key');

      await setTheme(page, 'dark');
      await page.screenshot({ path: `${OUT}/11-reactivate-dark.png` });
      console.log('  captured re-activation screenshot');
    }
  }

  await browser.close();
  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
