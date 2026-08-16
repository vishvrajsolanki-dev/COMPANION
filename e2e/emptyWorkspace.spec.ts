import { test, expect, Page } from 'playwright/test';

const FRESH_ACTIVATION_PAYLOAD = {
  role: 'student',
  accountId: 'e2e-fresh-workspace-account-id',
  profileId: 'e2e-fresh-workspace-profile-id',
  sessionToken: 'e2e-fresh-session-token-12345',
  codePreview: 'FRESH…',
  activatedAt: new Date().toISOString(),
  needsOnboarding: false,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, val }) => {
    localStorage.setItem(key, JSON.stringify(val));
  }, { key: 'academic_os_activation', val: FRESH_ACTIVATION_PAYLOAD });
});

async function waitForApp(page: Page) {
  await page.waitForSelector('button[aria-label="Today"]', { timeout: 20_000 });
}

test.describe('Fresh Activation — Empty Academic Workspace E2E Regression Suite', () => {

  test('1. Fresh activation renders Today View without hardcoded demo subjects or tasks', async ({ page }) => {
    await page.goto('/#today');
    await waitForApp(page);

    await expect(page.getByTestId('today-view')).toBeVisible();

    // Verify hardcoded demo subjects/tasks from old seeds are NOT visible
    await expect(page.getByText('Machine Learning')).not.toBeVisible();
    await expect(page.getByText('Data Structures & Algorithms')).not.toBeVisible();
    await expect(page.getByText('Complete ML Assignment 2')).not.toBeVisible();
  });

  test('2. Deep-linking to #plan/subjects renders empty subjects workspace', async ({ page }) => {
    await page.goto('/#plan/subjects');
    await waitForApp(page);

    await expect(page.getByTestId('subjects-view')).toBeVisible();
    await expect(page.getByText('Machine Learning')).not.toBeVisible();
    await expect(page.getByText('2AI501')).not.toBeVisible();
  });

  test('3. Deep-linking to #study/tasks renders empty tasks workspace', async ({ page }) => {
    await page.goto('/#study/tasks');
    await waitForApp(page);

    await expect(page.getByTestId('tasks-view')).toBeVisible();
    await expect(page.getByText('Complete ML Assignment 2')).not.toBeVisible();
    await expect(page.getByText('Study AVL Trees')).not.toBeVisible();
  });

  test('4. Deep-linking to #study/notes renders empty notes workspace', async ({ page }) => {
    await page.goto('/#study/notes');
    await waitForApp(page);

    await expect(page.getByTestId('notes-view')).toBeVisible();
    await expect(page.getByText('Linear Regression — Key Concepts')).not.toBeVisible();
    await expect(page.getByText('AVL Tree Rotations')).not.toBeVisible();
  });

});
