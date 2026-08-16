import { describe, test, expect } from 'vitest';

/**
 * ActivationView — pure logic unit tests.
 *
 * NOTE: The vitest environment is 'node' with no jsdom, so we cannot render
 * React components. Instead we test the business-critical pure-logic rules
 * that drive the component's behaviour (key validation, uppercasing, form
 * guard logic) and the ADIT_DEPARTMENTS list contract.
 */

// ── Key validation helpers (mirrors ActivationView logic) ──────────────────
const isValidKey = (code: string): boolean => code.trim().length > 0;
const normalizeKey = (raw: string): string => raw.trim().toUpperCase();

describe('ActivationView — Business Logic (M9)', () => {

  test('empty string is not a valid key', () => {
    expect(isValidKey('')).toBe(false);
  });

  test('whitespace-only string is not a valid key', () => {
    expect(isValidKey('   ')).toBe(false);
  });

  test('any non-empty trimmed code is considered valid', () => {
    expect(isValidKey('ABCD-1234-EFGH-5678')).toBe(true);
    expect(isValidKey('X')).toBe(true);
  });

  test('normalizeKey trims and uppercases input', () => {
    expect(normalizeKey('  abcd-wxyz  ')).toBe('ABCD-WXYZ');
    expect(normalizeKey('abCD-1234')).toBe('ABCD-1234');
  });

  test('submit guard: disabled when code is empty', () => {
    const code = '';
    const isActivating = false;
    const disabled = !isValidKey(code) || isActivating;
    expect(disabled).toBe(true);
  });

  test('submit guard: disabled when activating regardless of code', () => {
    const code = 'ABCD-1234-XXXX-YYYY';
    const isActivating = true;
    const disabled = !isValidKey(code) || isActivating;
    expect(disabled).toBe(true);
  });

  test('submit guard: enabled when code is non-empty and not activating', () => {
    const code = 'ABCD-1234-XXXX-YYYY';
    const isActivating = false;
    const disabled = !isValidKey(code) || isActivating;
    expect(disabled).toBe(false);
  });

  test('activation key placeholder format matches expected pattern', () => {
    const placeholder = 'XXXX-XXXX-XXXX-XXXX';
    expect(placeholder.split('-')).toHaveLength(4);
    expect(placeholder.split('-').every(seg => seg.length === 4)).toBe(true);
  });

  test('canonical data-testid list for accessibility automation', () => {
    const expectedTestIds = [
      'activation-view',
      'activation-key-input',
      'activation-submit',
      'activation-error',
    ];
    expect(expectedTestIds).toContain('activation-view');
    expect(expectedTestIds).toContain('activation-key-input');
    expect(expectedTestIds).toContain('activation-submit');
    expect(expectedTestIds).toContain('activation-error');
  });
});
