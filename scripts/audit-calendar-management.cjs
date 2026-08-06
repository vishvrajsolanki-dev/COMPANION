// Real UI-driven audit of the built-in ADIT Academic Calendar feature:
//  1. fresh load seeds the official ADIT 2026-27 defaults (exact count + key rows),
//  2. the sample semester carries the real ADIT dates (2026-07-06 → 2026-11-15),
//  3. the Calendar Events management view lists the defaults,
//  4. add / edit / delete a custom event round-trips through IndexedDB,
//  5. deleting a default then "Reset to ADIT" restores it (customs kept, no dupes).
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';

const EXPECTED_DEFAULT_COUNT = 12;
const EXPECTED_KEYS = [
  { title: 'Independence Day', date: '2026-08-15' },
  { title: 'Diwali Vacation', date: '2026-11-16' },
  { title: 'Summer Vacation', date: '2027-05-03' },
  { title: 'Republic Day', date: '2027-01-26' },
];

async function dbState(page) {
  return page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const events = await db.calendarEvents.filter(e => !e.is_deleted).toArray();
    const sem = await db.semesters.filter(s => s.is_active && !s.is_deleted).first();
    return {
      live: events.length,
      total: await db.calendarEvents.count(),
      titles: events.map(e => e.title),
      semDates: sem ? `${sem.start_date} → ${sem.end_date}` : null,
      semLabel: sem ? sem.label : null,
    };
  });
}

async function settle(page) {
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const cur = await page.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      return String(await m.db.calendarEvents.count());
    });
    if (cur === prev) stable += 1; else stable = 0;
    prev = cur;
    if (stable >= 2) return;
  }
  throw new Error('DB did not settle');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(15000);
  page.on('dialog', d => d.accept()); // auto-accept confirm() for delete/reset

  await page.goto(BASE);
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  await settle(page);

  // ── 1. Seeding ─────────────────────────────────────────────────────────────
  console.log('=== ADIT DEFAULT CALENDAR AUDIT (fresh seed) ===');
  const s1 = await dbState(page);
  const seeded = s1.live === EXPECTED_DEFAULT_COUNT;
  const keyPresent = EXPECTED_KEYS.every(k => s1.titles.includes(k.title));
  console.log(`1. Fresh load calendarEvents live=${s1.live} total=${s1.total}`);
  console.log(`   All ${EXPECTED_DEFAULT_COUNT} ADIT defaults seeded? ${seeded ? 'PASS' : 'FAIL'}`);
  console.log(`   Key holidays/exams present (${EXPECTED_KEYS.map(k => k.title).join(', ')})? ${keyPresent ? 'PASS' : 'FAIL'}`);
  console.log(`   Active semester: ${s1.semLabel} (${s1.semDates})`);
  console.log(`   Sample semester carries ADIT dates (2026-07-06 → 2026-11-15)? ${s1.semDates === '2026-07-06 → 2026-11-15' ? 'PASS' : 'FAIL'}`);
  console.log(`   Seeded rows: ${s1.titles.join(' | ')}`);

  // ── 2. Open management view ────────────────────────────────────────────────
  console.log('\n2. Open "Calendar Events" management view');
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Calendar Events' }).click();
  await page.getByRole('button', { name: 'Add' }).waitFor({ state: 'visible' });
  const listText = await page.evaluate(() => document.body.innerText);
  const rendered = EXPECTED_KEYS.filter(k => listText.includes(k.title));
  console.log('   Rendered default rows in UI:');
  rendered.forEach(k => console.log('    | ' + k.title));
  console.log(`   Defaults visible in UI? ${rendered.length === EXPECTED_KEYS.length ? 'PASS' : 'FAIL'}`);

  // ── 3. Add custom event ────────────────────────────────────────────────────
  console.log('\n3. Add custom event "AIML Workshop" (2026-09-05)');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByPlaceholder('e.g. Holi Vacation').waitFor({ state: 'visible' });
  await page.getByPlaceholder('e.g. Holi Vacation').fill('AIML Workshop');
  await page.locator('input[type="date"]').fill('2026-09-05');
  await page.getByRole('button', { name: 'Save Event' }).click();
  await settle(page);
  const s3 = await dbState(page);
  console.log(`   Live events ${s1.live} → ${s3.live} (+${s3.live - s1.live})  [expected +1]  ${s3.live === s1.live + 1 ? 'PASS' : 'FAIL'}`);
  console.log(`   "AIML Workshop" in DB? ${s3.titles.includes('AIML Workshop') ? 'PASS' : 'FAIL'}`);

  // ── 4. Edit custom event ───────────────────────────────────────────────────
  console.log('\n4. Edit "AIML Workshop" → "AIML Workshop (rescheduled)"');
  await page.getByRole('button', { name: 'Edit AIML Workshop' }).click();
  await page.getByPlaceholder('e.g. Holi Vacation').fill('AIML Workshop (rescheduled)');
  await page.getByRole('button', { name: 'Save Event' }).click();
  await settle(page);
  const s4 = await dbState(page);
  console.log(`   Count unchanged? ${s4.live === s3.live ? 'PASS' : 'FAIL'}`);
  console.log(`   New title in DB? ${s4.titles.includes('AIML Workshop (rescheduled)') ? 'PASS' : 'FAIL'}`);

  // ── 5. Delete custom event ─────────────────────────────────────────────────
  console.log('\n5. Delete the custom event (soft delete)');
  await page.getByRole('button', { name: 'Delete AIML Workshop (rescheduled)' }).click();
  await settle(page);
  const s5 = await dbState(page);
  console.log(`   Live events ${s4.live} → ${s5.live} (-${s4.live - s5.live})  [expected -1]  ${s5.live === s4.live - 1 ? 'PASS' : 'FAIL'}`);

  // ── 6. Delete a DEFAULT, then reset restores it ────────────────────────────
  console.log('\n6. Delete default "Republic Day", then "Reset to ADIT"');
  await page.getByRole('button', { name: 'Delete Republic Day' }).click();
  await settle(page);
  const s6 = await dbState(page);
  console.log(`   After deleting Republic Day: live=${s6.live} (expected ${s5.live - 1})  ${s6.live === s5.live - 1 ? 'PASS' : 'FAIL'}`);
  console.log(`   Republic Day gone? ${!s6.titles.includes('Republic Day') ? 'PASS' : 'FAIL'}`);

  await page.getByRole('button', { name: /Reset to ADIT/ }).click();
  await settle(page);
  const s7 = await dbState(page);
  const defaultsBack = EXPECTED_KEYS.every(k => s7.titles.includes(k.title));
  console.log(`   Live events after reset: ${s7.live}  [expected ${EXPECTED_DEFAULT_COUNT}]  ${s7.live === EXPECTED_DEFAULT_COUNT ? 'PASS' : 'FAIL'}`);
  console.log(`   Republic Day restored? ${s7.titles.includes('Republic Day') ? 'PASS' : 'FAIL'}`);
  console.log(`   Custom event NOT re-added? ${!s7.titles.includes('AIML Workshop') && !s7.titles.includes('AIML Workshop (rescheduled)') ? 'PASS' : 'FAIL'}`);
  console.log(`   Defaults restored? ${defaultsBack ? 'PASS' : 'FAIL'}`);
  console.log(`   Semester dates still ADIT (2026-07-06 → 2026-11-15)? ${s7.semDates === '2026-07-06 → 2026-11-15' ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== ADIT DEFAULT CALENDAR AUDIT COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
