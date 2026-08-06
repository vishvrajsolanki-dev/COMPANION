// Round-trip verification for the AI-Conversion Prompt:
//  1. the "Copy Conversion Prompt" button copies the real prompt (clipboard),
//  2. a timetable description → (simulated) AI JSON following the prompt's rules
//     → validated + committed through the real UI, with real before/after counts.
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';

// Made-up student timetable description (the thing a student would paste into an AI)
const DESCRIPTION = `My Sem 3 timetable:
- Data Structures (DS): lecture Mon 9:00-10:15 in LH-302, Prof. Shah; lab Wed 14:00-15:15 in CL-102
- DBMS: lecture Mon 10:30-11:45 in LH-303, Prof. Patel; tutorial Fri 9:00-9:55 in LH-303
- Operating Systems (OS): lecture Tue 9:00-10:15 in LH-304, Prof. Desai; lab Thu 11:00-12:15 in CL-103
- Engineering Maths 3 (M3): lecture Tue 11:00-12:15 in LH-305, Prof. Joshi; lecture Fri 10:30-11:45 in LH-305
- Computer Networks (CN): lecture Wed 10:30-11:45 in LH-306, Prof. Mehta`;

// The JSON an AI following CONVERSION_PROMPT's exact rules should emit for that
// description (simulated — no live model is available in this environment).
const AI_OUTPUT = {
  subjects: [
    { code: 'DS', name: 'Data Structures', credits: 4 },
    { code: 'DBMS', name: 'Database Management Systems', credits: 4 },
    { code: 'OS', name: 'Operating Systems', credits: 4 },
    { code: 'M3', name: 'Engineering Mathematics 3', credits: 3 },
    { code: 'CN', name: 'Computer Networks', credits: 3 },
  ],
  patterns: [
    { subject_code: 'DS', day_of_week: 1, start_time: '09:00', end_time: '10:15', room_id: 'LH-302', faculty_name: 'Prof. Shah' },
    { subject_code: 'DS', day_of_week: 3, start_time: '14:00', end_time: '15:15', room_id: 'CL-102', faculty_name: 'Prof. Shah' },
    { subject_code: 'DBMS', day_of_week: 1, start_time: '10:30', end_time: '11:45', room_id: 'LH-303', faculty_name: 'Prof. Patel' },
    { subject_code: 'DBMS', day_of_week: 5, start_time: '09:00', end_time: '09:55', room_id: 'LH-303', faculty_name: 'Prof. Patel' },
    { subject_code: 'OS', day_of_week: 2, start_time: '09:00', end_time: '10:15', room_id: 'LH-304', faculty_name: 'Prof. Desai' },
    { subject_code: 'OS', day_of_week: 4, start_time: '11:00', end_time: '12:15', room_id: 'CL-103', faculty_name: 'Prof. Desai' },
    { subject_code: 'M3', day_of_week: 2, start_time: '11:00', end_time: '12:15', room_id: 'LH-305', faculty_name: 'Prof. Joshi' },
    { subject_code: 'M3', day_of_week: 5, start_time: '10:30', end_time: '11:45', room_id: 'LH-305', faculty_name: 'Prof. Joshi' },
    { subject_code: 'CN', day_of_week: 3, start_time: '10:30', end_time: '11:45', room_id: 'LH-306', faculty_name: 'Prof. Mehta' },
  ],
};

