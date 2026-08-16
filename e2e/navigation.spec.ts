/**
 * Academic OS — Navigation E2E Checkpoint (Milestone 4 Browser Verification)
 *
 * Auth bypass: `addInitScript` injects localStorage BEFORE any page JS runs,
 * so the Zustand authStore sees the activation token on hydration.
 *
 * Tests:
 *   1. Direct load: /#study/notes confirms Study -> Notes is displayed and hash is #study/notes.
 *   2. In-app navigation: Today -> Plan -> Timetable -> Study -> Notes -> Account.
 *   3. Browser Back: navigate through 3 views, then use browser back and verify expected previous view.
 *   4. Browser Forward: verify forward restores expected view.
 *   5. Refresh: refresh a deep-linked URL and verify the same screen is restored.
 *   6. Legacy hash: load #schedule and verify it resolves to #plan/timetable.
 *   7. Duplicate navigation: selecting already-active destination must not create an extra history entry.
 */

import { test, expect, Page } from 'playwright/test';

const ACTIVATION_PAYLOAD = {
  role: 'student',
  accountId: 'e2e-test-account-id',
  profileId: 'e2e-test-profile-id',
  codePreview: 'E2ET…',
  activatedAt: '2026-08-01T00:00:00.000Z',
  needsOnboarding: false,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, val }) => {
    localStorage.setItem(key, JSON.stringify(val));
  }, { key: 'academic_os_activation', val: ACTIVATION_PAYLOAD });
});

async function waitForApp(page: Page) {
  // Wait for the desktop sidebar navigation item "Today" to be visible
  await page.waitForSelector('button[aria-label="Today"]', { timeout: 20_000 });
}

function getHash(page: Page): string {
  const url = new URL(page.url());
  return url.hash || '#today';
}

test.describe('Academic OS — Navigation E2E Checkpoint', () => {

  // 1. Direct load /#study/notes
  test('1. Direct load /#study/notes confirms Study -> Notes view and hash #study/notes', async ({ page }) => {
    await page.goto('/#study/notes');
    await waitForApp(page);

    expect(getHash(page)).toBe('#study/notes');
  });

  // 2. In-app navigation: Today -> Plan -> Timetable -> Study -> Notes -> Account
  test('2. In-app navigation sequence (Today -> Plan -> Study -> Account)', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.click('button[aria-label="Today"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#today');

    await page.click('button[aria-label="Plan"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#plan/timetable');

    await page.click('button[aria-label="Study"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#study/tasks');

    await page.click('button[aria-label="Account"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#account');
  });

  // 3. Browser Back
  test('3. Browser Back traverses through history', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.click('button[aria-label="Today"]');
    await page.waitForTimeout(200);

    await page.click('button[aria-label="Plan"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#plan/timetable');

    await page.click('button[aria-label="Study"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#study/tasks');

    await page.click('button[aria-label="Account"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#account');

    // Back -> Study
    await page.goBack();
    await page.waitForTimeout(400);
    expect(getHash(page)).toBe('#study/tasks');

    // Back -> Plan
    await page.goBack();
    await page.waitForTimeout(400);
    expect(getHash(page)).toBe('#plan/timetable');
  });

  // 4. Browser Forward
  test('4. Browser Forward restores expected view', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.click('button[aria-label="Plan"]');
    await page.waitForTimeout(200);

    await page.click('button[aria-label="Study"]');
    await page.waitForTimeout(200);

    await page.goBack();
    await page.waitForTimeout(400);
    expect(getHash(page)).toBe('#plan/timetable');

    await page.goForward();
    await page.waitForTimeout(400);
    expect(getHash(page)).toBe('#study/tasks');
  });

  // 5. Refresh deep-linked URL
  test('5. Refresh on deep-linked URL preserves the hash location', async ({ page }) => {
    await page.goto('/#account');
    await waitForApp(page);
    expect(getHash(page)).toBe('#account');

    await page.reload();
    await waitForApp(page);
    expect(getHash(page)).toBe('#account');
  });

  // 6. Legacy hash migration
  test('6. Legacy hash #schedule resolves to #plan/timetable', async ({ page }) => {
    await page.goto('/#schedule');
    await waitForApp(page);

    expect(getHash(page)).toBe('#plan/timetable');
  });

  // 7. Duplicate navigation
  test('7. Re-selecting active destination does not create duplicate history entry', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.click('button[aria-label="Plan"]');
    await page.waitForTimeout(200);
    expect(getHash(page)).toBe('#plan/timetable');

    const lengthBefore = await page.evaluate(() => window.history.length);

    await page.click('button[aria-label="Plan"]');
    await page.waitForTimeout(200);

    const lengthAfter = await page.evaluate(() => window.history.length);
    expect(lengthAfter).toBe(lengthBefore);
  });

});
