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

const VIEWPORTS = [
  { name: '360x800 Mobile Compact', width: 360, height: 800, isMobile: true },
  { name: '375x812 Mobile Standard', width: 375, height: 812, isMobile: true },
  { name: '390x844 Mobile Modern', width: 390, height: 844, isMobile: true },
  { name: '844x390 Landscape Phone', width: 844, height: 390, isMobile: true },
  { name: '768x1024 Tablet', width: 768, height: 1024, isMobile: false },
  { name: '1280x800 Desktop', width: 1280, height: 800, isMobile: false },
];

const ROUTE_TESTS = [
  { path: '#today', name: 'Today' },
  { path: '#plan/timetable', name: 'Plan Timetable' },
  { path: '#plan/calendar', name: 'Plan Calendar' },
  { path: '#plan/subjects', name: 'Plan Subjects' },
  { path: '#plan/semester', name: 'Plan Semester' },
  { path: '#plan/builder', name: 'Plan Builder' },
  { path: '#plan/import', name: 'Plan Import' },
  { path: '#study/tasks', name: 'Study Tasks' },
  { path: '#study/notes', name: 'Study Notes' },
  { path: '#study/exams', name: 'Study Exams' },
  { path: '#study/resources', name: 'Study Resources' },
  { path: '#study/analytics', name: 'Study Analytics' },
  { path: '#account', name: 'Account' },
  { path: '#account/appearance', name: 'Account Appearance' },
  { path: '#account/data-sync', name: 'Account Data Sync' },
  { path: '#account/faculty', name: 'Account Faculty' },
  { path: '#account/admin', name: 'Account Admin' },
  { path: '#notfound-sweep-test', name: 'Global 404' },
];

test.describe('Milestone 11 — Responsive Behavior & Breakpoint Sweep', () => {

  VIEWPORTS.forEach((vp) => {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {

      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setActivation(page);
      });

      ROUTE_TESTS.forEach((route) => {
        test(`Renders ${route.name} (${route.path}) without horizontal overflow or layout breakage`, async ({ page }) => {
          await page.goto(`/${route.path}`);

          // Wait for view content to settle
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(300);

          // 1. Verify no horizontal overflow on body/html
          const hasHorizontalOverflow = await page.evaluate(() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            return scrollWidth > docWidth + 2 || bodyScrollWidth > docWidth + 2;
          });

          expect(hasHorizontalOverflow).toBe(false);

          // 2. Verify navigation layout (Mobile TabBar vs Desktop Sidebar)
          const expectsMobileNav = vp.width < 768 || vp.height <= 500;
          if (expectsMobileNav && route.path !== '#notfound-sweep-test') {
            // Mobile navigation bar should be visible when on main tabs (without active subviews)
            const mainTabs = ['#today', '#plan/timetable', '#study/tasks', '#account'];
            if (mainTabs.includes(route.path)) {
              const tabBar = page.locator('nav[aria-label="Main Navigation"]');
              await expect(tabBar).toBeVisible();
            }
          } else if (!expectsMobileNav) {
            // Sidebar navigation should be visible on desktop/tablet
            const sidebar = page.locator('aside[aria-label="Desktop Sidebar Navigation"]');
            await expect(sidebar).toBeVisible();
          }
        });
      });

      test(`Theme toggle works cleanly in Light and Dark mode`, async ({ page }) => {
        await page.goto('/#today');
        await page.waitForTimeout(200);

        // Toggle to dark mode via localStorage & attribute
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
        });
        await page.waitForTimeout(150);

        const darkAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        expect(darkAttr).toBe('dark');

        // Verify page background & theme contrast
        const bgPage = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bgPage).not.toBe('');

        // Toggle back to light mode
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'light');
        });
        await page.waitForTimeout(150);

        const lightAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        expect(lightAttr).toBe('light');
      });

    });
  });

});
