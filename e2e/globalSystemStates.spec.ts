import { test, expect, Page } from 'playwright/test';

async function setActivation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('academic_os_activation', JSON.stringify({
      role: 'student',
      accountId: 'e2e-student-id',
      profileId: 'e2e-profile-id',
      codePreview: 'TEST…',
      activatedAt: '2026-08-01T00:00:00.000Z',
      needsOnboarding: false,
    }));
  });
}

test.describe('Academic OS — Milestone 10: Global System States & Fallbacks E2E Suite', () => {

  test('1. 404 Not Found — unknown subview hash renders canonical NotFoundView', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#invalid-unknown-subview-xyz');

    // Should render the NotFoundView
    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await expect(page.getByText('404 — View Not Found')).toBeVisible();
    await expect(page.getByText('Requested view does not exist')).toBeVisible();

    // Click Return to Today button
    await page.getByTestId('not-found-today-btn').click();

    // App should navigate back to Today view
    await page.waitForSelector('button[aria-label="Account"]', { timeout: 15_000 });
    expect(page.url()).toContain('#today');
  });

  test('2. 404 Not Found — Go to Account button navigates to Account view', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#invalid-route-999');

    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await page.getByTestId('not-found-account-btn').click();

    await page.waitForSelector('button[aria-label="Account"]', { timeout: 15_000 });
    expect(page.url()).toContain('#account');
  });

  test('3. 404 Not Found — works in Dark Mode', async ({ page }) => {
    await setActivation(page);
    await page.addInitScript(() => {
      localStorage.setItem('academic_os_theme', 'dark');
    });
    await page.goto('/#non-existent-hash');

    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await expect(page.getByTestId('not-found-view')).toBeVisible();
    await expect(page.getByText('404 — View Not Found')).toBeVisible();
  });

  test('4. 404 Not Found on 360x800 Android viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setActivation(page);
    await page.goto('/#unknown-mobile-hash');

    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await expect(page.getByTestId('not-found-today-btn')).toBeVisible();
  });

  test('5. 404 Not Found on 375x812 iPhone SE viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setActivation(page);
    await page.goto('/#unknown-mobile-hash');

    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await expect(page.getByTestId('not-found-today-btn')).toBeVisible();
  });

  test('6. 404 Not Found on 390x844 iPhone 14 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setActivation(page);
    await page.goto('/#unknown-mobile-hash');

    await page.waitForSelector('[data-testid="not-found-view"]', { timeout: 15_000 });
    await expect(page.getByTestId('not-found-today-btn')).toBeVisible();
  });

  test('7. System Toast stack is present in App Shell', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');
    await page.waitForSelector('button[aria-label="Account"]', { timeout: 15_000 });

    const toastStack = page.locator('div[role="status"][aria-live="polite"]');
    await expect(toastStack).toBeAttached();
  });

  test('8. Navigation regression — all canonical hash routes work cleanly', async ({ page }) => {
    await setActivation(page);

    const routes = [
      '#today',
      '#plan/timetable',
      '#study/tasks',
      '#account',
      '#account/faculty',
      '#account/admin',
    ] as const;

    for (const route of routes) {
      await page.goto(`/${route}`);
      await page.waitForSelector('button[aria-label="Account"]', { timeout: 15_000 });
      // None of the canonical routes should trigger 404
      const notFound = page.locator('[data-testid="not-found-view"]');
      await expect(notFound).not.toBeVisible();
    }
  });

});
