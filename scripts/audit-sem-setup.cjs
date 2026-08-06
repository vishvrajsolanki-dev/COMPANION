// Focused follow-up for "does Semester Setup pre-fill from imported calendar data?"
// The main audit read the Semester Setup screen too early (live query hadn't rendered).
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';

const CALENDAR_PAYLOAD = {
  semester_defaults: { label: 'Semester 6 (Even 2027)', start_date: '2027-01-04', end_date: '2027-05-15' },
  events: [
    { title: 'Republic Day Holiday', date: '2027-01-26', type: 'holiday', description: 'National Holiday' },
    { title: 'Midsem Exam Window', date: '2027-03-08', type: 'exam_window' },
    { title: 'Holi Break', date: '2027-03-22', type: 'holiday' },
    { title: 'Convocation Ceremony', date: '2027-05-10', type: 'college_event' },
  ],
};

async function settle(page) {
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const cur = await page.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      const db = m.db;
      return [await db.calendarEvents.count(), await db.semesters.count()].join('|');
    });
    if (cur === prev) stable += 1; else stable = 0;
    prev = cur;
    if (stable >= 2) return;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(BASE);

  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  console.log('1. App booted (seeded).');

  // Import the calendar payload through the real UI
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Academic Calendar JSON' }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });
  await page.locator('textarea').fill(JSON.stringify(CALENDAR_PAYLOAD, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Import Academic Calendar Defaults' }).click();
  await settle(page);

  const sems = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const all = await db.semesters.toArray();
    return all.map(s => ({ label: s.label, is_active: s.is_active, is_deleted: s.is_deleted, id: s.id }));
  });
  console.log('2. Semesters in DB after calendar import:');
  sems.forEach(s => console.log(`   - ${s.label}  id=${s.id}  is_active=${s.is_active}  is_deleted=${s.is_deleted}`));

  // Open Semester Setup and WAIT for the list to actually render
  console.log('3. Opening Semester Setup…');
  await page.getByRole('button', { name: 'Open Semester Setup to Edit' }).click();
  await page.getByText('Semester 6 (Even 2027)').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(400);
  const body = await page.evaluate(() => document.body.innerText);
  console.log('   SEMESTER SETUP SCREEN (rendered):');
  body.split('\n').filter(l => /Semester|ACTIVE|→/.test(l)).forEach(l => console.log('    | ' + l.trim()));

  // Now go back to Profile and read what the app reports as THE active semester
  console.log('4. What does the app report as the active semester on Profile?');
  await page.locator('header button').first().click(); // back from Semester Setup
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Semesters & Dates' }).waitFor({ state: 'visible' });
  const profileRow = await page.getByRole('button', { name: 'Semesters & Dates' }).innerText();
  console.log('   Profile "Semesters & Dates" row:');
  profileRow.split('\n').filter(l => l.trim()).forEach(l => console.log('    | ' + l.trim()));

  // Also check what the Schedule tab header thinks (WeeklyGrid active semester)
  await page.getByRole('button', { name: 'Schedule' }).click();
  await page.waitForTimeout(500);
  const scheduleText = await page.evaluate(() => document.body.innerText);
  const scheduleSem = (scheduleText.match(/Semester [0-9]+ \([^)]*\)/) || [])[0] || '(no semester label found)';
  console.log(`5. Schedule tab shows semester label: "${scheduleSem}"`);

  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
