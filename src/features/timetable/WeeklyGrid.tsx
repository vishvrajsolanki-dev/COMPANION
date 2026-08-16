import React, { useState } from 'react';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { db, LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import styles from './WeeklyGrid.module.css';
import { SlotDetailSheet } from './SlotDetailSheet';
import { todayISO, nowMinutes, isToday } from '../../utils/date';
import { useUIStore } from '../../store/uiStore';
import { navigateTo } from '../../hooks/useHashLocation';
import { Button, BottomSheet, EmptyState, Badge } from '../../components/ui';
import { Calendar, MapPin, Clock, Plus, CalendarPlus, AlertCircle } from 'lucide-react';

const DAYS = [
  { dayNum: 1, name: 'Mon', fullName: 'Monday' },
  { dayNum: 2, name: 'Tue', fullName: 'Tuesday' },
  { dayNum: 3, name: 'Wed', fullName: 'Wednesday' },
  { dayNum: 4, name: 'Thu', fullName: 'Thursday' },
  { dayNum: 5, name: 'Fri', fullName: 'Friday' },
  { dayNum: 6, name: 'Sat', fullName: 'Saturday' },
  { dayNum: 7, name: 'Sun', fullName: 'Sunday' },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  extra: 'Extra Class',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  medical: 'Medical',
  onduty: 'On-Duty',
};
const statusLabel = (raw: string) => STATUS_LABELS[raw] ?? raw;

export const WeeklyGrid: React.FC = () => {
  // Default selected day to current day of week (1=Mon ... 7=Sun)
  const currentJsDay = new Date().getDay();
  const defaultDay = currentJsDay === 0 ? 7 : currentJsDay;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  const [activeSlot, setActiveSlot] = useState<{ slot: LectureSlot; subject: Subject; record?: AttendanceRecord } | null>(null);

  // Extra class form state
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [extraSubjectId, setExtraSubjectId] = useState('');
  const [extraDate, setExtraDate] = useState(() => todayISO());
  const [extraStartTime, setExtraStartTime] = useState('16:00');
  const [extraEndTime, setExtraEndTime] = useState('17:15');
  const [extraRoomId, setExtraRoomId] = useState('LH-301');
  const [extraError, setExtraError] = useState<string | null>(null);

  const openExtraSheet = () => {
    setExtraSubjectId('');
    setExtraDate(todayISO());
    setExtraStartTime('16:00');
    setExtraEndTime('17:15');
    setExtraRoomId('LH-301');
    setExtraError(null);
    setIsSavingExtra(false);
    setIsAddingExtra(true);
  };
  const closeExtraSheet = () => {
    setIsSavingExtra(false);
    setIsAddingExtra(false);
  };

  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];
  const navigateToSubview = useUIStore(state => state.navigateToSubview);

  const subjectMap = new Map<string, Subject>();
  for (const sub of subjects) {
    subjectMap.set(sub.id, sub);
  }

  const recordMap = new Map<string, AttendanceRecord>();
  for (const rec of attendanceRecords) {
    recordMap.set(rec.lecture_slot_id, rec);
  }

  // Current time in "HH:MM" format
  const now = nowMinutes();
  const isViewingToday = selectedDay === defaultDay;

  // Filter slots for selected day (1=Mon ... 7=Sun)
  const daySlots = lectureSlots
    .filter(slot => {
      if (slot.is_deleted) return false;
      const date = new Date(slot.start_time);
      let day = date.getDay(); // 0 = Sun, 1 = Mon, 6 = Sat
      if (day === 0) day = 7;
      return day === selectedDay;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraSubjectId || !extraDate || !extraStartTime || !extraEndTime) return;
    if (isSavingExtra) return;

    if (extraStartTime >= extraEndTime) {
      setExtraError('End time must be after start time.');
      return;
    }

    setIsSavingExtra(true);
    try {
      await db.lectureSlots.add({
        id: `slot-extra-${Date.now()}`,
        subject_id: extraSubjectId,
        room_id: extraRoomId || undefined,
        start_time: `${extraDate}T${extraStartTime}:00`,
        end_time: `${extraDate}T${extraEndTime}:00`,
        status: 'extra',
        is_deleted: false,
      });
    } finally {
      closeExtraSheet();
    }
  };

  return (
    <div className={styles.container} data-testid="timetable-view">
      <h1 className="sr-only">Weekly Timetable</h1>

      {/* Header Bar */}
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Weekly Timetable</h2>
        <div className={styles.headerActions}>
          <Button size="sm" variant="subtle" onClick={openExtraSheet}>
            <Plus size={14} /> Extra Class
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigateTo('#plan/builder')}>
            <CalendarPlus size={14} /> Builder
          </Button>
        </div>
      </div>

      {/* 7-Day Selector Strip */}
      <div className={styles.dayStrip} role="tablist" aria-label="Select Day">
        {DAYS.map(d => (
          <button
            key={d.dayNum}
            role="tab"
            aria-selected={selectedDay === d.dayNum}
            onClick={() => setSelectedDay(d.dayNum)}
            className={`${styles.dayChip} ${selectedDay === d.dayNum ? styles.dayChipActive : ''}`}
          >
            <span className={styles.dayName}>{d.name}</span>
          </button>
        ))}
      </div>

      {/* Slot List */}
      <div className={styles.gridWrapper}>
        {daySlots.length === 0 ? (
          <EmptyState
            icon={<Calendar size={32} />}
            title={`No lectures scheduled for ${DAYS.find(d => d.dayNum === selectedDay)?.fullName}`}
            body='Tap "+ Extra Class" or "Builder" to add classes.'
          />
        ) : (
          daySlots.map(slot => {
            const subject = subjectMap.get(slot.subject_id);
            if (!subject) return null;

            const record = recordMap.get(slot.id);
            const isCancelled = slot.status === 'cancelled';
            const rawStatus = record ? record.status : slot.status;

            // Class status hierarchy (Current vs Completed vs Scheduled)
            const startTimeStr = slot.start_time.split('T')[1]?.substring(0, 5) || '';
            const endTimeStr = slot.end_time.split('T')[1]?.substring(0, 5) || '';

            const isCurrent = isViewingToday && isToday(slot.start_time) && now >= startTimeStr && now <= endTimeStr;
            const isCompleted = isViewingToday && isToday(slot.start_time) && now > endTimeStr;

            return (
              <div
                key={slot.id}
                className={`${styles.timeSlotCard} ${
                  isCurrent ? styles.currentSlotCard : isCompleted ? styles.completedSlotCard : ''
                }`}
                onClick={() => setActiveSlot({ slot, subject, record })}
                role="button"
                tabIndex={0}
                aria-label={`${subject.name} from ${startTimeStr} to ${endTimeStr}`}
              >
                <div
                  className={styles.colorBar}
                  style={{ backgroundColor: subject.color }}
                />

                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <span
                      className={styles.subjectCode}
                      style={{
                        backgroundColor: `${subject.color}18`,
                        color: subject.color,
                      }}
                    >
                      {subject.code}
                    </span>
                    <span className={styles.timeBadge}>
                      <Clock size={12} />
                      {startTimeStr} - {endTimeStr}
                    </span>
                  </div>

                  <h4 className={`${styles.subjectName} ${isCancelled ? styles.cancelledText : ''}`}>
                    {subject.name}
                  </h4>

                  <div className={styles.cardFooter}>
                    <span className={styles.roomInfo}>
                      <MapPin size={12} />
                      {slot.room_id || 'Classroom'}
                    </span>

                    <Badge
                      tone={
                        isCancelled
                          ? 'neutral'
                          : record?.status === 'present'
                          ? 'success'
                          : record?.status === 'absent'
                          ? 'danger'
                          : record?.status === 'late'
                          ? 'warning'
                          : record?.status === 'medical' || record?.status === 'onduty'
                          ? 'info'
                          : isCurrent
                          ? 'accent'
                          : 'neutral'
                      }
                    >
                      {isCurrent ? 'NOW LIVE' : statusLabel(rawStatus)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Extra Class Sheet */}
      <BottomSheet open={isAddingExtra} onClose={closeExtraSheet}>
        <form
          onSubmit={handleAddExtraClass}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)' }}>Add Extra Lecture</h3>

          {extraError && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--error-container)',
                color: 'var(--on-error-container)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {extraError}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Subject</label>
            <select
              value={extraSubjectId}
              onChange={e => setExtraSubjectId(e.target.value)}
              required
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            >
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Date</label>
            <input
              type="date"
              value={extraDate}
              onChange={e => setExtraDate(e.target.value)}
              required
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Start Time</label>
              <input
                type="time"
                value={extraStartTime}
                onChange={e => setExtraStartTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>End Time</label>
              <input
                type="time"
                value={extraEndTime}
                onChange={e => setExtraEndTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Room / Hall</label>
            <input
              type="text"
              placeholder="e.g. CL-101"
              value={extraRoomId}
              onChange={e => setExtraRoomId(e.target.value)}
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: 8 }}>
            <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={isSavingExtra}>
              {isSavingExtra ? 'Adding…' : 'Create Extra Class'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeExtraSheet} disabled={isSavingExtra}>
              Cancel
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Quick Attendance Mark Sheet */}
      {activeSlot && (
        <SlotDetailSheet
          slot={activeSlot.slot}
          subject={activeSlot.subject}
          record={activeSlot.record}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </div>
  );
};

export default WeeklyGrid;
