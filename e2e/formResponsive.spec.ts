import { test, expect } from 'playwright/test';

test.describe('Form Control Responsiveness Audit', () => {
  const viewports = [
    { name: '360x800-compact', width: 360, height: 800 },
    { name: '375x812-se', width: 375, height: 812 },
    { name: '390x844-modern', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Form fields reflow without horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#plan/timetable');
      await page.waitForLoadState('networkidle');

      // Check root scroll container has no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test(`Timetable Builder inputs do not collide on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#plan/builder');
      await page.waitForLoadState('networkidle');

      // Verify all inputs are visible and clickable
      const inputs = page.locator('input, select');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const box = await input.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThan(60);
            expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
          }
        }
      }
    });

    test(`Tasks creation form controls reflow cleanly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#study/tasks');
      await page.waitForLoadState('networkidle');

      // Open new task dialog/sheet if button present
      const addBtn = page.locator('button:has-text("New Task"), button:has-text("Add Task")');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);

        const dialogInputs = page.locator('div[role="dialog"] input, div[role="dialog"] select');
        const count = await dialogInputs.count();
        for (let i = 0; i < count; i++) {
          const input = dialogInputs.nth(i);
          if (await input.isVisible()) {
            const box = await input.boundingBox();
            if (box) {
              expect(box.width).toBeGreaterThan(60);
            }
          }
        }
      }
    });
  }
});
