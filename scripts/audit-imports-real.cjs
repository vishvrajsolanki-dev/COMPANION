// REAL end-to-end audit of the two import features.
// Unlike scripts/verify-json-imports.cjs (which REIMPLEMENTED the import logic in
// raw IndexedDB calls), this script drives the ACTUAL React UI — it types into the
// real textarea, clicks the real Validate / Commit buttons, and reads the real DB
// the app writes to. It never writes a row itself.
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';

const TIMETABLE_PAYLOAD = {
  semester_label: 'Semester 5 (Odd 2026)',
  subjects: [
    { code: '2AI507', name: 'Cloud Computing', credits: 3 },
    { code: '2AI508', name: 'Operating Systems', credits: 4 },
    { code: '2AI509', name: 'Computer Organization & Architecture', credits: 3 },
    { code: '2AI510', name: 'Discrete Mathematics', credits: 3 },
    { code: '2AI511', name: 'Technical Communication', credits: 2 },
  ],
  patterns: [
    { subject_code: '2AI507', day_of_week: 1, start_time: '09:00', end_time: '10:15', room_id: 'LH-401', faculty_name: 'Prof. A' },
    { subject_code: '2AI508', day_of_week: 1, start_time: '10:30', end_time: '11:45', room_id: 'LH-402', faculty_name: 'Prof. B' },
    { subject_code: '2AI511', day_of_week: 1, start_time: '14:30', end_time: '15:45', room_id: 'CL-201', faculty_name: 'Prof. C' },
    { subject_code: '2AI509', day_of_week: 2, start_time: '09:00', end_time: '10:15', room_id: 'LH-403', faculty_name: 'Prof. D' },
    { subject_code: '2AI510', day_of_week: 2, start_time: '10:30', end_time: '11:45', room_id: 'LH-404', faculty_name: 'Prof. E' },
    { subject_code: '2AI507', day_of_week: 3, start_time: '09:00', end_time: '10:15', room_id: 'LH-401', faculty_name: 'Prof. A' },
    { subject_code: '2AI508', day_of_week: 3, start_time: '11:00', end_time: '12:15', room_id: 'LH-402', faculty_name: 'Prof. B' },
    { subject_code: '2AI509', day_of_week: 4, start_time: '09:00', end_time: '10:15', room_id: 'LH-403', faculty_name: 'Prof. D' },
    { subject_code: '2AI510', day_of_week: 4, start_time: '13:00', end_time: '14:15', room_id: 'LH-404', faculty_name: 'Prof. E' },
    { subject_code: '2AI508', day_of_week: 5, start_time: '09:00', end_time: '10:15', room_id: 'LH-402', faculty_name: 'Prof. B' },
    { subject_code: '2AI507', day_of_week: 5, start_time: '10:30', end_time: '11:45', room_id: 'LH-401', faculty_name: 'Prof. A' },
    { subject_code: '2AI511', day_of_week: 5, start_time: '14:30', end_time: '15:45', room_id: 'CL-201', faculty_name: 'Prof. C' },
  ],
};

// Same shape, but one pattern references a subject_code that is neither in the
// subjects array nor present in the DB — exercises the `if (!subId) continue;` path.
const TIMETABLE_PAYLOAD_UNKNOWN_CODE = {
  semester_label: 'Semester 5 (Odd 2026)',
  subjects: [
    { code: '2AI512', name: 'Theory of Computation', credits: 3 },
  ],
  patterns: [
    { subject_code: '2AI512', day_of_week: 1, start_time: '09:00', end_time: '10:15' },
    { subject_code: '2AI999', day_of_week: 1, start_time: '10:30', end_time: '11:45' }, // NOT in subjects, NOT in DB
  ],
};

const CALENDAR_PAYLOAD = {
  semester_defaults: {
    label: 'Semester 6 (Even 2027)',
    start_date: '2027-01-04',
    end_date: '2027-05-15',
  },
  events: [
    { title: 'Republic Day Holiday', date: '2027-01-26', type: 'holiday', description: 'National Holiday' },
    { title: 'Midsem Exam Window', date: '2027-03-08', type: 'exam_window', description: 'Midsem Examinations' },
    { title: 'Holi Break', date: '2027-03-22', type: 'holiday' },
    { title: 'Convocation Ceremony', date: '2027-05-10', type: 'college_event' },
  ],
};

// Polls the real DB until the import's async writes have fully landed and settled
// (2 consecutive identical snapshots). DOM text alone is unreliable — the success
// banner can match a previous run's stale text before the commit finishes.
async function waitForDbSettle(page) {
  let prev = null;
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const cur = await page.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      const db = m.db;
      return [await db.subjects.count(), await db.lectureSlots.count(), await db.calendarEvents.count(), await db.semesters.count()].join('|');
    });
    if (cur === prev) stable += 1; else stable = 0;
    prev = cur;
    if (stable >= 2) return;
  }
  throw new Error('DB did not settle');
}

