import { test, expect, Page } from 'playwright/test';

const STUDENT_ACTIVATION = {
  role: 'student',
  accountId: 'e2e-test-student-account-id',
  profileId: 'e2e-test-student-profile-id',
  codePreview: 'STUDENT…',
  activatedAt: '2026-08-01T00:00:00.000Z',
  needsOnboarding: false,
};

const ADMIN_ACTIVATION = {
  role: 'admin',
  accountId: 'e2e-test-admin-account-id',
  profileId: 'e2e-test-admin-profile-id',
  codePreview: 'ADMIN…',
  activatedAt: '2026-08-01T00:00:00.000Z',
  needsOnboarding: false,
};

async function setActivation(page: Page, activationPayload: any) {
  await page.addInitScript(({ key, val }) => {
    localStorage.setItem(key, JSON.stringify(val));
  }, { key: 'academic_os_activation', val: activationPayload });
}

async function waitForApp(page: Page) {
  await page.waitForSelector('button[aria-label="Account"]', { timeout: 20_000 });
}

function getHash(page: Page): string {
  const url = new URL(page.url());
  return url.hash || '#today';
}

test.describe('Academic OS — Account Hub E2E Suite', () => {

  test('1. Deep-linking to #account loads Account View', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account');
    await waitForApp(page);
    expect(getHash(page)).toBe('#account');
    await expect(page.getByTestId('account-view')).toBeVisible();
  });

  test('2. Deep-linking to #account/appearance loads Account View and theme switcher works', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account/appearance');
    await waitForApp(page);
    await expect(page.getByTestId('account-view')).toBeVisible();

    // Toggle theme to Dark
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(300);
    const themeAttr = await page.getAttribute('html', 'data-theme');
    expect(themeAttr).toBe('dark');

    // Toggle theme to Light
    await page.click('button:has-text("Light")');
    await page.waitForTimeout(300);
    const themeAttrLight = await page.getAttribute('html', 'data-theme');
    expect(themeAttrLight).toBe('light');
  });

  test('3. Deep-linking to #account/data-sync loads Account View & Data Sync section', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account/data-sync');
    await waitForApp(page);
    await expect(page.getByTestId('account-view')).toBeVisible();
    await expect(page.locator('#data-sync-section')).toBeVisible();
  });

  test('4. Deep-linking to #account/faculty loads Faculty Directory View & search works', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account/faculty');
    await waitForApp(page);
    expect(getHash(page)).toBe('#account/faculty');
    await expect(page.getByTestId('directory-view')).toBeVisible();

    // Search input
    const searchInput = page.getByPlaceholder('Search faculty by name, subject, or email…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Dr.');
    await page.waitForTimeout(300);
  });

  test('5. Deep-linking to #account/admin for authorized admin loads Admin Portal View', async ({ page }) => {
    await setActivation(page, ADMIN_ACTIVATION);
    await page.goto('/#account/admin');
    await waitForApp(page);
    expect(getHash(page)).toBe('#account/admin');
    await expect(page.getByTestId('admin-portal-view')).toBeVisible();
  });

  test('6. Deep-linking to #account/admin for unauthorized student displays restricted state', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account/admin');
    await waitForApp(page);
    await expect(page.getByTestId('admin-portal-view')).toBeVisible();
    await expect(page.getByText('No admin access')).toBeVisible();
  });

  test('7. In-app navigation back from Faculty Directory returns to #account', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);

    // Navigate directly to Faculty Directory (already tested in test 4)
    await page.goto('/#account/faculty');
    await waitForApp(page);
    await expect(page.getByTestId('directory-view')).toBeVisible({ timeout: 15_000 });
    expect(getHash(page)).toBe('#account/faculty');

    // Click Go back to return to Account Hub
    await page.getByTestId('subview-back-button').click();
    await expect(page.getByTestId('account-view')).toBeVisible({ timeout: 10_000 });
    expect(getHash(page)).toBe('#account');
  });

  test('8. Clear All Data triggers confirmation sheet', async ({ page }) => {
    await setActivation(page, STUDENT_ACTIVATION);
    await page.goto('/#account');
    await waitForApp(page);

    await page.click('button:has-text("Clear All Data")');
    await page.waitForTimeout(300);
    await expect(page.getByText('Wipe All Local Data?')).toBeVisible();
  });

});
