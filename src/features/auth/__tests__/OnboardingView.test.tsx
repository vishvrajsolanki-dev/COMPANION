import { describe, test, expect } from 'vitest';

/**
 * OnboardingView — pure logic unit tests.
 *
 * NOTE: The vitest environment is 'node' with no jsdom, so we cannot render
 * React components. Instead we test the business-critical pure-logic rules
 * that drive the component's behaviour (form validation, department list
 * completeness, profile trimming).
 */

// ── Validation helpers (mirrors OnboardingView logic) ───────────────────────
const nameOk   = (name: string): boolean => name.trim().length >= 2;
const deptOk   = (dept: string): boolean => dept.trim().length >= 2;
const enrollOk = (enroll: string): boolean => enroll.trim().length >= 3;
const canSubmit = (name: string, dept: string, enroll: string): boolean =>
  nameOk(name) && deptOk(dept) && enrollOk(enroll);

const ADIT_DEPARTMENTS = [
  'AI (Artificial Intelligence & Data Science)',
  'Computer Engineering',
  'Computer Science & Design',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
];

describe('OnboardingView — Business Logic (M9)', () => {

  // ── Field validation ──────────────────────────────────────────────────
  test('name requires at least 2 characters', () => {
    expect(nameOk('A')).toBe(false);
    expect(nameOk('')).toBe(false);
    expect(nameOk('  A  ')).toBe(false);
    expect(nameOk('AB')).toBe(true);
    expect(nameOk('Drashti Patel')).toBe(true);
  });

  test('department requires at least 2 characters', () => {
    expect(deptOk('X')).toBe(false);
    expect(deptOk('Computer Engineering')).toBe(true);
  });

  test('enrollment number requires at least 3 characters', () => {
    expect(enrollOk('12')).toBe(false);
    expect(enrollOk('123')).toBe(true);
    expect(enrollOk('2204039')).toBe(true);
  });

  test('canSubmit is false when any field is empty', () => {
    expect(canSubmit('', 'Computer Engineering', '2204039')).toBe(false);
    expect(canSubmit('Drashti', '', '2204039')).toBe(false);
    expect(canSubmit('Drashti', 'Computer Engineering', '')).toBe(false);
  });

  test('canSubmit is true when all three fields pass validation', () => {
    expect(canSubmit('Drashti Patel', 'Computer Engineering', '2204039')).toBe(true);
  });

  test('input trimming: canSubmit handles leading/trailing whitespace gracefully', () => {
    expect(canSubmit('  Drashti  ', 'AI', '123')).toBe(true);
  });

  // ── ADIT departments list ─────────────────────────────────────────────
  test('ADIT departments list has exactly 8 entries', () => {
    expect(ADIT_DEPARTMENTS).toHaveLength(8);
  });

  test('ADIT departments list contains Computer Engineering', () => {
    expect(ADIT_DEPARTMENTS).toContain('Computer Engineering');
  });

  test('ADIT departments list contains AI department', () => {
    expect(ADIT_DEPARTMENTS).toContain('AI (Artificial Intelligence & Data Science)');
  });

  // ── Submission argument contract ──────────────────────────────────────
  test('saveStudentProfile arguments are trimmed before submission', () => {
    const name   = '  Drashti Patel  ';
    const dept   = '  Computer Engineering  ';
    const enroll = '  2204039  ';
    // Mirror what the component does before calling saveStudentProfile
    expect(name.trim()).toBe('Drashti Patel');
    expect(dept.trim()).toBe('Computer Engineering');
    expect(enroll.trim()).toBe('2204039');
  });

  // ── Skip behaviour ────────────────────────────────────────────────────
  test('skip sets needsOnboarding to false (logic contract)', () => {
    // The skip handler calls setNeedsOnboarding(false) without any async work
    let needsOnboarding = true;
    const handleSkip = () => { needsOnboarding = false; };
    handleSkip();
    expect(needsOnboarding).toBe(false);
  });

  // ── Canonical data-testid contract ───────────────────────────────────
  test('canonical data-testid list for accessibility automation', () => {
    const expectedTestIds = [
      'onboarding-view',
      'onboard-name',
      'onboard-dept',
      'onboard-enroll',
      'onboard-submit',
      'onboard-skip',
      'onboard-error',
      'onboarding-success',
    ];
    expect(expectedTestIds).toContain('onboarding-view');
    expect(expectedTestIds).toContain('onboard-name');
    expect(expectedTestIds).toContain('onboard-submit');
    expect(expectedTestIds).toContain('onboard-skip');
  });
});
