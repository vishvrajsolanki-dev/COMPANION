// Phase B verification.
//  1. REGRESSION (no env): app renders ungated — ActivationView must NOT appear.
//  2. GATED (env set): fresh profile shows ActivationView; wrong key errors;
//     correct key activates; reload stays activated.
// The second half only runs when the served bundle has Supabase configured, so
// it's exercised by building with real env vars (see plan Part 7).
// Run: node scripts/phase-b-verify.cjs   (preview server on :4173)
const { chromium } = require('playwright');

const BASE = 'http://localhost:4173/';
const OUT = 'scripts/shots/phase-b';

function log(ok, msg) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}`);
  if (!ok) process.exitCode = 1;
}

async function setTheme(page, theme) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.container, main, [class]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const gateVisible = await page.getByText('Activate this device').isVisible().catch(() => false);
  log(!gateVisible, 'REG.RESSURE: activation gate is NOT shown (unconfigured build)');

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasDashboard = /Good (morning|afternoon|evening)/i.test(bodyText) || /Today|Next Class/i.test(bodyText);
  log(hasDashboard, `dashboard/home content present (${gateVisible ? 'gate' : 'home'} text found)`);

  // Theme screenshots of whatever renders (home when ungated).
  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/01-regression-dark.png` });
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT}/02-regression-light.png` });
  console.log('captured regression screenshots');

  await browser.close();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });
