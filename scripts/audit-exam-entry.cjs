// Real UI-driven audit of the Simple Exam Entry feature:
//  1. Exams & Quizzes opens from the dashboard quick-link with the seeded exams,
//  2. Add Exam round-trips (subject dropdown + datetime) into IndexedDB,
//  3. the new exam appears as a card and opens its details sheet,
//  4. the details sheet shows the entered date,
//  5. Delete Exam soft-deletes it and the card disappears.
const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000/';
const NEW_EXAM_DATE = '2026-09-20T10:00';

async function examState(page) {
  return page.evaluate(async () => {
    const m = await import('/src/db/index.ts');
    const db = m.db;
    const exams = await db.exams.filter(e => !e.is_deleted).toArray();
    return {
      live: exams.length,
      total: await db.exams.count(),
      rows: exams.map(e => ({ subject_id: e.subject_id, type: e.type, date: e.date })),
    };
  });
}

async function settle(page) {
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const cur = await page.evaluate(async () => {
      const m = await import('/src/db/index.ts');
      return String(await m.db.exams.count());
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
  page.on('dialog', d => d.accept()); // auto-accept confirm() for delete

  await page.goto(BASE);
  await page.getByRole('button', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 20000 });
  await settle(page);

  // ── 1. Seeded exams + open view ───────────────────────────────────────────
  console.log('=== SIMPLE EXAM ENTRY AUDIT (fresh seed) ===');
  const base = await examState(page);
  console.log(`1. Seeded exams live=${base.live} total=${base.total}  [expected 3 live]`);
  console.log(`   Seeded rows: ${base.rows.map(r => `${r.subject_id}:${r.type}@${r.date}`).join(' | ')}`);

  console.log('\n2. Open "Exams & Quizzes" from dashboard quick-link');
  await page.getByRole('button', { name: 'Exams & Quizzes' }).click();
  await page.getByRole('button', { name: 'Add Exam' }).waitFor({ state: 'visible' });
  const listText = await page.evaluate(() => document.body.innerText);
  const seededCards = ['Machine Learning', 'Data Structures & Algorithms', 'Database Systems']
    .filter(name => listText.includes(name));
  console.log(`   Seeded exam cards visible? ${seededCards.length === 3 ? 'PASS' : 'FAIL'} (${seededCards.join(', ')})`);
  const cardCount = await page.locator('[data-exam-id]').count();
  console.log(`   Exam card count in DOM: ${cardCount}  ${cardCount === 3 ? 'PASS' : 'FAIL'}`);

  // ── 2. Add an exam (subject dropdown + datetime) ──────────────────────────
  console.log('\n3. Add Exam: ML mid-sem on 2026-09-20 10:00');
  await page.getByRole('button', { name: 'Add Exam' }).click();
  await page.locator('form select').first().waitFor({ state: 'visible' });
  await page.locator('form select').first().selectOption({ label: 'Machine Learning (2AI501)' });
  await page.locator('input[type="datetime-local"]').fill(NEW_EXAM_DATE);
  const chosenType = await page.locator('form select').nth(1).inputValue();
  await page.locator('form button[type="submit"]').click();
  await settle(page);
  const afterAdd = await examState(page);
  const newExam = afterAdd.rows.find(r => r.date === NEW_EXAM_DATE);
  console.log(`   Live exams ${base.live} → ${afterAdd.live} (+${afterAdd.live - base.live})  [expected +1]  ${afterAdd.live === base.live + 1 ? 'PASS' : 'FAIL'}`);
  console.log(`   New exam row: ${JSON.stringify(newExam)}  ${newExam ? 'PASS' : 'FAIL'}`);
  const cardVisible = await page.locator(`[data-exam-date="${NEW_EXAM_DATE}"]`).count();
  console.log(`   New card rendered? ${cardVisible === 1 ? 'PASS' : 'FAIL'}`);

  // ── 3. Open details, verify date shown, then delete ───────────────────────
  console.log('\n4. Open details sheet for the new exam');
  await page.locator(`[data-exam-date="${NEW_EXAM_DATE}"]`).click();
  await page.getByRole('button', { name: 'Delete Exam' }).waitFor({ state: 'visible' });
  const detailText = await page.evaluate(() => document.body.innerText);
  const hasDateLine = /2026.*Sep.*20|Sep.*20.*2026/.test(detailText);
  console.log(`   Details sheet shows the entered date (Sep 20 2026)? ${hasDateLine ? 'PASS' : 'FAIL'}`);
  console.log(`   Delete Exam button present? ${detailText.includes('Delete Exam') ? 'PASS' : 'FAIL'}`);

  console.log('\n5. Delete Exam (soft delete)');
  await page.getByRole('button', { name: 'Delete Exam' }).click();
  await settle(page);
  const afterDel = await examState(page);
  console.log(`   Live exams ${afterAdd.live} → ${afterDel.live} (-${afterAdd.live - afterDel.live})  [expected -1]  ${afterDel.live === afterAdd.live - 1 ? 'PASS' : 'FAIL'}`);
  console.log(`   Total rows unchanged (soft delete)? ${afterDel.total === afterAdd.total ? 'PASS' : 'FAIL'}`);
  const gone = await page.locator(`[data-exam-date="${NEW_EXAM_DATE}"]`).count();
  console.log(`   Card gone from list? ${gone === 0 ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== SIMPLE EXAM ENTRY AUDIT COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
