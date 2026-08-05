import React, { useState } from 'react';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import styles from './WeeklyGrid.module.css';
import { SlotDetailSheet } from './SlotDetailSheet';
import { Calendar, MapPin, Clock } from 'lucide-react';

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

  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Weekly Timetable (7-Day Grid)</h2>
        <div className={styles.segmentedControl}>
          <button className={`${styles.segmentButton} ${styles.segmentButtonActive}`}>
            Daily Stream
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
            <p style={{ fontSize: '0.85rem' }}>No classes on this day.</p>
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
                      {slot.start_time} - {slot.end_time}
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