// Reads the real DB the app writes to, via the app's own Dexie singleton.
async function snapshot(page, label) {
  const s = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const subjects = await db.subjects.toArray();
    const slots = await db.lectureSlots.toArray();
    const cal = await db.calendarEvents.toArray();
    const sems = await db.semesters.toArray();
    const activeSems = sems.filter(s => s.is_active && !s.is_deleted).map(s => s.label);
    const liveSlots = slots.filter(s => !s.is_deleted).length;
    return {
      subjects: subjects.length,
      liveSubjects: subjects.filter(s => !s.is_deleted).length,
      slots: slots.length,
      liveSlots,
      cal: cal.length,
      sems: sems.length,
      activeSems,
      subjectColors: subjects.filter(s => !s.is_deleted).map(s => `${s.code}:${s.color}`),
    };
  });
  console.log(`  [${label}] subjects=${s.subjects} (live ${s.liveSubjects})  lectureSlots=${s.slots} (live ${s.liveSlots})  calendarEvents=${s.cal}  semesters=${s.sems}  activeSemesters=[${s.activeSems.join(', ')}]`);
  return s;
}

async function fillAndValidate(page, payload) {
  await page.locator('textarea').fill(JSON.stringify(payload, null, 2));
  await page.getByRole('button', { name: 'Validate JSON Payload' }).click();
  await page.waitForTimeout(400);
  const panel = await page.locator('textarea').evaluate(el => el.parentElement.innerText);
  const hasCommit = await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).count();
  if (!hasCommit) {
    console.log('    !! VALIDATE DID NOT PRODUCE A PREVIEW — panel text:');
    panel.split('\n').filter(l => l.trim()).forEach(l => console.log('      | ' + l.trim()));
    throw new Error('Validate did not produce preview');
  }
  return panel;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(); // fresh profile → clean localStorage → app seeds itself
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(BASE);

  console.log('=== 0. APP BOOT + SEED ===');
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  console.log('  App booted (seeded itself — fresh profile).');
  const base = await snapshot(page, 'BASELINE (after seed)');

  console.log('\n=== 1. TIMETABLE IMPORT — RUN 1 (5 subjects, 12 patterns) ===');
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Timetable JSON' }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });

  const panelText1 = await fillAndValidate(page, TIMETABLE_PAYLOAD);
  console.log('  PANEL TEXT AFTER "Validate JSON Payload" (what the preview actually shows):');
  panelText1.split('\n').filter(l => l.trim()).forEach(l => console.log('    | ' + l.trim()));

  const before1 = await snapshot(page, 'before commit');

  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  await waitForDbSettle(page);
  const successMsg1 = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  SUCCESS MESSAGE (after DB settled): "${successMsg1}"`);
  const after1 = await snapshot(page, 'after commit');
  console.log(`  → subjects ${base.subjects} → ${after1.subjects} (+${after1.subjects - base.subjects})`);
  console.log(`  → lectureSlots ${base.slots} → ${after1.slots} (+${after1.slots - base.slots})`);
  console.log('  → created-subject colors (must be token hexes): ' + after1.subjectColors.filter(c => /2AI5(07|08|09|10|11)/.test(c)).join(' '));

  console.log('\n=== 2. TIMETABLE IMPORT — RUN 2 (identical payload, idempotency check) ===');
  const panelText2 = await fillAndValidate(page, TIMETABLE_PAYLOAD);
  // NOTE: between validate and commit here, what does the success banner show?
  const staleBanner = await page.getByText(/Successfully imported and generated/).count()
    ? await page.getByText(/Successfully imported and generated/).last().innerText()
    : '(no banner)';
  console.log(`  BANNER IMMEDIATELY AFTER RE-VALIDATE (before commit): "${staleBanner}"`);
  const before2 = await snapshot(page, 'before commit (run 2)');
  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  await waitForDbSettle(page);
  const successMsg2 = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  SUCCESS MESSAGE (after DB settled): "${successMsg2}"`);
  const after2 = await snapshot(page, 'after commit (run 2)');
  const idemOk = after2.subjects === after1.subjects && after2.slots === after1.slots;
  console.log(`  IDEMPOTENCY VERDICT: ${idemOk ? 'PASS ✓' : 'FAIL ✗'} (subjects unchanged=${after2.subjects === after1.subjects}, slots unchanged=${after2.slots === after1.slots})`);

  console.log('\n=== 3. SILENT-FAILURE PROBE: pattern with unknown subject_code "2AI999" ===');
  const panelText3 = await fillAndValidate(page, TIMETABLE_PAYLOAD_UNKNOWN_CODE);
  console.log('  PANEL TEXT AFTER VALIDATE (probe payload):');
  panelText3.split('\n').filter(l => /subjects defined|patterns|Validated Payload/.test(l)).forEach(l => console.log('    | ' + l.trim()));
  const before3 = await snapshot(page, 'before commit (unknown-code probe)');
  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  await waitForDbSettle(page);
  const successMsg3 = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  SUCCESS MESSAGE (after DB settled): "${successMsg3}"`);
  const after3 = await snapshot(page, 'after commit (unknown-code probe)');
  // Check whether ANY slot for 2AI999 or 2AI512 exists, and whether a subject 2AI512 was created
  const probe = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const subs = await db.subjects.filter(s => s.code === '2AI512' || s.code === '2AI999').toArray();
    const slots = await db.lectureSlots.toArray();
    const slotFor = code => {
      const sub = subs.find(s => s.code === code);
      return sub ? slots.filter(s => s.subject_id === sub.id && !s.is_deleted).length : -1;
    };
    return { subjectsCreated: subs.map(s => s.code), slotsFor512: slotFor('2AI512'), slotsFor999: slotFor('2AI999') };
  });
  console.log(`  subjects created by probe: [${probe.subjectsCreated.join(', ')}]`);
  console.log(`  lectureSlots generated for 2AI512: ${probe.slotsFor512}`);
  console.log(`  lectureSlots generated for 2AI999 (unknown): ${probe.slotsFor999}  ← 0 = pattern silently dropped`);
  const warned = /warn|unknown|skip|missing|2AI999/i.test(successMsg3);
  console.log(`  Any warning surfaced for the dropped pattern? ${warned ? 'YES' : 'NO — silent'}`);

  console.log('\n=== 4. ACADEMIC CALENDAR IMPORT (semester defaults + 4 events) ===');
  // leave the import subview via its back button
  await page.locator('header button').first().click();
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Academic Calendar JSON' }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });

  await page.locator('textarea').fill(JSON.stringify(CALENDAR_PAYLOAD, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.waitForTimeout(300);
  const calPanel = await page.locator('textarea').evaluate(el => el.parentElement.innerText);
  console.log('  PANEL TEXT AFTER "Validate Calendar Payload":');
  calPanel.split('\n').filter(l => l.trim()).forEach(l => console.log('    | ' + l.trim()));

  const before4 = await snapshot(page, 'before calendar commit');
  await page.getByRole('button', { name: 'Import Academic Calendar Defaults' }).click();
  await waitForDbSettle(page);
  const calSuccess = await page.getByText(/defaults imported successfully/).last().innerText();
  console.log(`  SUCCESS MESSAGE: "${calSuccess}"`);
  const after4 = await snapshot(page, 'after calendar commit');
  console.log(`  → calendarEvents ${before4.cal} → ${after4.cal} (+${after4.cal - before4.cal})`);
  console.log(`  → semesters ${before4.sems} → ${after4.sems} — ACTIVE count now: [${after4.activeSems.join(', ')}]`);

  console.log('\n=== 4b. Does Semester Setup actually show the imported semester as ACTIVE? ===');
  await page.getByRole('button', { name: 'Open Semester Setup to Edit' }).click();
  await page.getByRole('heading', { name: 'Semesters' }).waitFor({ state: 'visible' });
  const semSetupText = await page.evaluate(() => document.body.innerText);
  const hasImported = /Semester 6 \(Even 2027\)/.test(semSetupText);
  const importedIsActive = /Semester 6 \(Even 2027\)[\s\S]*?ACTIVE/.test(semSetupText);
  const hasSeed = /Semester 5 \(Odd 2026\)/.test(semSetupText);
  const seedIsActive = /Semester 5 \(Odd 2026\)[\s\S]*?ACTIVE/.test(semSetupText);
  console.log(`  Imported "Semester 6 (Even 2027)" listed in Semester Setup? ${hasImported ? 'YES' : 'NO'}`);
  console.log(`  Imported semester marked ACTIVE? ${importedIsActive ? 'YES' : 'NO'}`);
  console.log(`  Seed "Semester 5 (Odd 2026)" still listed? ${hasSeed ? 'YES' : 'NO'}`);
  console.log(`  Seed semester still ACTIVE too? ${seedIsActive ? 'YES' : 'NO'}`);
  console.log('  SEMESTER SETUP SCREEN TEXT:');
  semSetupText.split('\n').filter(l => /Semester|ACTIVE|→/.test(l)).forEach(l => console.log('    | ' + l.trim()));

  console.log('\n=== 4c. CALENDAR RE-IMPORT (idempotency check) ===');
  await page.locator('header button').first().click(); // leave Semester Setup
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Academic Calendar JSON' }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });
  await page.locator('textarea').fill(JSON.stringify(CALENDAR_PAYLOAD, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.waitForTimeout(300);
  const before4c = await snapshot(page, 'before calendar re-commit');
  await page.getByRole('button', { name: 'Import Academic Calendar Defaults' }).click();
  await waitForDbSettle(page);
  const after4c = await snapshot(page, 'after calendar re-commit');
  console.log(`  calendarEvents ${before4c.cal} → ${after4c.cal} (+${after4c.cal - before4c.cal}) — non-zero = duplicates created`);
  const dupCheck = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const ev = await db.calendarEvents.filter(e => !e.is_deleted).toArray();
    const byTitle = {};
    ev.forEach(e => { byTitle[e.title] = (byTitle[e.title] || 0) + 1; });
    return byTitle;
  });
  console.log('  calendarEvents by title after re-import: ' + JSON.stringify(dupCheck));

  await browser.close();
  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
