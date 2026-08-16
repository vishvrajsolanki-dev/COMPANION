import { describe, test, expect } from 'vitest';
import { isToday, nowMinutes, timePart, datePart, formatHeaderDate } from '../../../utils/date';


describe('Today View — Data & Date Utilities', () => {
  test('formatHeaderDate formats correctly', () => {
    const d = new Date('2026-08-15T10:30:00');
    const formatted = formatHeaderDate(d);
    expect(formatted).toContain('Aug');
    expect(formatted).toContain('15');
  });

  test('isToday returns true for matching ISO string', () => {
    const now = new Date();
    // Build date using LOCAL year/month/day so this passes in any timezone.
    const y  = now.getFullYear();
    const m  = String(now.getMonth() + 1).padStart(2, '0');
    const d  = String(now.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}T09:00:00`;
    expect(isToday(iso, now)).toBe(true);
  });

  test('timePart extracts HH:MM cleanly', () => {
    expect(timePart('2026-08-15T14:30:00')).toBe('14:30');
    expect(timePart('2026-08-15T09:05:00')).toBe('09:05');
  });

  test('datePart extracts YYYY-MM-DD cleanly', () => {
    expect(datePart('2026-08-15T14:30:00')).toBe('2026-08-15');
  });

  test('nowMinutes returns HH:MM string format', () => {
    const mins = nowMinutes();
    expect(typeof mins).toBe('string');
    expect(mins).toMatch(/^\d{2}:\d{2}$/);
  });
});
