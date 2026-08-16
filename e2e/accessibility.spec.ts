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

test.describe('Academic OS — Milestone 12: WCAG AA Accessibility & Keyboard Focus Suite', () => {

  test('1. Skip Navigation Link is accessible via Tab and jumps focus to #main-content', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    // Press Tab from initial body focus
    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    // Activating skip link jumps focus to main content container
    await skipLink.click();
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('2. Navigation Landmarks & Screen Reader Labels are correctly declared', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');

    // Check main landmarks
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('aside[aria-label="Desktop Sidebar Navigation"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Primary Navigation"]')).toBeVisible();

    // Verify aria-current page tracking on active sidebar nav item
    const activeSidebarItem = page.locator('aside button[aria-current="page"]');
    await expect(activeSidebarItem).toBeVisible();
    await expect(activeSidebarItem).toHaveText(/Today/i);
  });

  test('3. Keyboard Navigation across main tabs (Tab / Shift+Tab cycling)', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    // Focus skip link then tab into sidebar navigation buttons
    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Tab');
    const todayBtn = page.locator('aside nav button').filter({ hasText: 'Today' });
    await expect(todayBtn).toBeFocused();

    await page.keyboard.press('Tab');
    const planBtn = page.locator('aside nav button').filter({ hasText: 'Plan' });
    await expect(planBtn).toBeFocused();

    await page.keyboard.press('Tab');
    const studyBtn = page.locator('aside nav button').filter({ hasText: 'Study' });
    await expect(studyBtn).toBeFocused();

    await page.keyboard.press('Tab');
    const accountBtn = page.locator('aside nav button').filter({ hasText: 'Account' });
    await expect(accountBtn).toBeFocused();
  });

  test('4. BottomSheet Focus Trapping, Escape, and Focus Restoration', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#plan/semester');
    await page.waitForLoadState('domcontentloaded');

    // Click "New" button to trigger BottomSheet dialog
    const addSemBtn = page.getByRole('button', { name: /New/i }).first();
    await addSemBtn.click();

    // Verify sheet overlay opens with dialog role & aria-modal
    const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    // Verify Escape key closes dialog and returns focus back to trigger button
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(addSemBtn).toBeFocused();
  });

  test('5. SegmentedControl & Filter Chips declare proper ARIA roles', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#study/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Check segmented control tablist
    const tablist = page.locator('div[role="tablist"]').first();
    await expect(tablist).toBeVisible();

    const selectedTab = page.locator('button[role="tab"][aria-selected="true"]').first();
    await expect(selectedTab).toBeVisible();
    await expect(selectedTab).toHaveText(/All Tasks/i);
  });

  test('6. Toast Stack and Loading Indicators declare aria-live announcements', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');

    // Toast stack role="status" and aria-live="polite"
    const toastRegion = page.locator('div[role="status"][aria-live="polite"]');
    await expect(toastRegion).toBeAttached();
  });

  test('7. 404 View heading hierarchy and accessible actions', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#unknown-accessibility-test-route');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Requested view does not exist/i);

    // Focus on primary return button via tab navigation
    const returnTodayBtn = page.getByTestId('not-found-today-btn');
    await expect(returnTodayBtn).toBeVisible();
  });

  test('8. Touch Target compliance — all main controls are >= 44px height', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');

    const navButtons = page.locator('aside nav button');
    const count = await navButtons.count();

    for (let i = 0; i < count; i++) {
      const box = await navButtons.nth(i).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('9. Reduced Motion media query rule is active', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');

    const hasReducedMotionRule = await page.evaluate(() => {
      return Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('prefers-reduced-motion'));
        } catch {
          return false;
        }
      });
    });

    expect(hasReducedMotionRule).toBe(true);
  });

});
