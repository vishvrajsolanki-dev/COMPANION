import { LectureSlot, AttendanceRecord } from '../db/index';

export interface SubjectAttendanceResult {
  subjectId: string;
  totalScheduled: number;
  totalCancelled: number;
  totalEffective: number; // Evaluated slots that actually have attendance records (excluding cancelled)
  presentCount: number;
  lateCount: number;
  medicalCount: number;
  ondutyCount: number;
  absentCount: number;
  totalAttended: number;  // Present + Late + Medical + OnDuty
  percentage: number;     // 0 to 100
  isAtRisk: boolean;      // percentage < 75%
  safeToSkip: number;     // number of future missed classes allowed without dropping below 75%
  classesNeededToRecover: number; // if at risk, classes needed to reach >= 75%
}

export function calculateSubjectAttendance(
  subjectId: string,
  subjectSlots: LectureSlot[],
  records: AttendanceRecord[]
): SubjectAttendanceResult {
  // Map of slot ID -> slot for this subject
  const slotMap = new Map<string, LectureSlot>();
  let totalScheduled = 0;
  let totalCancelled = 0;

  for (const slot of subjectSlots) {
    if (slot.subject_id === subjectId && !slot.is_deleted) {
      slotMap.set(slot.id, slot);
      totalScheduled++;
      if (slot.status === 'cancelled') {
        totalCancelled++;
      }
    }
  }

  let presentCount = 0;
  let lateCount = 0;
  let medicalCount = 0;
  let ondutyCount = 0;
  let absentCount = 0;
  let totalEffective = 0;

  // Process attendance records for non-cancelled slots
  for (const record of records) {
    if (record.is_deleted) continue;
    const slot = slotMap.get(record.lecture_slot_id);
    if (!slot) continue;

    // Cancelled slots are strictly excluded from denominator & numerator
    if (slot.status === 'cancelled') continue;

    // This slot has actually occurred and been recorded
    totalEffective++;

    switch (record.status) {
      case 'present':
        presentCount++;
        break;
      case 'late':
        lateCount++;
        break;
      case 'medical':
        medicalCount++;
        break;
      case 'onduty':
        ondutyCount++;
        break;
      case 'absent':
        absentCount++;
        break;
    }
  }

  const totalAttended = presentCount + lateCount + medicalCount + ondutyCount;

  // Percentage calculation based on occurred/evaluated slots with records
  const percentage = totalEffective > 0
    ? Math.round((totalAttended / totalEffective) * 1000) / 10
    : 100.0;

  const isAtRisk = totalEffective > 0 && percentage < 75.0;

  let safeToSkip = 0;
  let classesNeededToRecover = 0;

  if (totalEffective > 0) {
    if (!isAtRisk) {
      // (totalAttended) / (totalEffective + S) >= 0.75 => S <= (4*totalAttended - 3*totalEffective) / 3
      const s = Math.floor((4 * totalAttended - 3 * totalEffective) / 3);
      safeToSkip = Math.max(0, s);
    } else {
      // (totalAttended + R) / (totalEffective + R) >= 0.75 => R >= 3*totalEffective - 4*totalAttended
      const r = Math.ceil(3 * totalEffective - 4 * totalAttended);
      classesNeededToRecover = Math.max(0, r);
    }
  }

  return {
    subjectId,
    totalScheduled,
    totalCancelled,
    totalEffective,
    presentCount,
    lateCount,
    medicalCount,
    ondutyCount,
    absentCount,
    totalAttended,
    percentage,
    isAtRisk,
    safeToSkip,
    classesNeededToRecover,
  };
}

export function calculateOverallAttendance(subjectResults: SubjectAttendanceResult[]): {
  overallPercentage: number;
  isAnyAtRisk: boolean;
  atRiskSubjectIds: string[];
} {
  if (subjectResults.length === 0) {
    return { overallPercentage: 100, isAnyAtRisk: false, atRiskSubjectIds: [] };
  }

  let totalAttended = 0;
  let totalEffective = 0;
  const atRiskSubjectIds: string[] = [];

  for (const res of subjectResults) {
    totalAttended += res.totalAttended;
    totalEffective += res.totalEffective;
    if (res.isAtRisk) {
      atRiskSubjectIds.push(res.subjectId);
    }
  }

  const overallPercentage = totalEffective > 0
    ? Math.round((totalAttended / totalEffective) * 1000) / 10
    : 100.0;

  return {
    overallPercentage,
    isAnyAtRisk: atRiskSubjectIds.length > 0,
    atRiskSubjectIds,
  };
}
