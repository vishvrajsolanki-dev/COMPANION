// Real UI-driven audit of the 5 audit fixes (drives the actual React app).
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';

const PAYLOAD = {
  semester_label: 'Semester 5 (Odd 2026)',
  subjects: [
    { code: '2AI507', name: 'Cloud Computing', credits: 3 },
    { code: '2AI508', name: 'Operating Systems', credits: 4 },
    { code: '2AI509', name: 'Computer Organization & Architecture', credits: 3 },
    { code: '2AI510', name: 'Discrete Mathematics', credits: 3 },
    { code: '2AI511', name: 'Technical Communication', credits: 2 },
  ],
  patterns: [
    { subject_code: '2AI507', day_of_week: 1, start_time: '09:00', end_time: '10:15', room_id: 'LH-401' },
    { subject_code: '2AI508', day_of_week: 1, start_time: '10:30', end_time: '11:45', room_id: 'LH-402' },
    { subject_code: '2AI511', day_of_week: 1, start_time: '14:30', end_time: '15:45', room_id: 'CL-201' },
    { subject_code: '2AI509', day_of_week: 2, start_time: '09:00', end_time: '10:15', room_id: 'LH-403' },
    { subject_code: '2AI510', day_of_week: 2, start_time: '10:30', end_time: '11:45', room_id: 'LH-404' },
    { subject_code: '2AI507', day_of_week: 3, start_time: '09:00', end_time: '10:15', room_id: 'LH-401' },
    { subject_code: '2AI508', day_of_week: 3, start_time: '11:00', end_time: '12:15', room_id: 'LH-402' },
    { subject_code: '2AI509', day_of_week: 4, start_time: '09:00', end_time: '10:15', room_id: 'LH-403' },
    { subject_code: '2AI510', day_of_week: 4, start_time: '13:00', end_time: '14:15', room_id: 'LH-404' },
    { subject_code: '2AI508', day_of_week: 5, start_time: '09:00', end_time: '10:15', room_id: 'LH-402' },
    { subject_code: '2AI507', day_of_week: 5, start_time: '10:30', end_time: '11:45', room_id: 'LH-401' },
    { subject_code: '2AI511', day_of_week: 5, start_time: '14:30', end_time: '15:45', room_id: 'CL-201' },
  ],
};
const PROBE_PAYLOAD = {
  semester_label: 'Semester 5 (Odd 2026)',
  subjects: [{ code: '2AI512', name: 'Theory of Computation', credits: 3 }],
  patterns: [
    { subject_code: '2AI512', day_of_week: 1, start_time: '09:00', end_time: '10:15' },
    { subject_code: '2AI999', day_of_week: 1, start_time: '10:30', end_time: '11:45' },
  ],
};
const UPDATE_PAYLOAD = {
  semester_label: 'Semester 5 (Odd 2026)',
  subjects: [{ code: '2AI507', name: 'Cloud Computing (revised)', credits: 5 }],
  patterns: [{ subject_code: '2AI507', day_of_week: 1, start_time: '09:00', end_time: '10:15', room_id: 'LH-401' }],
};
const CAL_PAYLOAD = {
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
      return [await db.subjects.count(), await db.lectureSlots.count(), await db.calendarEvents.count(), await db.semesters.count()].join('|');
    });
    if (cur === prev) stable += 1; else stable = 0;
    prev = cur;
    if (stable >= 2) return;
  }
  throw new Error('DB did not settle');
}

async function snapshot(page, label) {
  const s = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const subs = await db.subjects.toArray();
    const sems = await db.semesters.toArray();
    return {
      subs: subs.length,
      slots: (await db.lectureSlots.toArray()).length,
      cal: (await db.calendarEvents.toArray()).length,
      sems: sems.length,
      active: sems.filter(x => x.is_active && !x.is_deleted).map(x => x.label),
      semsAll: sems.map(x => ({ label: x.label, active: x.is_active, deleted: x.is_deleted })),
      sub507: subs.find(x => x.code === '2AI507'),
    };
  });
  console.log(`  [${label}] subjects=${s.subs} slots=${s.slots} cal=${s.cal} sems=${s.sems} active=[${s.active.join(', ')}]`);
  return s;
}

