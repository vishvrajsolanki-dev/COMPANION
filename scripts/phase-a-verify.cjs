// Phase A visual verification — screenshots the app in dark + light to confirm
// the "Two Distinct UIs" rebuild: distinct palettes per theme, no hardcoded-hex
// bleed, shapes (squircle/blob/pill) present, text readable.
// Run: node scripts/phase-a-verify.cjs  (preview server on :4173)
const { chromium } = require('playwright');

const BASE = 'http://localhost:4173/';
const OUT = 'scripts/shots/phase-a';

async function setTheme(page, theme) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.container, main', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Home — both themes (hero card, stat tiles, accent-bar cards)
  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT}/01-home-dark.png` });
  console.log('captured 01-home-dark');
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT}/02-home-light.png` });
  console.log('captured 02-home-light');

  // Tasks — dark + light (priority pills, accent bars)
  await setTheme(page, 'dark');
  await page.click('text=Tasks');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03-tasks-dark.png` });
  console.log('captured 03-tasks-dark');
  await setTheme(page, 'light');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-tasks-light.png` });
  console.log('captured 04-tasks-light');

  // Profile — dark + light (QuickLinks, StatTiles, avatar conic ring)
  await setTheme(page, 'dark');
  await page.click('text=Profile');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/05-profile-dark.png` });
  console.log('captured 05-profile-dark');
  await setTheme(page, 'light');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-profile-light.png` });
  console.log('captured 06-profile-light');

  await browser.close();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });
