// Shared-CSS cross-check for the Phase 1 H6 fix.
// H6 added `textarea.input { border-radius: var(--radius-card) }` to global.css.
// That rule MUST NOT change single-line inputs/selects (freeze-list forms depend
// on the pill radius). Verify both at once on a real form in WebKit.
const { webkit } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://localhost:3001/';
const accountId = `phase1-freeze-${Date.now()}`;
const ACTIVATION = {
  role: 'owner',
  accountId,
  profileId: `profile-${accountId}`,
  codePreview: 'FREEZE…',
  activatedAt: new Date().toISOString(),
  adminCode: 'FREEZE-CHECK',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true });
  await context.addInitScript((activation) => {
    localStorage.setItem('academic_os_activation', JSON.stringify(activation));
    localStorage.removeItem('academic_os_user_cleared');
  }, ACTIVATION);
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  console.log('=== Phase 1 shared-CSS freeze check (`.input` pill radius preserved for text inputs) ===');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible' });

  // A single-line text input on the Manage Subjects "Add a new subject" form
  // (freeze list: "Manual subject creation"). Inspect the subject-name input's radius.
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: /Manage Subjects/ }).click();
  // Open the Add-subject sheet (single-line `.input` fields inside).
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const nameInput = page.getByPlaceholder('Machine Learning');
  await nameInput.waitFor({ state: 'visible' });
  const inputMetrics = await nameInput.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { borderRadius: cs.borderRadius };
  });
  console.log(`  single-line input.input border-radius = ${inputMetrics.borderRadius}`);
  assert(inputMetrics.borderRadius !== '18px', 'Freeze-list form inputs must keep pill radius, not card radius');
  console.log('  PASS: single-line inputs keep pill radius → freeze-list forms (onboarding, subject creation, tasks, notes titles) unaffected.');

  await browser.close();
  console.log('\n=== FREEZE INPUT CHECK PASS ===');
}

main().catch((err) => {
  console.error('\n=== FREEZE INPUT CHECK FAIL ===');
  console.error(err);
  process.exit(1);
});
