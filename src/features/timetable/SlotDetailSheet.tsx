import React from 'react';
import { db, LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import styles from './WeeklyGrid.module.css';
import { Check, X, Clock, FileText, Award, AlertCircle, Trash2 } from 'lucide-react';

interface SlotDetailSheetProps {
  slot: LectureSlot;
  subject: Subject;
  record?: AttendanceRecord;
  onClose: () => void;
}

export const SlotDetailSheet: React.FC<SlotDetailSheetProps> = ({
  slot,
  subject,
  record,
  onClose,
}) => {
  const markStatus = async (status: 'present' | 'absent' | 'late' | 'medical' | 'onduty') => {
    if (record) {
      const history = record.edit_history || [];
      await db.attendanceRecords.update(record.id, {
        status,
        marked_at: new Date().toISOString(),
        version: record.version + 1,
        edit_history: [
          ...history,
          {
            changed_at: new Date().toISOString(),
            old_status: record.status,
            new_status: status,
            reason: 'Modified via slot detail sheet',
          },
        ],
      });
    } else {
      await db.attendanceRecords.add({
        id: `att-${Date.now()}`,
        lecture_slot_id: slot.id,
        status,
        marked_at: new Date().toISOString(),
        version: 1,
        is_deleted: false,
      });
    }
    onClose();
  };

  const toggleCancelled = async () => {
    const newStatus = slot.status === 'cancelled' ? 'scheduled' : 'cancelled';
    await db.lectureSlots.update(slot.id, { status: newStatus });
    onClose();
  };

  const clearRecord = async () => {
    if (record) {
      await db.attendanceRecords.delete(record.id);
    }
    onClose();
  };

  const currentStatus = record?.status;

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheetContent} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '40px',
              borderRadius: '6px',
              backgroundColor: subject.color,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: `${subject.color}20`,
                  color: subject.color,
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {subject.code}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {slot.room_id || 'Classroom'}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
              {subject.name}
            </h3>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px var(--space-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-family-mono)',
            fontSize: '0.9rem',
          }}
        >
          <span>Time Slot</span>
          <span style={{ fontWeight: 600 }}>
            {slot.start_time.split('T')[1].substring(0, 5)} - {slot.end_time.split('T')[1].substring(0, 5)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Mark Attendance (5-State Rule)
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              onClick={() => markStatus('present')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                border: currentStatus === 'present' ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                backgroundColor: currentStatus === 'present' ? 'rgba(22, 163, 74, 0.1)' : 'var(--color-bg-secondary)',
                color: 'var(--color-success)',
                fontWeight: 600,
              }}
            >
              <Check size={18} />
              <span>Present</span>
            </button>

            <button
              onClick={() => markStatus('absent')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                border: currentStatus === 'absent' ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                backgroundColor: currentStatus === 'absent' ? 'var(--color-danger-bg)' : 'var(--color-bg-secondary)',
                color: 'var(--color-danger)',
                fontWeight: 600,
              }}
            >
              <X size={18} />
              <span>Absent</span>
            </button>

            <button
              onClick={() => markStatus('late')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                border: currentStatus === 'late' ? '2px solid var(--color-warning)' : '1px solid var(--color-border)',
                backgroundColor: currentStatus === 'late' ? 'rgba(217, 119, 6, 0.1)' : 'var(--color-bg-secondary)',
                color: 'var(--color-warning)',
                fontWeight: 600,
              }}
            >
              <Clock size={18} />
              <span>Late</span>
            </button>

            <button
              onClick={() => markStatus('medical')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                border: currentStatus === 'medical' ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                backgroundColor: currentStatus === 'medical' ? 'rgba(37, 99, 235, 0.1)' : 'var(--color-bg-secondary)',
                color: 'var(--color-accent-primary)',
                fontWeight: 600,
              }}
            >
              <FileText size={18} />
              <span>Medical</span>
            </button>
          </div>

          <button
            onClick={() => markStatus('onduty')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: 'var(--radius-card)',
              border: currentStatus === 'onduty' ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
              backgroundColor: currentStatus === 'onduty' ? 'rgba(37, 99, 235, 0.1)' : 'var(--color-bg-secondary)',
              color: 'var(--color-accent-primary)',
              fontWeight: 600,
            }}
          >
            <Award size={18} />
            <span>On-Duty Leave</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <button
            onClick={toggleCancelled}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              borderRadius: 'var(--radius-chip)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} />
            {slot.status === 'cancelled' ? 'Unmark Cancelled' : 'Faculty Cancelled Slot'}
          </button>

          {record && (
            <button
              onClick={clearRecord}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
              title="Clear marked attendance"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
