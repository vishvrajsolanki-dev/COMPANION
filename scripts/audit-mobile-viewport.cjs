// Real mobile-viewport audit: walks every tab + subview at 375×667 (iPhone
// SE-class), flags any element that extends past the right edge of the viewport
// (clipped by the app's html/body overflow:hidden shell), and saves screenshots
// to scripts/shots/mobile/ for visual inspection.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';
const SHOT_DIR = path.join(__dirname, 'shots', 'mobile');
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function report(page, name) {
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const w = window.innerWidth;
    const doc = document.documentElement;
    const mainEl = document.querySelector('main');
    const offenders = [];
    const seen = new Set();
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > w + 2) {
        // dedupe by tag+left+width (ancestors and children both overflow identically)
        const key = `${el.tagName}|${Math.round(r.left)}|${Math.round(r.width)}`;
        if (seen.has(key)) return;
        seen.add(key);
        const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
        offenders.push({
          tag: el.tagName,
          cls,
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          right: Math.round(r.right),
          left: Math.round(r.left),
          width: Math.round(r.width),
        });
      }
    });
    return {
      w,
      docScrollW: doc.scrollWidth,
      mainClientW: mainEl ? mainEl.clientWidth : null,
      mainScrollW: mainEl ? mainEl.scrollWidth : null,
      offenders: offenders.slice(0, 14),
      offenderCount: offenders.length,
    };
  });
  const flag = r.offenderCount > 0 || (r.mainScrollW && r.mainScrollW > r.mainClientW + 1)
    ? 'H-OVERFLOW' : 'ok';
  console.log(`  [${name}] vw=${r.w} docScrollW=${r.docScrollW} main=${r.mainClientW}/${r.mainScrollW} → ${flag} (${r.offenderCount})`);
  if (r.offenders.length > 0) {
    r.offenders.forEach(o =>
      console.log(`      - <${o.tag}> right=${o.right} w=${o.width} "${o.text}" [${o.cls}]`)
    );
  }
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

async function back(page) {
  await page.locator('header button').first().click();
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 375, height: 667 } })).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(400);

  console.log('=== MOBILE VIEWPORT AUDIT (375×667) ===');

  // ── Bottom tabs ───────────────────────────────────────────────────────────
  console.log('\n-- bottom tabs --');
  await report(page, '01-home');
  for (const [tab, name] of [['Schedule', '02-schedule'], ['Tasks', '03-tasks'], ['Profile', '04-profile']]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await report(page, name);
  }

  // ── Dashboard quick-link subviews ─────────────────────────────────────────
  console.log('\n-- dashboard quick links --');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.waitForTimeout(300);
  const quick = [
    ['Attendance', '05-attendance'],
    ['Study Notes', '06-notes'],
    ['Exams & Quizzes', '07-exams'],
    ['Performance', '08-analytics'],
  ];
  for (const [btn, name] of quick) {
    await page.getByRole('button', { name: btn }).click();
    await report(page, name);
    await back(page);
  }
  await page.waitForTimeout(300);

  // ── Profile rows ──────────────────────────────────────────────────────────
  console.log('\n-- profile rows / management views --');
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  const rows = [
    ['Semesters & Dates', '09-semester-setup'],
    ['Manage Subjects', '10-manage-subjects'],
    ['Build Timetable Pattern', '11-timetable-builder'],
    ['Import Timetable JSON', '12-timetable-import'],
    ['Import Academic Calendar JSON', '13-calendar-import'],
    ['Calendar Events', '14-calendar-events'],
    ['Faculty Directory', '15-directory'],
    ['Resources Shelf', '16-resources'],
  ];
  for (const [btn, name] of rows) {
    await page.getByRole('button', { name: btn }).click();
    await report(page, name);
    await back(page);
    await page.waitForTimeout(250);
  }

  // ── Bottom-sheet forms ────────────────────────────────────────────────────
  console.log('\n-- bottom-sheet forms --');
  await page.getByRole('button', { name: 'Manage Subjects' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByPlaceholder('2AI501').waitFor({ state: 'visible' });
  await report(page, '17-sheet-manage-subjects-add');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.locator('header button').first().click();
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: 'Calendar Events' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByPlaceholder('e.g. Holi Vacation').waitFor({ state: 'visible' });
  await report(page, '18-sheet-calendar-events-add');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.locator('header button').first().click();
  await page.waitForTimeout(300);

  await browser.close();
  console.log(`\nScreenshots written to: ${SHOT_DIR}`);
  console.log('=== MOBILE VIEWPORT AUDIT COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
