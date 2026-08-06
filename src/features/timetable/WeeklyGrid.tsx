import React, { useState } from 'react';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { db, LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import styles from './WeeklyGrid.module.css';
import { SlotDetailSheet } from './SlotDetailSheet';
import { useUIStore } from '../../store/uiStore';
import { Calendar, MapPin, Clock, Plus, CalendarPlus } from 'lucide-react';

const DAYS = [
  { dayNum: 1, name: 'Mon', fullName: 'Monday' },
  { dayNum: 2, name: 'Tue', fullName: 'Tuesday' },
  { dayNum: 3, name: 'Wed', fullName: 'Wednesday' },
  { dayNum: 4, name: 'Thu', fullName: 'Thursday' },
  { dayNum: 5, name: 'Fri', fullName: 'Friday' },
  { dayNum: 6, name: 'Sat', fullName: 'Saturday' },
  { dayNum: 7, name: 'Sun', fullName: 'Sunday' },
];

export const WeeklyGrid: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Mon
  const [activeSlot, setActiveSlot] = useState<{ slot: LectureSlot; subject: Subject; record?: AttendanceRecord } | null>(null);
  
  // Extra class form state
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraSubjectId, setExtraSubjectId] = useState('');
  const [extraDate, setExtraDate] = useState('2026-08-05');
  const [extraStartTime, setExtraStartTime] = useState('16:00');
  const [extraEndTime, setExtraEndTime] = useState('17:15');
  const [extraRoomId, setExtraRoomId] = useState('LH-301');

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

  // Filter slots for selected day (1=Mon ... 7=Sun)
  const daySlots = lectureSlots
    .filter(slot => {
      if (slot.is_deleted) return false;
      const date = new Date(slot.start_time);
      let day = date.getDay(); // 0 = Sun, 1 = Mon, 6 = Sat
      if (day === 0) day = 7; // Convert Sun to 7
      return day === selectedDay;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraSubjectId || !extraDate || !extraStartTime || !extraEndTime) return;

    await db.lectureSlots.add({
      id: `slot-extra-${Date.now()}`,
      subject_id: extraSubjectId,
      room_id: extraRoomId || undefined,
      start_time: `${extraDate}T${extraStartTime}:00`,
      end_time: `${extraDate}T${extraEndTime}:00`,
      status: 'extra',
      is_deleted: false,
    });

    setIsAddingExtra(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Weekly Timetable (7-Day Grid)</h2>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsAddingExtra(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-chip)',
              fontWeight: 600,
              fontSize: '0.8rem',
              border: '1px solid var(--color-border)'
            }}
          >
            <Plus size={14} /> Extra Class
          </button>
          <button
            onClick={() => navigateToSubview('timetable-builder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-accent-primary)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 'var(--radius-chip)',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          >
            <CalendarPlus size={14} /> Builder
          </button>
        </div>
      </div>

      {/* 7-Day Selector Strip (Mon-Sun) */}
      <div className={styles.dayStrip}>
        {DAYS.map(d => (
          <button
            key={d.dayNum}
            onClick={() => setSelectedDay(d.dayNum)}
            className={`${styles.dayChip} ${selectedDay === d.dayNum ? styles.dayChipActive : ''}`}
          >
            <span className={styles.dayName}>{d.name}</span>
          </button>
        ))}
      </div>

      {/* Grid Slot List */}
      <div className={styles.gridWrapper}>
        {daySlots.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={32} />
            <p style={{ fontWeight: 600 }}>No lectures scheduled for {DAYS.find(d => d.dayNum === selectedDay)?.fullName}</p>
            <p style={{ fontSize: '0.85rem' }}>Tap "+ Extra Class" or "Builder" to add classes.</p>
          </div>
        ) : (
          daySlots.map(slot => {
            const subject = subjectMap.get(slot.subject_id);
            if (!subject) return null;

            const record = recordMap.get(slot.id);
            const isCancelled = slot.status === 'cancelled';
            const statusLabel = record ? record.status : slot.status;

            return (
              <div
                key={slot.id}
                className={styles.timeSlotCard}
                onClick={() => setActiveSlot({ slot, subject, record })}
              >
                {/* Accent strip deriving strictly from subject.color token */}
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
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {slot.start_time.split('T')[1]?.substring(0, 5) || slot.start_time} - {slot.end_time.split('T')[1]?.substring(0, 5) || slot.end_time}
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

                    <span
                      className={`${styles.statusBadge} ${
                        isCancelled
                          ? styles.badgeCancelled
                          : record?.status === 'present'
                          ? styles.badgePresent
                          : record?.status === 'absent'
                          ? styles.badgeAbsent
                          : record?.status === 'late'
                          ? styles.badgeLate
                          : record?.status === 'medical' || record?.status === 'onduty'
                          ? styles.badgeMedical
                          : styles.badgeScheduled
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Extra Class Sheet */}
      {isAddingExtra && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setIsAddingExtra(false)}
        >
          <form
            onSubmit={handleAddExtraClass}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--color-bg-primary)',
              borderTopLeftRadius: 'var(--radius-sheet)',
              borderTopRightRadius: 'var(--radius-sheet)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Extra Lecture</h3>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subject</label>
              <select
                value={extraSubjectId}
                onChange={e => setExtraSubjectId(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', marginTop: '4px' }}
              >
                <option value="">Select subject…</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date</label>
              <input
                type="date"
                value={extraDate}
                onChange={e => setExtraDate(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Start Time</label>
                <input
                  type="time"
                  value={extraStartTime}
                  onChange={e => setExtraStartTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>End Time</label>
                <input
                  type="time"
                  value={extraEndTime}
                  onChange={e => setExtraEndTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', marginTop: '4px' }}
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Room / Hall (e.g. CL-101)"
              value={extraRoomId}
              onChange={e => setExtraRoomId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}
              >
                Create Extra Class
              </button>
              <button
                type="button"
                onClick={() => setIsAddingExtra(false)}
                style={{ padding: '12px 20px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
