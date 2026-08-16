// Phase 1 WebKit visual verification for H1/H10/H6 + regression spot-checks.
// Drives the real React UI in Playwright WebKit at a 360x640 mobile viewport.
const { webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3001/';
const OUT_DIR = path.join(__dirname, '..', 'artifacts', 'phase1-webkit');

const accountId = `phase1-webkit-${Date.now()}`;
const ACTIVATION = {
  role: 'owner',
  accountId,
  profileId: `profile-${accountId}`,
  codePreview: 'WEBKIT…',
  activatedAt: new Date().toISOString(),
  adminCode: 'WEBKIT-VERIFY',
};

const CODES = ['2AI501', '2AI502', '2AI503', '2AI504', '2AI505', '2AI506'];
const SUBJECT_NAMES = {
  '2AI501': 'Machine Learning',
  '2AI502': 'Data Structures & Algorithms',
  '2AI503': 'Database Systems',
  '2AI504': 'Computer Networks',
  '2AI505': 'Software Engineering',
  '2AI506': 'AI Lab (Batch A)',
};

function makeTimetablePayload() {
  const times = [
    ['08:30', '09:20'],
    ['09:30', '10:20'],
    ['10:30', '11:20'],
    ['11:30', '12:20'],
    ['13:00', '13:50'],
  ];
  const patterns = [];
  for (let day = 1; day <= 6; day++) {
    for (let period = 0; period < 5; period++) {
      // Non-negative modulo: (day + period - 2) can go negative when day=1, period=0.
      const code = CODES[((day + period - 2) % CODES.length + CODES.length) % CODES.length];
      patterns.push({
        subject_code: code,
        day_of_week: day,
        start_time: times[period][0],
        end_time: times[period][1],
        room_id: `${day <= 4 ? 'LH' : 'CL'}-${300 + day}${period + 1}`,
        faculty_name: `Phase 1 Faculty ${code}`,
      });
    }
  }
  return {
    semester_label: 'Semester 5 (Odd 2026)',
    subjects: CODES.map((code) => ({ code, name: SUBJECT_NAMES[code], credits: code === '2AI506' ? 2 : 3 })),
    patterns,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  screenshot: ${path.relative(process.cwd(), file)}`);
}

async function dbSnapshot(page) {
  return page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const [subjects, slots, records, sems] = await Promise.all([
      db.subjects.filter((s) => !s.is_deleted).toArray(),
      db.lectureSlots.filter((s) => !s.is_deleted).toArray(),
      db.attendanceRecords.filter((r) => !r.is_deleted).toArray(),
      db.semesters.filter((s) => !s.is_deleted).toArray(),
    ]);
    return {
      subjects: subjects.length,
      slots: slots.length,
      records: records.length,
      semesters: sems.map((s) => `${s.label}${s.is_active ? ' [active]' : ''}`),
    };
  });
}

async function waitForDbSettle(page) {
  let prev = null;
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(250);
    const cur = JSON.stringify(await dbSnapshot(page));
    if (cur === prev) stable += 1;
    else stable = 0;
    prev = cur;
    if (stable >= 2) return JSON.parse(cur);
  }
  throw new Error('DB did not settle');
}

async function goBack(page) {
  await page.locator('header button').first().click();
  await page.waitForTimeout(300);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
  await context.addInitScript((activation) => {
    localStorage.setItem('academic_os_activation', JSON.stringify(activation));
    localStorage.removeItem('academic_os_user_cleared');
  }, ACTIVATION);

  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror', (err) => console.error('  pageerror:', err.message));

  console.log(`=== Phase 1 WebKit verification (${BASE}, 360x640, account ${accountId}) ===`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible' });
  const base = await waitForDbSettle(page);
  console.log(`  boot DB: ${JSON.stringify(base)}`);
  assert(base.semesters.some((s) => /Semester 5/.test(s) && /active/.test(s)), 'Seeded active Semester 5 is required for import verification');

  console.log('\n=== H1: fresh account / zero attendance shows honest empty state ===');
  await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    await m.db.attendanceRecords.clear();
  });
  const afterClear = await dbSnapshot(page);
  assert(afterClear.records === 0, `Expected 0 attendance records after clear, got ${afterClear.records}`);
  await page.getByRole('button', { name: 'Performance' }).click();
  await page.getByRole('heading', { name: 'Analytics Hub' }).waitFor({ state: 'visible' });
  await page.getByText('No attendance marked yet').waitFor({ state: 'visible' });
  const trendChartCount = await page.locator('svg[viewBox="0 0 300 100"]').count();
  assert(trendChartCount === 0, `Expected no trend chart SVG for empty attendance, found ${trendChartCount}`);
  await screenshot(page, 'h1-analytics-empty-state');
  console.log('  PASS: empty trend state is shown, with no invented chart line.');
  await goBack(page);

  console.log('\n=== H10: import ~530 generated slots and verify labeled WeeklyGrid cards at volume ===');
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Timetable JSON' }).click();
  await page.getByRole('heading', { name: 'Import Timetable JSON' }).first().waitFor({ state: 'visible' });
  const payload = makeTimetablePayload();
  await page.locator('textarea').fill(JSON.stringify(payload, null, 2));
  await page.getByRole('button', { name: 'Validate JSON Payload' }).click();
  // The projected slot count is computed asynchronously after validation; the
  // "~N dated lecture slots" text only renders once the projection has settled.
  await page.getByText(/dated lecture slots/).waitFor({ state: 'visible' });
  const previewText = await page.locator('div', { hasText: 'weekly recurring patterns' }).last().innerText();
  assert(/30 weekly recurring patterns/.test(previewText), `Expected '30 weekly recurring patterns' in preview summary, got: ${previewText}`);
  assert(/~530 dated lecture slots/.test(previewText), `Expected '~530 dated lecture slots' in preview summary, got: ${previewText}`);
  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  try {
    await page.getByText(/Successfully imported and generated/).waitFor({ state: 'visible', timeout: 30000 });
  } catch (e) {
    const dump = await page.evaluate(() => document.body.innerText.slice(0, 2500));
    console.error('  commit success text not seen; body dump follows:\n' + dump);
    await screenshot(page, 'h10-commit-failure-dump');
    throw e;
  }
  const imported = await waitForDbSettle(page);
  console.log(`  post-import DB: ${JSON.stringify(imported)}`);
  assert(imported.slots >= 530, `Expected at least 530 live slots after import, got ${imported.slots}`);
  await screenshot(page, 'h10-import-success-530-slots');
  await goBack(page);

  await page.getByRole('button', { name: 'Schedule' }).click();
  await page.getByRole('heading', { name: /Weekly Timetable/ }).first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Mon' }).click();
  await page.getByText('08:30 - 09:20').first().waitFor({ state: 'visible' });
  const cards = await page.evaluate(() => {
    const likelyCards = [...document.querySelectorAll('div')].filter((el) => {
      const children = [...el.children];
      if (children.length !== 2) return false;
      const first = children[0];
      const second = children[1];
      const firstStyle = getComputedStyle(first);
      const secondStyle = getComputedStyle(second);
      return Math.round(first.getBoundingClientRect().width) === 6 &&
        firstStyle.flexShrink === '0' &&
        secondStyle.display === 'flex' &&
        second.textContent &&
        /Scheduled|Present|Absent|Late|Medical|On-Duty|Cancelled|Rescheduled|Extra Class/.test(second.textContent);
    });
    return likelyCards.map((card) => {
      const text = card.textContent.replace(/\s+/g, ' ').trim();
      const code = (text.match(/2AI\d{3}/) || [null])[0];
      const time = (text.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/) || [null])[0];
      const hasRoom = /(?:LH|CL)-\d+|Classroom/.test(text);
      const hasStatus = /Scheduled|Present|Absent|Late|Medical|On-Duty|Cancelled|Rescheduled|Extra Class/.test(text);
      const hasName = code ? text.replace(code, '').replace(time || '', '').replace(/Scheduled|Present|Absent|Late|Medical|On-Duty|Cancelled|Rescheduled|Extra Class/g, '').trim().length > 0 : false;
      return { text, code, time, hasRoom, hasStatus, hasName };
    });
  });
  const badCards = cards.filter((c) => !c.code || !c.time || !c.hasRoom || !c.hasStatus || !c.hasName);
  assert(cards.length >= 90, `Expected Monday to render at least 90 labeled cards at volume, got ${cards.length}`);
  assert(badCards.length === 0, `Found unlabeled/malformed generated cards: ${JSON.stringify(badCards.slice(0, 3))}`);
  await screenshot(page, 'h10-weekly-grid-labeled-cards-volume');
  console.log(`  PASS: ${cards.length} Monday WebKit cards detected; every sampled card had subject code/name/time/room/status.`);

  console.log('\n=== H6: Create Note textarea has card radius, not pill/blob radius ===');
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Study Notes' }).click();
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByRole('heading', { name: 'Create Note' }).waitFor({ state: 'visible' });
  const textareaMetrics = await page.locator('textarea[placeholder="Start writing markdown content..."]').evaluate((el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { borderRadius: cs.borderRadius, width: rect.width, height: rect.height, bg: cs.backgroundColor };
  });
  assert(textareaMetrics.borderRadius === '18px', `Expected Notes textarea border-radius 18px, got ${textareaMetrics.borderRadius}`);
  await screenshot(page, 'h6-notes-textarea-no-blob');
  console.log(`  PASS: Notes textarea radius=${textareaMetrics.borderRadius}, size=${Math.round(textareaMetrics.width)}x${Math.round(textareaMetrics.height)}.`);
  await goBack(page);
  await goBack(page);

  console.log('\n=== Regression spot-checks: #16 dark mode, #15 Clear All Data, #3 duplicate-semester prompt ===');
  await page.getByRole('button', { name: 'Profile' }).click();
  const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.getByRole('button', { name: /Appearance/ }).click();
  const afterTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert(beforeTheme !== afterTheme, `Expected Appearance to flip data-theme, before=${beforeTheme} after=${afterTheme}`);
  console.log(`  PASS #16: data-theme flipped ${beforeTheme} → ${afterTheme}.`);

  await page.getByRole('button', { name: /Clear All Data/ }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /Clear All Data/ }).click();
  await page.getByText('Wipe All Local Data?').waitFor({ state: 'visible' });
  await screenshot(page, 'regression-15-clear-all-data-sheet');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByText('Wipe All Local Data?').waitFor({ state: 'hidden' });
  console.log('  PASS #15: Clear All Data opens cancellable wipe sheet on 360px WebKit.');

  await page.getByRole('button', { name: 'Import Academic Calendar JSON' }).click();
  await page.getByRole('heading', { name: 'Import Academic Calendar' }).first().waitFor({ state: 'visible' });
  await page.locator('textarea').fill(JSON.stringify({
    semester_defaults: { label: 'Semester 5 (Odd 2026)', start_date: '2026-07-06', end_date: '2026-11-05' },
    events: [],
  }, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.getByText(/already exists|overlap/i).waitFor({ state: 'visible' });
  await screenshot(page, 'regression-3-duplicate-semester-warning');
  console.log('  PASS #3: duplicate-semester validation surfaces a visible warning before import.');

  await browser.close();
  console.log('\n=== PHASE 1 WEBKIT VISUAL VERIFICATION PASS ===');
}

main().catch(async (err) => {
  console.error('\n=== PHASE 1 WEBKIT VISUAL VERIFICATION FAIL ===');
  console.error(err);
  process.exit(1);
});
