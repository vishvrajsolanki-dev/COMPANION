import { LectureSlot, AttendanceRecord } from '../db/index';

/**
 * Pure helpers for the Analytics "Attendance Trend History" chart (Bug H1).
 *
 * Attendance records are bucketed into ISO weeks (Mon–Sun) over the last 6
 * weeks, once per subject and overall. Weeks without any marked attendance
 * stay empty so the chart never invents data — a fresh account with zero
 * records reports `hasTrendData === false` and the view renders an honest
 * empty state instead of a fake line.
 */

export interface TrendBucket {
  effective: number; // non-cancelled slots with a marked record this week
  attended: number;  // of those, marked present/late/medical/onduty
}

export interface AttendanceTrend {
  weekStarts: Date[];
  overall: TrendBucket[];
  bySubject: Map<string, TrendBucket[]>;
}

/** Monday-start dates for the last WEEKS weeks, oldest first. */
function computeWeekStarts(now: Date, weeks: number): Date[] {
  const todayDay = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
  const starts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(now);
    ws.setDate(now.getDate() - todayDay - i * 7);
    ws.setHours(0, 0, 0, 0);
    starts.push(ws);
  }
  return starts;
}

export function computeAttendanceTrend(
  lectureSlots: LectureSlot[],
  attendanceRecords: AttendanceRecord[],
  now: Date = new Date(),
): AttendanceTrend {
  const WEEKS = 6;
  const weekStarts = computeWeekStarts(now, WEEKS);
  const slotById = new Map(lectureSlots.map(s => [s.id, s]));

  const bySubject = new Map<string, TrendBucket[]>();
  for (const rec of attendanceRecords) {
    if (rec.is_deleted) continue;
    const slot = slotById.get(rec.lecture_slot_id);
    if (!slot || slot.is_deleted || slot.status === 'cancelled') continue;

    const slotDate = new Date(slot.start_time);
    for (let i = 0; i < WEEKS; i++) {
      const ws = weekStarts[i];
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      if (slotDate >= ws && slotDate < we) {
        // Lazily register the subject only on an in-window match, so records
        // outside the 6-week window never create empty subject buckets.
        let buckets = bySubject.get(slot.subject_id);
        if (!buckets) {
          buckets = weekStarts.map(() => ({ effective: 0, attended: 0 }));
          bySubject.set(slot.subject_id, buckets);
        }
        buckets[i].effective++;
        if (rec.status !== 'absent') buckets[i].attended++;
        break;
      }
    }
  }

  const overall = weekStarts.map(() => ({ effective: 0, attended: 0 }));
  for (const [, buckets] of bySubject) {
    for (let i = 0; i < WEEKS; i++) {
      overall[i].effective += buckets[i].effective;
      overall[i].attended += buckets[i].attended;
    }
  }

  return { weekStarts, overall, bySubject };
}

/** True when any week in the last 6 has a marked (non-cancelled) record. */
export function hasTrendData(trend: AttendanceTrend): boolean {
  return trend.overall.some(b => b.effective > 0);
}

/**
 * Turns weekly buckets into an SVG polyline path (M/L commands). Weeks without
 * any data contribute no point, so the line breaks across gaps instead of
 * dipping to 0%. Returns null when the series has no data at all.
 */
export function buildTrendPath(
  buckets: TrendBucket[],
  weekStarts: Date[],
): string | null {
  const W = weekStarts.length;
  const padX = 22;
  const top = 12;
  const bottom = 88;
  const span = 300 - padX * 2;
  const step = W > 1 ? span / (W - 1) : 0;

  let d = '';
  let started = false;
  buckets.forEach((b, i) => {
    if (b.effective === 0) {
      started = false;
      return;
    }
    const x = padX + i * step;
    const pct = (b.attended / b.effective) * 100;
    const y = bottom - (pct / 100) * (bottom - top);
    d += started ? ` L ${x.toFixed(1)},${y.toFixed(1)}` : ` M ${x.toFixed(1)},${y.toFixed(1)}`;
    started = true;
  });

  return started ? d.trim() : null;
}
