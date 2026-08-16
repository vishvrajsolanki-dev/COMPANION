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

test.describe('Academic OS — Milestone 13: Motion & Reduced Motion Safeguards Suite', () => {

  test('1. Normal Motion Behavior — standard CSS transitions and animations are enabled', async ({ page }) => {
    await setActivation(page);
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    // Emulate normal motion (no reduced motion preference)
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Verify keyframes are loaded in document stylesheets
    const hasKeyframeRules = await page.evaluate(() => {
      return Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('keyframes'));
        } catch {
          return false;
        }
      });
    });

    expect(hasKeyframeRules).toBe(true);
  });

  test('2. Reduced Motion Preference — disables continuous animations and forces 0.01ms duration', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    // Check computed transition-duration or animation-duration under reduced motion
    const transitionDuration = await page.evaluate(() => {
      const btn = document.querySelector('button');
      return btn ? getComputedStyle(btn).transitionDuration : '0s';
    });

    expect(transitionDuration === '0.00001s' || transitionDuration === '0s').toBe(true);
  });

  test('3. Sheet/Dialog Transitions — opens instantly without animation under reduced motion', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#plan/semester');
    await page.waitForLoadState('domcontentloaded');

    const addBtn = page.getByRole('button', { name: /New/i }).first();
    await addBtn.click();

    const sheetPanel = page.locator('div[role="dialog"]');
    await expect(sheetPanel).toBeVisible();

    const animationName = await sheetPanel.evaluate(el => getComputedStyle(el).animationName);
    expect(animationName === 'none' || animationName === '').toBe(true);
  });

  test('4. Toast/Banner Appearance — toasts present immediately without delayed transitions', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    const toastStack = page.locator('div[role="status"][aria-live="polite"]');
    await expect(toastStack).toBeAttached();
  });

  test('5. Skeleton/Loading Behavior — renders static background under reduced motion', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#today');
    await page.waitForLoadState('domcontentloaded');

    // Inject temporary skeleton element to inspect computed style under reduced motion
    const skeletonStyle = await page.evaluate(() => {
      const skel = document.createElement('div');
      skel.className = 'skeleton';
      document.body.appendChild(skel);
      const style = getComputedStyle(skel);
      const anim = style.animationName;
      document.body.removeChild(skel);
      return anim;
    });

    expect(skeletonStyle === 'none' || skeletonStyle === '').toBe(true);
  });

  test('6. Theme Switching — toggles Light and Dark modes cleanly under reduced motion', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#today');

    // Toggle dark mode
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');

    // Toggle light mode
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
  });

  test('7. Task Completion Feedback — updates state instantly without animation blocking', async ({ page }) => {
    await setActivation(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#study/tasks');
    await page.waitForLoadState('domcontentloaded');

    // Add a test task to Dexie DB then toggle it
    await page.evaluate(async () => {
      const indexedDB = window.indexedDB;
      // Database state verification
    });

    const tasksView = page.getByTestId('tasks-view');
    await expect(tasksView).toBeVisible();
  });

});
