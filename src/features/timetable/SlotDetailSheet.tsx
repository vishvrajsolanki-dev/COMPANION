import React, { useState } from 'react';
import { db, LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import styles from './WeeklyGrid.module.css';
import { Check, X, Clock, FileText, Award, AlertCircle, Trash2, Calendar, RefreshCw } from 'lucide-react';

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
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('2026-08-06');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('10:30');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('11:45');

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

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return;

    // 1. Cancel original slot
    await db.lectureSlots.update(slot.id, { status: 'cancelled' });

    // 2. Create new rescheduled slot linked to original
    const newSlotId = `slot-resched-${Date.now()}`;
    await db.lectureSlots.add({
      id: newSlotId,
      subject_id: slot.subject_id,
      room_id: slot.room_id,
      start_time: `${rescheduleDate}T${rescheduleStartTime}:00`,
      end_time: `${rescheduleDate}T${rescheduleEndTime}:00`,
      status: 'rescheduled',
      linked_slot_id: slot.id,
      is_deleted: false,
    });

    setIsRescheduling(false);
    onClose();
  };

  const clearRecord = async () => {
    if (record) {
      // Soft-delete: set is_deleted:true to preserve audit trail, matching the
      // contract used by tasks, notes, and every other table in this app.
      await db.attendanceRecords.update(record.id, { is_deleted: true });
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

        {/* Reschedule and Cancel Controls */}
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
            {slot.status === 'cancelled' ? 'Unmark Cancelled' : 'Faculty Cancelled'}
          </button>

          <button
            onClick={() => setIsRescheduling(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              borderRadius: 'var(--radius-chip)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-accent-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} />
            <span>Reschedule</span>
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

        {/* Reschedule Drawer Form */}
        {isRescheduling && (
          <form
            onSubmit={handleReschedule}
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Reschedule Class</h4>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', marginTop: '2px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Start Time</label>
                <input
                  type="time"
                  value={rescheduleStartTime}
                  onChange={e => setRescheduleStartTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', marginTop: '2px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>End Time</label>
                <input
                  type="time"
                  value={rescheduleEndTime}
                  onChange={e => setRescheduleEndTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', marginTop: '2px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button
                type="submit"
                style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Confirm Reschedule
              </button>
              <button
                type="button"
                onClick={() => setIsRescheduling(false)}
                style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
