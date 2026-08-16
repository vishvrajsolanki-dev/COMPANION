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
  await page.waitForSelector('button[aria-label="Today"]', { timeout: 20_000 });
}

function getHash(page: Page): string {
  const url = new URL(page.url());
  return url.hash || '#today';
}

test.describe('Academic OS — Plan Hub E2E Suite', () => {

  test('1. Deep-linking to #plan/timetable loads Timetable View', async ({ page }) => {
    await page.goto('/#plan/timetable');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/timetable');
    await expect(page.getByTestId('timetable-view')).toBeVisible();
  });

  test('2. Deep-linking to #plan/calendar loads Calendar View', async ({ page }) => {
    await page.goto('/#plan/calendar');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/calendar');
    await expect(page.getByTestId('calendar-view')).toBeVisible();
  });

  test('3. Deep-linking to #plan/subjects loads Subjects View', async ({ page }) => {
    await page.goto('/#plan/subjects');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/subjects');
    await expect(page.getByTestId('subjects-view')).toBeVisible();
  });

  test('4. Deep-linking to #plan/semester loads Semesters View', async ({ page }) => {
    await page.goto('/#plan/semester');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/semester');
    await expect(page.getByTestId('semesters-view')).toBeVisible();
  });

  test('5. Deep-linking to #plan/builder loads Timetable Builder View', async ({ page }) => {
    await page.goto('/#plan/builder');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/builder');
    await expect(page.getByTestId('timetable-builder-view')).toBeVisible();
  });

  test('6. Deep-linking to #plan/import loads Timetable Import View', async ({ page }) => {
    await page.goto('/#plan/import');
    await waitForApp(page);
    expect(getHash(page)).toBe('#plan/import');
    await expect(page.getByTestId('timetable-import-view')).toBeVisible();
  });

  test('7. In-app subview header back buttons navigate cleanly back to Timetable Grid', async ({ page }) => {
    await page.goto('/#plan/timetable');
    await waitForApp(page);
    await expect(page.getByTestId('timetable-view')).toBeVisible();

    // Click Builder button
    await page.click('button:has-text("Builder")');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('timetable-builder-view')).toBeVisible();
    expect(getHash(page)).toBe('#plan/builder');

    // Click Header Go back button
    await page.click('button[aria-label="Go back"]');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('timetable-view')).toBeVisible();
    expect(getHash(page)).toBe('#plan/timetable');
  });

});
