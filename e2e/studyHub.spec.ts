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

test.describe('Academic OS — Study Hub E2E Suite', () => {

  test('1. Deep-linking to #study/tasks loads Tasks View', async ({ page }) => {
    await page.goto('/#study/tasks');
    await waitForApp(page);
    expect(getHash(page)).toBe('#study/tasks');
    await expect(page.getByTestId('tasks-view')).toBeVisible();
  });

  test('2. Deep-linking to #study/notes loads Notes View', async ({ page }) => {
    await page.goto('/#study/notes');
    await waitForApp(page);
    expect(getHash(page)).toBe('#study/notes');
    await expect(page.getByTestId('notes-view')).toBeVisible();
  });

  test('3. Deep-linking to #study/exams loads Exams View', async ({ page }) => {
    await page.goto('/#study/exams');
    await waitForApp(page);
    expect(getHash(page)).toBe('#study/exams');
    await expect(page.getByTestId('exams-view')).toBeVisible();
  });

  test('4. Deep-linking to #study/resources loads Resources View', async ({ page }) => {
    await page.goto('/#study/resources');
    await waitForApp(page);
    expect(getHash(page)).toBe('#study/resources');
    await expect(page.getByTestId('resources-view')).toBeVisible();
  });

  test('5. Deep-linking to #study/analytics loads Analytics View', async ({ page }) => {
    await page.goto('/#study/analytics');
    await waitForApp(page);
    expect(getHash(page)).toBe('#study/analytics');
    await expect(page.getByTestId('analytics-view')).toBeVisible();
  });

  test('6. In-app subview navigation and header back button work cleanly', async ({ page }) => {
    await page.goto('/#study/tasks');
    await waitForApp(page);
    await expect(page.getByTestId('tasks-view')).toBeVisible();

    // Click Notes subnav chip
    await page.click('button:has-text("Notes")');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('notes-view')).toBeVisible();
    expect(getHash(page)).toBe('#study/notes');

    // Click Header Go back button
    await page.click('button[aria-label="Go back"]');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('tasks-view')).toBeVisible();
    expect(getHash(page)).toBe('#study/tasks');
  });

});