async function goImport(page, name) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });
}
async function goBack(page) { await page.locator('header button').first().click(); }

async function fillValidate(page, payload) {
  await page.locator('textarea').fill(JSON.stringify(payload, null, 2));
  await page.getByRole('button', { name: 'Validate JSON Payload' }).click();
  await page.waitForTimeout(500);
  const panel = await page.locator('textarea').evaluate(el => el.parentElement.innerText);
  if (await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).count() === 0) {
    console.log('  !! NO PREVIEW — panel:'); panel.split('\n').forEach(l => l.trim() && console.log('    | ' + l.trim()));
    throw new Error('no preview');
  }
  return panel;
}
async function commit(page) {
  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  await settle(page);
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  console.log('=== FIXED APP AUDIT (fresh seed) ===');

  // ── A. Timetable import run1: preview + commit ─────────────────────────
  console.log('\n[A] FIX5 preview + FIX2/3 commit summary, run 1');
  await goImport(page, 'Import Timetable JSON');
  const base = await snapshot(page, 'baseline');
  const panelA = await fillValidate(page, PAYLOAD);
  console.log('  PREVIEW TEXT:'); panelA.split('\n').filter(l => /subjects defined|patterns|slots|2AI999|Validated/.test(l)).forEach(l => console.log('    | ' + l.trim()));
  await commit(page);
  const bannerA = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  BANNER: "${bannerA}"`);
  const afterA = await snapshot(page, 'after run1');
  console.log(`  subjects ${base.subs}→${afterA.subs} (+${afterA.subs - base.subs})  slots ${base.slots}→${afterA.slots} (+${afterA.slots - base.slots})`);

  // ── B. Idempotency run2 + FIX4 banner reset ────────────────────────────
  console.log('\n[B] FIX4 banner reset + idempotency, run 2');
  const panelB = await fillValidate(page, PAYLOAD);
  const bannerBeforeCommit = await page.getByText(/Successfully imported and generated/).count();
  console.log(`  Success banner visible right after re-validate (before commit)? ${bannerBeforeCommit ? 'YES — NOT CLEARED (FAIL)' : 'NO — cleared (PASS)'}`);
  const panelBcounts = panelB.split('\n').filter(l => /subjects defined|patterns|slots/.test(l)).join(' ');
  console.log(`  Preview: ${panelBcounts}`);
  await commit(page);
  const bannerB = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  BANNER: "${bannerB}"`);
  const afterB = await snapshot(page, 'after run2');
  const idem = afterB.subs === afterA.subs && afterB.slots === afterA.slots;
  console.log(`  IDEMPOTENCY: ${idem ? 'PASS' : 'FAIL'} (subjects ${afterA.subs}→${afterB.subs}, slots ${afterA.slots}→${afterB.slots})`);

  // ── C. Silent-failure probe (2AI999) ───────────────────────────────────
  console.log('\n[C] FIX2 unresolvable pattern warning (2AI999)');
  const panelC = await fillValidate(page, PROBE_PAYLOAD);
  const amber = /2AI999/.test(panelC) && /not in this payload/.test(panelC);
  console.log('  PREVIEW WARNING:'); panelC.split('\n').filter(l => /2AI999|pattern|slots|subject/.test(l)).forEach(l => console.log('    | ' + l.trim()));
  await commit(page);
  const bannerC = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  BANNER: "${bannerC}"`);
  const probeRows = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const subs = await db.subjects.filter(s => s.code === '2AI512' || s.code === '2AI999').toArray();
    return Promise.all(subs.map(async s => ({ code: s.code, slots: await db.lectureSlots.where('subject_id').equals(s.id).count() })));
  });
  console.log(`  DB rows from probe: ${JSON.stringify(probeRows)}`);
  const skipped = /Skipped 1 pattern/.test(bannerC) && /2AI999/.test(bannerC);
  console.log(`  Skip surfaced in banner? ${skipped ? 'PASS' : 'FAIL'}`);

  // ── D. Existing-subject update (2AI507) ─────────────────────────────────
  console.log('\n[D] FIX3 existing-subject update (2AI507 metadata refresh)');
  const panelD = await fillValidate(page, UPDATE_PAYLOAD);
  console.log('  PREVIEW (should say 0 new subjects for 2AI507 since it exists):'); panelD.split('\n').filter(l => /subjects defined|patterns|slots|new/.test(l)).forEach(l => console.log('    | ' + l.trim()));
  await commit(page);
  const bannerD = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`  BANNER: "${bannerD}"`);
  const nameAfter = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const s = await db.subjects.filter(x => x.code === '2AI507').first();
    return s ? { name: s.name, credits: s.credits } : null;
  });
  console.log(`  2AI507 in DB after update: ${JSON.stringify(nameAfter)}`);
  console.log(`  Name updated to "Cloud Computing (revised)"? ${nameAfter && nameAfter.name === 'Cloud Computing (revised)' ? 'PASS' : 'FAIL'}`);

  // ── E. Calendar import: single active + dedup ───────────────────────────
  console.log('\n[E] FIX1 calendar import: single active semester + event dedup');
  await goBack(page);
  await goImport(page, 'Import Academic Calendar JSON');
  await page.locator('textarea').fill(JSON.stringify(CAL_PAYLOAD, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.waitForTimeout(300);
  const beforeE = await snapshot(page, 'before calendar commit');
  await page.getByRole('button', { name: 'Import Academic Calendar Defaults' }).click();
  await settle(page);
  const bannerE = await page.getByText(/defaults imported successfully/).last().innerText();
  console.log(`  BANNER: "${bannerE}"`);
  const afterE = await snapshot(page, 'after calendar commit');
  console.log(`  calendarEvents ${beforeE.cal}→${afterE.cal} (+${afterE.cal - beforeE.cal})`);
  console.log(`  Active semesters: [${afterE.active.join(', ')}] — exactly one? ${afterE.active.length === 1 && afterE.active[0] === 'Semester 6 (Even 2027)' ? 'PASS' : 'FAIL'}`);
  console.log('  All semesters:'); afterE.semsAll.forEach(s => console.log(`    - ${s.label}  active=${s.active}  deleted=${s.deleted}`));

  console.log('\n[F] FIX1b calendar RE-IMPORT: event dedup + no semester duplication');
  await page.locator('textarea').fill(JSON.stringify(CAL_PAYLOAD, null, 2));
  await page.getByRole('button', { name: 'Validate Calendar Payload' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Import Academic Calendar Defaults' }).click();
  await settle(page);
  const bannerF = await page.getByText(/defaults imported successfully/).last().innerText();
  console.log(`  BANNER: "${bannerF}"`);
  const afterF = await snapshot(page, 'after calendar re-import');
  console.log(`  calendarEvents ${afterE.cal}→${afterF.cal} — stayed same? ${afterF.cal === afterE.cal ? 'PASS (deduped)' : 'FAIL (duplicated)'}`);
  console.log(`  Active semesters: [${afterF.active.join(', ')}] — single? ${afterF.active.length === 1 ? 'PASS' : 'FAIL'}`);

  // Semester Setup rendering check (wait for list to populate this time)
  console.log('\n[G] Semester Setup pre-fill trace (rendered)');
  await page.getByRole('button', { name: 'Open Semester Setup to Edit' }).click();
  await page.getByText('Semester 6 (Even 2027)').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  const setupText = await page.evaluate(() => document.body.innerText);
  const lines = setupText.split('\n').filter(l => /Semester|ACTIVE|→/.test(l));
  console.log('  SEMESTER SETUP:'); lines.forEach(l => console.log('    | ' + l.trim()));
  const sem6Active = /Semester 6 \(Even 2027\)/.test(setupText) && /Semester 6 \(Even 2027\)[\s\S]*ACTIVE/.test(setupText);
  const sem5NotActive = /Semester 5 \(Odd 2026\)/.test(setupText) && !/Semester 5 \(Odd 2026\)[\s\S]*ACTIVE/.test(setupText);
  console.log(`  Sem6 shown+ACTIVE: ${sem6Active ? 'PASS' : 'FAIL'}   Sem5 shown+not active: ${sem5NotActive ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== FIX AUDIT COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
