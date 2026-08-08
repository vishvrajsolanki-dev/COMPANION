import React, { useState } from 'react';
import { db, LectureSlot, Subject, AttendanceRecord } from '../../db/index';
import { todayISO } from '../../utils/date';
import { GlassButton, BottomSheet } from '../../components/ui';
import { Check, X, Clock, FileText, Award, AlertCircle, Trash2, RefreshCw } from 'lucide-react';

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
  const [rescheduleDate, setRescheduleDate] = useState(() => todayISO());
  const [rescheduleStartTime, setRescheduleStartTime] = useState('10:30');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('11:45');

  const [dbError, setDbError] = useState<string | null>(null);

  const markStatus = async (status: 'present' | 'absent' | 'late' | 'medical' | 'onduty') => {
    try {
      // Re-read the freshest row instead of relying on the render-time prop, so
      // rapid consecutive marks never lose edit history or create duplicates.
      const existing = await db.attendanceRecords
        .filter(r => r.lecture_slot_id === slot.id && !r.is_deleted)
        .first();

      if (existing) {
        await db.attendanceRecords.update(existing.id, {
          status,
          marked_at: new Date().toISOString(),
          version: existing.version + 1,
          edit_history: [
            ...(existing.edit_history || []),
            {
              changed_at: new Date().toISOString(),
              old_status: existing.status,
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
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      setDbError('Failed to save. Please try again.');
    }
  };

  const toggleCancelled = async () => {
    try {
      const newStatus = slot.status === 'cancelled' ? 'scheduled' : 'cancelled';
      await db.lectureSlots.update(slot.id, { status: newStatus });
      onClose();
    } catch (err) {
      console.error('Failed to toggle cancelled:', err);
      setDbError('Failed to update slot.');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return;

    try {
      await db.lectureSlots.update(slot.id, { status: 'cancelled' });
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
    } catch (err) {
      console.error('Failed to reschedule:', err);
      setDbError('Failed to reschedule. Please try again.');
    }
  };

  const clearRecord = async () => {
    try {
      if (record) {
        await db.attendanceRecords.update(record.id, { is_deleted: true });
      }
      onClose();
    } catch (err) {
      console.error('Failed to clear record:', err);
      setDbError('Failed to clear record.');
    }
  };

  const currentStatus = record?.status;

  return (
    <BottomSheet open onClose={onClose}>
      {dbError && (
        <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> {dbError}
        </div>
      )}

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
                borderRadius: 'var(--radius-pill)',
              }}
            >
              {subject.code}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {slot.room_id || 'Classroom'}
            </span>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
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
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          fontFamily: 'var(--font-family-mono)',
          fontSize: '0.9rem',
        }}
      >
        <span>Time Slot</span>
        <span style={{ fontWeight: 600 }}>
          {slot.start_time.split('T')[1]?.substring(0, 5) || slot.start_time} - {slot.end_time.split('T')[1]?.substring(0, 5) || slot.end_time}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Mark Attendance (5-State Rule)
        </span>

        {slot.status === 'cancelled' && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--color-warning-bg)',
              color: 'var(--color-warning-fg)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            This class was cancelled — attendance can't be marked for it.
          </div>
        )}

        {slot.status === 'cancelled' ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 2px' }}>
            Use “Unmark Cancelled” below if the class actually happened.
          </p>
        ) : (
          <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <button
            onClick={() => markStatus('present')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: 'var(--radius-card)',
              border: currentStatus === 'present' ? '2px solid var(--color-success-fg)' : '1px solid var(--border-hairline)',
              backgroundColor: currentStatus === 'present' ? 'var(--color-success-bg)' : 'var(--bg-card)',
              color: 'var(--color-success-fg)',
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
              border: currentStatus === 'absent' ? '2px solid var(--color-danger-fg)' : '1px solid var(--border-hairline)',
              backgroundColor: currentStatus === 'absent' ? 'var(--color-danger-bg)' : 'var(--bg-card)',
              color: 'var(--color-danger-fg)',
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
              border: currentStatus === 'late' ? '2px solid var(--color-warning-fg)' : '1px solid var(--border-hairline)',
              backgroundColor: currentStatus === 'late' ? 'var(--color-warning-bg)' : 'var(--bg-card)',
              color: 'var(--color-warning-fg)',
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
              border: currentStatus === 'medical' ? '2px solid var(--color-info-fg)' : '1px solid var(--border-hairline)',
              backgroundColor: currentStatus === 'medical' ? 'var(--color-info-bg)' : 'var(--bg-card)',
              color: 'var(--color-info-fg)',
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
            border: currentStatus === 'onduty' ? '2px solid var(--color-info-fg)' : '1px solid var(--border-hairline)',
            backgroundColor: currentStatus === 'onduty' ? 'var(--color-info-bg)' : 'var(--bg-card)',
            color: 'var(--color-info-fg)',
            fontWeight: 600,
          }}
        >
          <Award size={18} />
          <span>On-Duty Leave</span>
        </button>
          </>
        )}
      </div>

      {/* Reschedule and Cancel Controls */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-xs)' }}>
        <GlassButton variant="ghost" onClick={toggleCancelled} style={{ flex: 1 }}>
          <AlertCircle size={16} />
          {slot.status === 'cancelled' ? 'Unmark Cancelled' : 'Faculty Cancelled'}
        </GlassButton>

        <GlassButton variant="subtle" onClick={() => setIsRescheduling(true)} style={{ flex: 1 }}>
          <RefreshCw size={16} />
          <span>Reschedule</span>
        </GlassButton>

        {record && (
          <GlassButton variant="danger" onClick={clearRecord} title="Clear marked attendance" aria-label="Clear marked attendance">
            <Trash2 size={16} />
          </GlassButton>
        )}
      </div>

      {/* Reschedule Drawer Form */}
      {isRescheduling && (
        <form
          onSubmit={handleReschedule}
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reschedule Class</h4>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              required
              className="input"
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Time</label>
              <input
                type="time"
                value={rescheduleStartTime}
                onChange={e => setRescheduleStartTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End Time</label>
              <input
                type="time"
                value={rescheduleEndTime}
                onChange={e => setRescheduleEndTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>
              Confirm Reschedule
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setIsRescheduling(false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      )}
    </BottomSheet>
  );
};
