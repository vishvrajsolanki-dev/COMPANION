#!/usr/bin/env node
/**
 * Phase 2 — H4 iOS backup download, verified in the REAL WebKit engine at a
 * real mobile viewport (360×640), covering both call sites and both delivery
 * paths of `exportJSONFile`:
 *
 *   [A] Manual "Backup Data" on a non-iOS engine  → anchor-download fallback
 *   [B] Manual "Backup Data" on a stubbed iOS     → Web Share API with a File
 *   [C] Clear All Data auto-export on non-iOS     → anchor fallback + full wipe
 *
 * [A] proves the fallback path still produces a real browser download; [B]
 * proves iOS goes through navigator.share with the correctly-named File (the
 * path Safari actually honours); [C] proves the auto-export fires first and the
 * wipe still completes. The anchor path is captured by hooking
 * HTMLAnchorElement.prototype.click (records href/download) AND by listening for
 * Playwright `download` events, so the engine's own download is also observed.
 *
 * Run: node scripts/phase2-h4-webkit.cjs
 */
'use strict';

const { webkit } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3001/';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function makeActivation(role) {
  const accountId = `h4-webkit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    role,
    accountId,
    profileId: `profile-${accountId}`,
    codePreview: 'H4…',
    activatedAt: new Date().toISOString(),
    adminCode: 'H4-WEBKIT',
  };
}

let pass = 0, fail = 0;
function log(ok, msg, extra) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}${extra ? '  → ' + extra : ''}`);
  ok ? pass++ : fail++;
}

/** Records anchor-download clicks so we can assert the fallback path executed. */
const anchorHook = `
  window.__anchorClicks = [];
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__anchorClicks.push({ href: this.href, download: this.download, target: this.target });
    return orig.call(this);
  };
`;

async function seedActivation(page, role) {
  await page.addInitScript((activation) => {
    localStorage.setItem('academic_os_activation', JSON.stringify(activation));
    localStorage.removeItem('academic_os_user_cleared');
  }, makeActivation(role));
}

async function openProfile(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Profile' }).click();
}

async function totalRows(page) {
  return page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    let n = 0;
    for (const t of m.db.tables) n += (await t.toArray()).length;
    return n;
  });
}

