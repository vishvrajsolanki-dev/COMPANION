#!/usr/bin/env node
/**
 * verify-live-deploy.cjs
 *
 * Post-deploy verification of the Cloudflare Pages live URL. Proves, with real
 * observed results against https://student-academic-os.pages.dev:
 *   1. Root HTML, manifest.webmanifest and sw.js are served (200).
 *   2. The activation gate actually renders (JS bundle runs — Supabase vars
 *      were baked in at build time).
 *   3. A real end-to-end activation works over HTTPS using a throwaway temp
 *      owner key minted via the anon-key RPC (the real owner key's one use is
 *      never consumed).
 *   4. The service worker registers in a fresh browser context.
 *
 * Prereqs: .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY +
 * VERIFY_OWNER_KEY, and the deployed URL below.
 *
 * Run: node scripts/verify-live-deploy.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { requireOwnerKey } = require('./lib/env.cjs');

const ROOT = path.join(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const SUPABASE_URL = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1].trim();
const ANON_KEY = (env.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1].trim();
const OWNER_KEY = requireOwnerKey();
const LIVE = 'https://student-academic-os.pages.dev/';

let passed = 0, failed = 0;
function log(ok, msg) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}`);
  ok ? passed++ : failed++;
}

(async () => {
  console.log('═════════ LIVE DEPLOY · Cloudflare Pages ═════════\n');

  // ── Static surface ─────────────────────────────────────────────────────────
  for (const [p, label] of [['', 'root HTML'], ['manifest.webmanifest', 'manifest (webmanifest)'], ['sw.js', 'service worker'], ['manifest.json', 'manifest (static)']]) {
    const r = await fetch(LIVE + p).catch(() => null);
    log(r && r.status === 200, `${label} reachable over HTTPS (status ${r ? r.status : 'ERR'})`);
  }

  // ── Security headers (Section 8) ───────────────────────────────────────────
  const headers = await fetch(LIVE).then(r => r.headers).catch(() => null);
  if (headers) {
    const csp = headers.get('content-security-policy') || '';
    log(!!csp && csp.includes("default-src 'self'"), 'Content-Security-Policy present on root HTML');
    log(csp.includes("connect-src 'self' https://*.supabase.co"), 'CSP allows only Supabase + self for connect-src');
    log(csp.includes("frame-ancestors 'none'"), 'CSP blocks embedding (frame-ancestors none)');
    const scriptSrc = (csp.match(/(?:^|;)\s*script-src\s+([^;]+)/) || [])[1] || '';
    log(!!scriptSrc && !scriptSrc.includes("'unsafe-inline'"), 'CSP blocks inline scripts (script-src self, no unsafe-inline)');
    log((headers.get('x-content-type-options') || '') === 'nosniff', 'X-Content-Type-Options: nosniff');
    log((headers.get('referrer-policy') || '') === 'no-referrer', 'Referrer-Policy: no-referrer');
    log((headers.get('x-frame-options') || '') === 'DENY', 'X-Frame-Options: DENY');
  } else {
    log(false, 'Could not read response headers from the live URL');
  }

  // ── End-to-end activation on the live URL ─────────────────────────────────
  const mint = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_generate_key`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_admin_code: OWNER_KEY, p_role: 'owner', p_label: 'VerifyLiveDeploy', p_max_uses: 1, p_expires_at: null }),
  });
  const mintJ = await mint.json();
  const code = mintJ?.key?.code;
  log(mintJ?.ok === true && !!code, 'Owner mints a throwaway temp-owner key for live activation');
  if (!code) {
    console.error('  Could not mint a temp key — aborting.');
    process.exit(1);
  }

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  await page.goto(LIVE, { waitUntil: 'networkidle' });
  const gate = page.locator('input[placeholder="XXXX-XXXX-XXXX-XXXX"]');
  log(await gate.isVisible().catch(() => false), 'Activation gate renders on the live URL (JS bundle executes)');

  await gate.fill(code);
  await page.getByRole('button', { name: /activate/i }).click();
  await page.waitForTimeout(9000);
  const gateGone = await gate.isHidden().catch(() => true);
  const profileNav = await page.getByText('Profile', { exact: false }).first().isVisible().catch(() => false);
  log(gateGone && profileNav, 'Live activation succeeds — app renders post-gate content (Profile nav visible)');

  const swReg = await page.evaluate(() =>
    navigator.serviceWorker.getRegistrations().then(rs => rs.length).catch(() => 0)
  );
  log(swReg > 0, `Service worker registered in a fresh context (${swReg} registration)`);

  await browser.close();
  console.log(`\n  ───────────────────────────────────────────────`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`  Live URL: ${LIVE}`);
  console.log(`  ───────────────────────────────────────────────`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
