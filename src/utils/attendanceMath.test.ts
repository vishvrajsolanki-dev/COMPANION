import { describe, it, expect } from 'vitest';
import { calculateSubjectAttendance, calculateOverallAttendance } from './attendanceMath';
import { LectureSlot, AttendanceRecord } from '../db/index';

describe('useAttendanceMath / calculateSubjectAttendance (TASK-102)', () => {
  const subId = 'sub-cs301';

  it('excludes cancelled slots from the denominator completely', () => {
    const slots: LectureSlot[] = [
      { id: 's1', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:15:00', status: 'scheduled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-04T09:00:00', end_time: '2026-08-04T10:15:00', status: 'cancelled', is_deleted: false },
      { id: 's3', subject_id: subId, start_time: '2026-08-05T09:00:00', end_time: '2026-08-05T10:15:00', status: 'scheduled', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r1', lecture_slot_id: 's1', status: 'present', marked_at: '2026-08-03T09:05:00', version: 1, is_deleted: false },
      { id: 'r2', lecture_slot_id: 's2', status: 'absent',  marked_at: '2026-08-04T09:05:00', version: 1, is_deleted: false }, // Should be ignored because s2 is cancelled
      { id: 'r3', lecture_slot_id: 's3', status: 'present', marked_at: '2026-08-05T09:05:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalScheduled).toBe(3);
    expect(res.totalCancelled).toBe(1);
    expect(res.totalEffective).toBe(2); // 2 occurred non-cancelled slots
    expect(res.totalAttended).toBe(2);
    expect(res.percentage).toBe(100);
    expect(res.isAtRisk).toBe(false);
  });

  it('handles rescheduling flow without double-counting (Section B self-audit #3)', () => {
    // 1. Original slot 's1' was scheduled and had a 'present' record 'r1'
    // 2. User reschedules 's1': 's1' becomes status='cancelled'
    // 3. New slot 's2' is created with status='rescheduled' and linked_slot_id='s1', with 'present' record 'r2'
    const slots: LectureSlot[] = [
      { id: 's1', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:15:00', status: 'cancelled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-04T11:00:00', end_time: '2026-08-04T12:15:00', status: 'rescheduled', linked_slot_id: 's1', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r2', lecture_slot_id: 's2', status: 'present', marked_at: '2026-08-04T11:05:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalEffective).toBe(1); // Reflects EXACTLY ONE class occurrence, not 2!
    expect(res.totalAttended).toBe(1);
    expect(res.percentage).toBe(100);
  });

  it('excludes future/unrecorded slots from the denominator (prevents premature deflation)', () => {
    const slots: LectureSlot[] = [
      // 2 past slots with records
      { id: 's1', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:15:00', status: 'scheduled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-04T09:00:00', end_time: '2026-08-04T10:15:00', status: 'scheduled', is_deleted: false },
      // 5 future slots with NO attendance records yet
      { id: 's3', subject_id: subId, start_time: '2026-08-10T09:00:00', end_time: '2026-08-10T10:15:00', status: 'scheduled', is_deleted: false },
      { id: 's4', subject_id: subId, start_time: '2026-08-11T09:00:00', end_time: '2026-08-11T10:15:00', status: 'scheduled', is_deleted: false },
      { id: 's5', subject_id: subId, start_time: '2026-08-12T09:00:00', end_time: '2026-08-12T10:15:00', status: 'scheduled', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r1', lecture_slot_id: 's1', status: 'present', marked_at: '2026-08-03T09:05:00', version: 1, is_deleted: false },
      { id: 'r2', lecture_slot_id: 's2', status: 'present', marked_at: '2026-08-04T09:05:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalScheduled).toBe(5);
    expect(res.totalEffective).toBe(2); // Only the 2 recorded slots count toward denominator!
    expect(res.totalAttended).toBe(2);
    expect(res.percentage).toBe(100);   // Stays 100%, not deflated to 2/5 (40%)!
  });

  it('includes rescheduled and extra slots when attendance records exist', () => {
    const slots: LectureSlot[] = [
      { id: 's1', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:15:00', status: 'scheduled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-05T10:30:00', end_time: '2026-08-05T11:45:00', status: 'rescheduled', is_deleted: false },
      { id: 's3', subject_id: subId, start_time: '2026-08-05T15:30:00', end_time: '2026-08-05T16:45:00', status: 'extra', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r1', lecture_slot_id: 's1', status: 'present', marked_at: '2026-08-03T09:05:00', version: 1, is_deleted: false },
      { id: 'r2', lecture_slot_id: 's2', status: 'late',    marked_at: '2026-08-05T10:35:00', version: 1, is_deleted: false },
      { id: 'r3', lecture_slot_id: 's3', status: 'present', marked_at: '2026-08-05T15:31:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalEffective).toBe(3); // All 3 slots evaluated
    expect(res.presentCount).toBe(2);
    expect(res.lateCount).toBe(1);
    expect(res.totalAttended).toBe(3);
    expect(res.percentage).toBe(100);
  });

  it('correctly calculates 5-state sum (present, late, medical, onduty vs absent)', () => {
    const slots: LectureSlot[] = [
      { id: 's1', subject_id: subId, start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-02T09:00:00', end_time: '2026-08-02T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's3', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's4', subject_id: subId, start_time: '2026-08-04T09:00:00', end_time: '2026-08-04T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's5', subject_id: subId, start_time: '2026-08-05T09:00:00', end_time: '2026-08-05T10:00:00', status: 'scheduled', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r1', lecture_slot_id: 's1', status: 'present', marked_at: '2026-08-01T09:00:00', version: 1, is_deleted: false },
      { id: 'r2', lecture_slot_id: 's2', status: 'late',    marked_at: '2026-08-02T09:00:00', version: 1, is_deleted: false },
      { id: 'r3', lecture_slot_id: 's3', status: 'medical', marked_at: '2026-08-03T09:00:00', version: 1, is_deleted: false },
      { id: 'r4', lecture_slot_id: 's4', status: 'onduty',  marked_at: '2026-08-04T09:00:00', version: 1, is_deleted: false },
      { id: 'r5', lecture_slot_id: 's5', status: 'absent',  marked_at: '2026-08-05T09:00:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalEffective).toBe(5);
    expect(res.totalAttended).toBe(4); // present + late + medical + onduty
    expect(res.absentCount).toBe(1);
    expect(res.percentage).toBe(80.0);  // 4 / 5 = 80.0%
    expect(res.isAtRisk).toBe(false);
    expect(res.safeToSkip).toBe(0);      // 4 / (5+1) = 4/6 = 66.7% < 75%, so 0 safe to skip
  });

  it('triggers isAtRisk and computes classesNeededToRecover when below 75%', () => {
    const slots: LectureSlot[] = [
      { id: 's1', subject_id: subId, start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's2', subject_id: subId, start_time: '2026-08-02T09:00:00', end_time: '2026-08-02T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's3', subject_id: subId, start_time: '2026-08-03T09:00:00', end_time: '2026-08-03T10:00:00', status: 'scheduled', is_deleted: false },
      { id: 's4', subject_id: subId, start_time: '2026-08-04T09:00:00', end_time: '2026-08-04T10:00:00', status: 'scheduled', is_deleted: false },
    ];

    const records: AttendanceRecord[] = [
      { id: 'r1', lecture_slot_id: 's1', status: 'present', marked_at: '2026-08-01T09:00:00', version: 1, is_deleted: false },
      { id: 'r2', lecture_slot_id: 's2', status: 'present', marked_at: '2026-08-02T09:00:00', version: 1, is_deleted: false },
      { id: 'r3', lecture_slot_id: 's3', status: 'absent',  marked_at: '2026-08-03T09:00:00', version: 1, is_deleted: false },
      { id: 'r4', lecture_slot_id: 's4', status: 'absent',  marked_at: '2026-08-04T09:00:00', version: 1, is_deleted: false },
    ];

    const res = calculateSubjectAttendance(subId, slots, records);

    expect(res.totalEffective).toBe(4);
    expect(res.totalAttended).toBe(2);
    expect(res.percentage).toBe(50.0);
    expect(res.isAtRisk).toBe(true);
    expect(res.safeToSkip).toBe(0);
    expect(res.classesNeededToRecover).toBe(4); // (2+4)/(4+4) = 6/8 = 75%
  });

  it('correctly aggregates overall attendance across multiple subjects', () => {
    const res1 = calculateSubjectAttendance('sub-1', [], []);
    const res2 = calculateSubjectAttendance('sub-2', [], []);

    const overall = calculateOverallAttendance([res1, res2]);
    expect(overall.overallPercentage).toBe(100);
    expect(overall.isAnyAtRisk).toBe(false);
    expect(overall.atRiskSubjectIds.length).toBe(0);
  });
});
