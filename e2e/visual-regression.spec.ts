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

const MASTER_SCREENS = [
  { name: 'Today', path: '#today' },
  { name: 'Plan-Timetable', path: '#plan/timetable' },
  { name: 'Study-Hub', path: '#study/tasks' },
  { name: 'Tasks', path: '#study/tasks' },
  { name: 'Notes', path: '#study/notes' },
  { name: 'Exams', path: '#study/exams' },
  { name: 'Analytics', path: '#study/analytics' },
  { name: 'Account', path: '#account' },
  { name: '404', path: '#notfound-sweep-test' },
];

const VIEWPORTS = [
  { name: '360x800-mobile-compact', width: 360, height: 800 },
  { name: '390x844-mobile-modern', width: 390, height: 844 },
  { name: '1280x800-desktop', width: 1280, height: 800 },
];

const THEMES = ['light', 'dark'] as const;

test.describe('Milestone 14 — Visual Fidelity & Stitch Reference Sweep', () => {

  VIEWPORTS.forEach((vp) => {
    THEMES.forEach((theme) => {
      MASTER_SCREENS.forEach((screen) => {
        test(`Visual Snapshot — ${screen.name} [${vp.name}] [Theme: ${theme}]`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await setActivation(page);

          await page.goto(`/${screen.path}`);
          await page.waitForLoadState('domcontentloaded');

          // Apply theme explicitly
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
          }, theme);
          await page.waitForTimeout(200);

          // Take screenshot and compare with low diff tolerance
          await expect(page).toHaveScreenshot(`${screen.name}-${vp.name}-${theme}.png`, {
            maxDiffPixelRatio: 0.05,
            animations: 'disabled',
          });
        });
      });
    });
  });

  // Activation screen (unauthenticated state)
  VIEWPORTS.forEach((vp) => {
    THEMES.forEach((theme) => {
      test(`Visual Snapshot — Activation [${vp.name}] [Theme: ${theme}]`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        // Clear activation state for unauthenticated flow
        await page.addInitScript(() => {
          localStorage.removeItem('academic_os_activation');
        });

        await page.goto('/#activation');
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(200);

        await expect(page).toHaveScreenshot(`Activation-${vp.name}-${theme}.png`, {
          maxDiffPixelRatio: 0.05,
          animations: 'disabled',
        });
      });
    });
  });

});
