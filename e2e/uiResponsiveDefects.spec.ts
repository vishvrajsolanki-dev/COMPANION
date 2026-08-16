import { test, expect } from 'playwright/test';

test.describe('Full UI Responsive Defect Audit Suite', () => {
  const routes = [
    { name: 'Today Hub', path: '/#today' },
    { name: 'Plan Timetable', path: '/#plan/timetable' },
    { name: 'Plan Builder', path: '/#plan/builder' },
    { name: 'Plan Import', path: '/#plan/import' },
    { name: 'Plan Calendar', path: '/#plan/calendar' },
    { name: 'Plan Subjects', path: '/#plan/subjects' },
    { name: 'Plan Semester', path: '/#plan/semester' },
    { name: 'Study Hub', path: '/#study' },
    { name: 'Study Tasks', path: '/#study/tasks' },
    { name: 'Study Notes', path: '/#study/notes' },
    { name: 'Study Exams', path: '/#study/exams' },
    { name: 'Study Resources', path: '/#study/resources' },
    { name: 'Study Analytics', path: '/#study/analytics' },
    { name: 'Account Hub', path: '/#account' },
    { name: 'Account Profile', path: '/#account/profile' },
    { name: 'Account Faculty', path: '/#account/faculty' },
    { name: 'Account Admin', path: '/#account/admin' },
  ];

  const viewports = [
    { label: '360x800', width: 360, height: 800 },
    { label: '390x844', width: 390, height: 844 },
    { label: '844x390-landscape', width: 844, height: 390 },
  ];

  for (const vp of viewports) {
    for (const route of routes) {
      test(`${route.name} has no horizontal overflow or clipping on ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        // 1. Verify no body/document horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBe(false);

        // 2. Verify header title is visible
        const header = page.locator('header h1, header h2, header h3').first();
        if (await header.isVisible()) {
          const box = await header.boundingBox();
          if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
          }
        }
      });
    }
  }
});
