import { describe, it, expect } from 'vitest';

describe('Plan Hub Data Utilities', () => {
  it('normalizes subject code to uppercase trim', () => {
    const rawCode = '  2ai501 ';
    const normalized = rawCode.trim().toUpperCase();
    expect(normalized).toBe('2AI501');
  });

  it('filters timetable slots correctly by day of week', () => {
    const slots = [
      { id: '1', start_time: '2026-08-17T09:00:00' }, // Monday (day 1)
      { id: '2', start_time: '2026-08-18T10:00:00' }, // Tuesday (day 2)
      { id: '3', start_time: '2026-08-24T09:00:00' }, // Monday (day 1)
    ];

    const getDayNum = (iso: string) => {
      let d = new Date(iso).getDay();
      return d === 0 ? 7 : d;
    };

    const monSlots = slots.filter(s => getDayNum(s.start_time) === 1);
    expect(monSlots.length).toBe(2);
    expect(monSlots.map(s => s.id)).toEqual(['1', '3']);
  });

  it('validates time order for slot creation (start before end)', () => {
    const isValidSlotTime = (start: string, end: string) => start < end;

    expect(isValidSlotTime('09:00', '10:15')).toBe(true);
    expect(isValidSlotTime('11:00', '10:15')).toBe(false);
    expect(isValidSlotTime('10:00', '10:00')).toBe(false);
  });
});
