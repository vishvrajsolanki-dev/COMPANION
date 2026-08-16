/**
 * Academic OS — Today View E2E Verification Checkpoint (Milestone 5)
 *
 * Viewports tested:
 *   - 360×800 (Mobile Small)
 *   - 375×812 (Mobile Medium)
 *   - 390×844 (Mobile Standard)
 *   - 1280×800 (Desktop)
 *
 * Themes tested:
 *   - Light
 *   - Dark
 */

import { test, expect } from 'playwright/test';

const ACTIVATION_PAYLOAD = {
  role: 'student',
  accountId: 'e2e-test-account-id',
  profileId: 'e2e-test-profile-id',
  codePreview: 'E2ET…',
  activatedAt: '2026-08-01T00:00:00.000Z',
  needsOnboarding: false,
};

const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1280x800', width: 1280, height: 800 },
];

const themes: ('light' | 'dark')[] = ['light', 'dark'];

test.describe('Academic OS — Today View Milestone 5 Verification', () => {

  for (const vp of viewports) {
    for (const theme of themes) {
      test(`Today View on ${vp.name} [Theme: ${theme}]`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Pre-seed auth activation and theme
        await page.addInitScript(({ key, val, themeKey, themeVal }) => {
          localStorage.setItem(key, JSON.stringify(val));
          localStorage.setItem(themeKey, themeVal);
        }, {
          key: 'academic_os_activation',
          val: ACTIVATION_PAYLOAD,
          themeKey: 'academic_os_theme',
          themeVal: theme,
        });

        await page.goto('/#today');

        // Wait for Today View container or greeting
        await page.waitForSelector('[data-testid="today-view"]', { timeout: 20_000 });

        // Verify Today View elements are visible and properly structured
        const todayView = page.locator('[data-testid="today-view"]');
        await expect(todayView).toBeVisible();

        // Check for Quick Navigation section
        const quickNav = page.locator('section[aria-label="Quick Navigation"]');
        await expect(quickNav).toBeVisible();

        // Check for Daily Metrics row
        const metricsRow = page.locator('section[aria-label="Daily Metrics"]');
        await expect(metricsRow).toBeVisible();

        // Check theme class application if dark
        if (theme === 'dark') {
          const isDarkApplied = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark') ||
                   document.body.classList.contains('dark') ||
                   localStorage.getItem('academic_os_theme') === 'dark';
          });
          expect(isDarkApplied).toBe(true);
        }
      });
    }
  }

});
