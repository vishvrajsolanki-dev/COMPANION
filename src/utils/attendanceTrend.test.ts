import { describe, it, expect } from 'vitest';
import { LectureSlot, AttendanceRecord } from '../db/index';
import {
  computeAttendanceTrend,
  hasTrendData,
  buildTrendPath,
} from './attendanceTrend';

/**
 * Analytics "Attendance Trend History" (Bug H1) — real-data bucketing.
 * Guards the honest-empty-state requirement: a fresh account with zero records
 * must report no trend (never an invented line), and marked records must bucket
 * into ISO weeks with cancelled slots excluded.
 */
describe('computeAttendanceTrend (Bug H1)', () => {
  // Fixed "today" = Monday 2026-08-10 12:00 local, so the last-6-week window is
  // stable and deterministic regardless of when the suite runs.
  const now = new Date(2026, 7, 10, 12, 0, 0); // 2026-08-10

  const slot = (id: string, subject_id: string, start_time: string, status: LectureSlot['status'] = 'scheduled'): LectureSlot => ({
    id,
    subject_id,
    start_time,
    end_time: start_time,
    status,
    is_deleted: false,
  });

  const rec = (id: string, lecture_slot_id: string, status: AttendanceRecord['status']): AttendanceRecord => ({
    id,
    lecture_slot_id,
    status,
    marked_at: '2026-08-10T12:00:00',
    version: 1,
    is_deleted: false,
  });

  it('empty account → hasTrendData false, all buckets zero', () => {
    const trend = computeAttendanceTrend([], [], now);
    expect(hasTrendData(trend)).toBe(false);
    expect(trend.weekStarts).toHaveLength(6);
    expect(trend.overall.every(b => b.effective === 0 && b.attended === 0)).toBe(true);
    expect(trend.bySubject.size).toBe(0);
  });

  it('buckets a present record into the current week and counts it attended', () => {
    // Monday of the current week is the LAST entry in weekStarts.
    const currentMonday = new Date(2026, 7, 10, 0, 0, 0);
    const slots = [slot('s1', 'sub-a', '2026-08-10T09:00:00')];
    const records = [rec('r1', 's1', 'present')];

    const trend = computeAttendanceTrend(slots, records, now);

    expect(hasTrendData(trend)).toBe(true);
    const last = trend.overall[trend.overall.length - 1];
    expect(last.effective).toBe(1);
    expect(last.attended).toBe(1);

    // The bucket date aligns with the real Monday start.
    expect(trend.weekStarts[trend.weekStarts.length - 1].getTime()).toBe(currentMonday.getTime());

    const sub = trend.bySubject.get('sub-a')!;
    expect(sub[sub.length - 1].effective).toBe(1);
  });

  it('absent counts as effective but NOT attended (rate < 100%)', () => {
    const slots = [slot('s1', 'sub-a', '2026-08-10T09:00:00')];
    const records = [rec('r1', 's1', 'absent')];

    const trend = computeAttendanceTrend(slots, records, now);
    const last = trend.overall[trend.overall.length - 1];
    expect(last.effective).toBe(1);
    expect(last.attended).toBe(0);

    // 0% week → path drops to the bottom of the plot area (y=88).
    const d = buildTrendPath(trend.overall, trend.weekStarts)!;
    expect(d).toContain('88.0');
  });

  it('late/medical/onduty all count as attended', () => {
    const slots = ['late', 'medical', 'onduty'].map((st, i) =>
      slot(`s${i}`, 'sub-a', `2026-08-10T0${i + 1}:00:00`),
    );
    const records = slots.map((s, i) =>
      rec(`r${i}`, s.id, ['late', 'medical', 'onduty'][i] as AttendanceRecord['status']),
    );

    const trend = computeAttendanceTrend(slots, records, now);
    const last = trend.overall[trend.overall.length - 1];
    expect(last.effective).toBe(3);
    expect(last.attended).toBe(3);
  });

  it('excludes cancelled slots and soft-deleted rows entirely', () => {
    const slots = [
      slot('s1', 'sub-a', '2026-08-10T09:00:00'),
      slot('s2', 'sub-a', '2026-08-11T09:00:00', 'cancelled'),
      { ...slot('s3', 'sub-a', '2026-08-12T09:00:00'), is_deleted: true },
    ];
    const records = [
      rec('r1', 's1', 'present'),
      rec('r2', 's2', 'absent'),     // cancelled slot → ignored
      rec('r3', 's3', 'present'),    // soft-deleted slot → ignored
      { ...rec('r4', 's1', 'absent'), is_deleted: true }, // soft-deleted record → ignored
    ];

    const trend = computeAttendanceTrend(slots, records, now);
    const last = trend.overall[trend.overall.length - 1];
    expect(last.effective).toBe(1);
    expect(last.attended).toBe(1);
  });

  it('ignores records older than the 6-week window', () => {
    const old = slot('s1', 'sub-a', '2026-05-01T09:00:00'); // ~14 weeks back
    const trend = computeAttendanceTrend([old], [rec('r1', 's1', 'present')], now);
    expect(hasTrendData(trend)).toBe(false);
    expect(trend.bySubject.size).toBe(0);
  });

  it('aggregates multiple subjects into the overall series', () => {
    const slots = [
      slot('s1', 'sub-a', '2026-08-10T09:00:00'),
      slot('s2', 'sub-b', '2026-08-10T10:00:00'),
      slot('s3', 'sub-b', '2026-08-11T09:00:00'),
    ];
    const records = [
      rec('r1', 's1', 'present'),
      rec('r2', 's2', 'absent'),
      rec('r3', 's3', 'present'),
    ];

    const trend = computeAttendanceTrend(slots, records, now);
    const last = trend.overall[trend.overall.length - 1];
    expect(last.effective).toBe(3);
    expect(last.attended).toBe(2); // one absent across the two subjects

    expect(trend.bySubject.get('sub-a')![trend.bySubject.get('sub-a')!.length - 1].effective).toBe(1);
    expect(trend.bySubject.get('sub-b')![trend.bySubject.get('sub-b')!.length - 1].effective).toBe(2);
  });
});

describe('buildTrendPath (Bug H1)', () => {
  const weekStarts = [0, 1, 2, 3, 4, 5].map(i => new Date(2026, 7, 3 + i * 7)); // Mon 8/3 … 9/7

  it('returns null when a series has no data', () => {
    expect(buildTrendPath([{ effective: 0, attended: 0 }], weekStarts)).toBeNull();
  });

  it('builds a path from data weeks', () => {
    const buckets = [
      { effective: 0, attended: 0 },
      { effective: 2, attended: 2 },
      { effective: 1, attended: 1 },
      { effective: 0, attended: 0 },
      { effective: 0, attended: 0 },
      { effective: 4, attended: 3 },
    ];
    const d = buildTrendPath(buckets, weekStarts);
    expect(d).toBeTruthy();
    // Gap weeks break the line: two "M" segments, never a dip to 0%.
    expect((d!.match(/M /g) || []).length).toBe(2);
    expect(d!.startsWith('M ')).toBe(true);
  });

  it('maps 100% to the top of the plot area and 0% to the bottom', () => {
    const all = weekStarts.map(() => ({ effective: 1, attended: 1 }));
    const d = buildTrendPath(all, weekStarts)!;
    expect(d).toContain('12.0'); // top y

    const none = weekStarts.map(() => ({ effective: 1, attended: 0 }));
    const d2 = buildTrendPath(none, weekStarts)!;
    expect(d2).toContain('88.0'); // bottom y
  });
});