// Independent reimplementation of the slot-count date math (same algorithm as
// generateSlotsForPattern) used ONLY to predict how many slots the UI should land.
function expectedSlotCount(dayOfWeek, startDate, endDate) {
  const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
  const start = new Date(startDate);
  const end = new Date(endDate);
  while (start.getDay() !== jsDay) start.setDate(start.getDate() + 1);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) { count++; cur.setDate(cur.getDate() + 7); }
  return count;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });

  const base = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    return { subs: await db.subjects.count(), slots: await db.lectureSlots.count() };
  });
  console.log(`Baseline: subjects=${base.subs} lectureSlots=${base.slots}`);
  const expectedSlots = AI_OUTPUT.patterns.reduce((n, p) => n + expectedSlotCount(p.day_of_week, '2026-07-06', '2026-11-15'), 0);
  console.log(`Independent prediction for AI-output payload: ${AI_OUTPUT.subjects.length} subjects, ${expectedSlots} dated slots`);
  console.log(`Source timetable description being converted:\n${DESCRIPTION.split('\n').map(l => '  | ' + l).join('\n')}`);

  // 1. Button copies the prompt
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Import Timetable JSON' }).click();
  await page.locator('textarea').waitFor({ state: 'visible' });

  const btn = page.getByRole('button', { name: 'Copy Conversion Prompt' });
  await btn.waitFor({ state: 'visible' });
  await btn.click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const checks = {
    'day_of_week encoding documented (1 = Monday)': /1 = Monday/.test(clip),
    'subject_code rule': /subject_code/.test(clip) && /MUST have a matching entry/.test(clip),
    'start_time/end_time HH:MM 24h': /24-hour "HH:MM"/.test(clip),
    'no separate lab subjects rule': /NOT separate subjects/.test(clip) && /Do NOT create a "DS Lab" subject/.test(clip),
    'no color field rule': /Do NOT include a "color" field/.test(clip),
    'confirm-only rule': /Only include real, confirmed classes/.test(clip),
  };
  console.log('\n1. CLIPBOARD after clicking "Copy Conversion Prompt":');
  for (const [k, v] of Object.entries(checks)) console.log(`   ${v ? 'PASS' : 'FAIL'}  ${k}`);
  console.log(`   Button switched to "Copied ✓"? ${await page.getByRole('button', { name: 'Copied ✓' }).count() ? 'PASS' : 'FAIL'}`);

  // 2. Round-trip: paste the AI output JSON into the real import
  await page.locator('textarea').fill(JSON.stringify(AI_OUTPUT, null, 2));
  await page.getByRole('button', { name: 'Validate JSON Payload' }).click();
  await page.waitForTimeout(500);
  const panel = await page.locator('textarea').evaluate(el => el.parentElement.innerText);
  console.log('\n2. PREVIEW TEXT after validating AI-output JSON:');
  panel.split('\n').filter(l => /subjects defined|patterns|slots|unresolvable|2AI999|Validated/.test(l)).forEach(l => console.log('   | ' + l.trim()));

  await page.getByRole('button', { name: 'Commit Import & Generate Slots' }).click();
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const cur = await page.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      const db = m.db;
      return [await db.subjects.count(), await db.lectureSlots.count()].join('|');
    });
    if (cur === prev) stable++; else stable = 0;
    prev = cur;
    if (stable >= 2) break;
  }
  const banner = await page.getByText(/Successfully imported and generated/).last().innerText();
  console.log(`\n   SUCCESS BANNER: "${banner.split('\n')[0]}"`);
  const after = await page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const subs = await db.subjects.toArray();
    return {
      subs: subs.length,
      slots: await db.lectureSlots.count(),
      createdCodes: subs.filter(s => ['DS', 'DBMS', 'OS', 'M3', 'CN'].includes(s.code)).map(s => `${s.code}:${s.color}`),
    };
  });
  console.log(`   subjects ${base.subs} → ${after.subs} (+${after.subs - base.subs})   [expected +${AI_OUTPUT.subjects.length}]`);
  console.log(`   lectureSlots ${base.slots} → ${after.slots} (+${after.slots - base.slots})   [predicted +${expectedSlots}]`);
  console.log(`   slot delta matches prediction? ${after.slots - base.slots === expectedSlots ? 'PASS' : 'FAIL'}`);
  console.log(`   created-subject colors (token hexes): ${after.createdCodes.join(', ')}`);

  await browser.close();
  console.log('\n=== CONVERSION PROMPT ROUND-TRIP COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