async function main() {
  console.log(`=== H4 WebKit e2e (${BASE}, WebKit 360x640) ===`);
  const browser = await webkit.launch({ headless: true });

  try {
    // ── [A] Manual Backup Data → anchor fallback (non-iOS engine) ──────────
    console.log('\n[A] Manual Backup Data — anchor fallback (non-iOS WebKit)');
    {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
      const page = await ctx.newPage();
      page.setDefaultTimeout(25000);
      page.on('pageerror', (e) => console.log('  [pageerror A]', e.message));
      await seedActivation(page, 'owner');
      await page.addInitScript(anchorHook);

      const downloads = [];
      page.on('download', (d) => downloads.push(d.suggestedFilename()));

      await openProfile(page);
      await page.getByRole('button', { name: /Backup Data/ }).click();

      await page.getByText(/JSON backup exported to your device/).waitFor({ state: 'visible' });
      const clicks = await page.evaluate(() => window.__anchorClicks);
      const a = clicks.find((c) => c.download.startsWith('academic_os_backup_'));
      log(!!a, 'Backup Data exported via an anchor-download click',
        a ? `download="${a.download}" href="${String(a.href).slice(0, 24)}…"` : JSON.stringify(clicks));
      log(a && /^academic_os_backup_\d{4}-\d{2}-\d{2}\.json$/.test(a.download), 'backup filename matches academic_os_backup_YYYY-MM-DD.json', a?.download);
      log(a && a.href.startsWith('blob:'), 'anchor points at a blob: URL (real file payload)', a?.href.slice(0, 24) + '…');
      log(downloads.length >= 1, 'WebKit engine emitted a real download event', `suggestedFilename=${downloads.join(', ') || 'none'}`);
      await ctx.close();
    }

    // ── [B] Manual Backup Data → Web Share API (stubbed iOS Safari) ─────────
    console.log('\n[B] Manual Backup Data — Web Share API (iOS Safari)');
    {
      const ctx = await browser.newContext({
        viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true,
        userAgent: IPHONE_UA,
      });
      const page = await ctx.newPage();
      page.setDefaultTimeout(25000);
      page.on('pageerror', (e) => console.log('  [pageerror B]', e.message));
      await seedActivation(page, 'owner');
      await page.addInitScript(anchorHook);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'platform', { get: () => 'iPhone', configurable: true });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true });
        Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(navigator, 'share', {
          value: async (data) => {
            window.__shareCalls = (window.__shareCalls || []).concat([{
              files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
              title: data.title, text: data.text,
            }]);
          },
          configurable: true,
        });
      });

      await openProfile(page);
      await page.getByRole('button', { name: /Backup Data/ }).click();

      await page.getByText(/JSON backup exported to your device/).waitFor({ state: 'visible' });
      const shared = await page.evaluate(() => window.__shareCalls || []);
      log(shared.length === 1, 'iOS path delivered the file via navigator.share', `share calls=${shared.length}`);
      log(shared.length === 1 && shared[0].files[0]?.name === shared[0].title &&
        /^academic_os_backup_\d{4}-\d{2}-\d{2}\.json$/.test(shared[0].files[0]?.name || ''),
        'shared File carries the backup filename', shared[0]?.files[0]?.name);
      log(shared.length === 1 && shared[0].files[0]?.type === 'application/json', 'shared File type is application/json', shared[0]?.files[0]?.type);
      const anchors = await page.evaluate(() => window.__anchorClicks || []);
      log(anchors.length === 0, 'anchor fallback NOT used on iOS (share path won)',
        anchors.length ? `unexpected anchor: ${JSON.stringify(anchors)}` : '');
      await ctx.close();
    }

    // ── [C] Clear All Data → auto-export fires, then full wipe ──────────────
    console.log('\n[C] Clear All Data — auto-export + wipe (non-iOS WebKit)');
    {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
      const page = await ctx.newPage();
      page.setDefaultTimeout(25000);
      page.on('pageerror', (e) => console.log('  [pageerror C]', e.message));
      await seedActivation(page, 'owner');
      await page.addInitScript(anchorHook);

      const downloads = [];
      page.on('download', (d) => downloads.push(d.suggestedFilename()));

      await openProfile(page);
      const before = await totalRows(page);
      log(before > 0, 'account has seeded data before the wipe', `${before} rows`);

      await page.getByRole('button', { name: /Clear All Data/ }).click();
      await page.getByText('Wipe All Local Data?').waitFor({ state: 'visible' });
      await page.getByPlaceholder('DELETE').fill('DELETE');
      await page.getByRole('button', { name: /Export & Wipe All Data/ }).click();

      // Auto-export runs first → anchor click recorded; wipe follows → flag +
      // empty DB + navigation to Semester Setup.
      await page.locator('h2').filter({ hasText: 'Semesters' }).waitFor({ state: 'visible', timeout: 15000 });
      const clicks = await page.evaluate(() => window.__anchorClicks);
      const a = clicks.find((c) => c.download.startsWith('academic_os_backup_'));
      log(!!a, 'auto-export fired before the wipe (anchor download)', a ? `download="${a.download}"` : JSON.stringify(clicks));
      const flag = await page.evaluate(() => localStorage.getItem('academic_os_user_cleared'));
      log(flag === 'true', 'academic_os_user_cleared flag set (no re-seed)', `flag=${flag}`);
      const after = await totalRows(page);
      log(after === 0, 'all IndexedDB tables emptied', `${before} → ${after} rows`);
      log(downloads.length >= 1, 'WebKit engine emitted a real download event for the auto-export', `suggestedFilename=${downloads.join(', ') || 'none'}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n=== H4 WEBKIT RESULT: ${fail === 0 ? 'PASS' : fail + ' FAILURE(S)'} (${pass} ok / ${fail} fail) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error('\n=== H4 WEBKIT ERROR ==='); console.error(err); process.exit(1); });
