import React, { useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { db, Subject, LectureSlot, AttendanceRecord } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, AlertCircle, Plus, Calendar, ArrowRight, PlusCircle, Check } from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const { subjectResults, overall, subjectMap } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];

  const closeSubview = useUIStore(state => state.closeSubview);
  
  // Sheet state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [backfillSlotId, setBackfillSlotId] = useState<string | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<'present' | 'absent' | 'late' | 'medical' | 'onduty'>('present');

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const subjectResult = selectedSubjectId ? subjectMap.get(selectedSubjectId) : null;

  // Filter slots and records for the selected subject
  const subjectSlots = lectureSlots.filter(s => s.subject_id === selectedSubjectId && !s.is_deleted);
  const subjectRecords = attendanceRecords.filter(r => 
    subjectSlots.some(s => s.id === r.lecture_slot_id) && !r.is_deleted
  );

  const [dbError, setDbError] = useState<string | null>(null);

  const handleBackfill = async () => {
    if (!backfillSlotId) return;
    setDbError(null);

    try {
      const existingRecord = attendanceRecords.find(r => r.lecture_slot_id === backfillSlotId && !r.is_deleted);

      if (existingRecord) {
        await db.attendanceRecords.update(existingRecord.id, {
          status: backfillStatus,
          marked_at: new Date().toISOString(),
          version: existingRecord.version + 1,
          edit_history: [
            ...(existingRecord.edit_history || []),
            {
              changed_at: new Date().toISOString(),
              old_status: existingRecord.status,
              new_status: backfillStatus,
              reason: 'Backfill adjustment'
            }
          ]
        });
      } else {
        await db.attendanceRecords.add({
          id: `att-${Date.now()}`,
          lecture_slot_id: backfillSlotId,
          status: backfillStatus,
          marked_at: new Date().toISOString(),
          edit_history: [],
          version: 1,
          is_deleted: false
        });
      }

      setBackfillSlotId(null);
    } catch (err) {
      console.error('Failed to save attendance record:', err);
      setDbError('Failed to save attendance. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Attendance Center</h2>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* CONDITIONAL ALERT BANNER (Only shows if <75%) */}
        {overall.isAnyAtRisk && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px var(--space-md)',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid rgba(220, 38, 38, 0.1)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <AlertCircle size={16} />
            <span>Attention: Maintain attendance above 75% threshold to avoid exam registration risks.</span>
          </div>
        )}

        {/* Overall Percentage Ring Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '1rem', position: 'absolute', left: '16px', top: '16px' }}>
              {Math.round(overall.overallPercentage)}%
            </span>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: overall.isAnyAtRisk ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {overall.isAnyAtRisk ? 'Attendance at Risk' : 'Attendance Status Healthy'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Calculated across all active credit courses
            </p>
          </div>
        </div>

        {/* Subject Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {subjectResults.map(res => {
            const sub = subjects.find(s => s.id === res.subjectId);
            if (!sub) return null;

            return (
              <div 
                key={res.subjectId}
                onClick={() => setSelectedSubjectId(res.subjectId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '36px', borderRadius: '2px', backgroundColor: sub.color }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sub.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                      {res.totalAttended}/{res.totalEffective} Attended
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span 
                    style={{ 
                      fontFamily: 'var(--font-family-mono)', 
                      fontSize: '1rem', 
                      fontWeight: 700, 
                      color: res.isAtRisk ? 'var(--color-danger)' : 'var(--color-text-primary)' 
                    }}
                  >
                    {Math.round(res.percentage)}%
                  </span>
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: res.isAtRisk ? 'var(--color-danger)' : 'var(--color-success)' 
                    }}
                  >
                    {res.isAtRisk 
                      ? `Recover: Attend +${res.classesNeededToRecover}` 
                      : `Safe to Skip: ${res.safeToSkip}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap & Details Sheet */}
      {selectedSubjectId && activeSubject && subjectResult && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setSelectedSubjectId(null)}
        >
          <div 
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
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-border)', alignSelf: 'center' }} />

            <div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-family-mono)', color: activeSubject.color, fontWeight: 700 }}>
                {activeSubject.code}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeSubject.name}</h3>
            </div>

            {/* Heatmap Grid */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Attendance Heatmap (Past 2 Weeks)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {subjectSlots
                  .filter(slot => slot.status !== 'cancelled')
                  .map(slot => {
                    const record = subjectRecords.find(r => r.lecture_slot_id === slot.id);
                    const slotDate = new Date(slot.start_time);
                    const label = slotDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    
                    let bg = 'var(--color-bg-tertiary)';
                    let border = '1px solid var(--color-border)';
                    if (record) {
                      if (record.status === 'present') bg = 'rgba(22, 163, 74, 0.2)';
                      if (record.status === 'absent') bg = 'rgba(220, 38, 38, 0.2)';
                      if (record.status === 'late') bg = 'rgba(217, 119, 6, 0.2)';
                      if (record.status === 'medical' || record.status === 'onduty') bg = 'var(--color-info-bg)';
                    }

                    return (
                      <button
                        key={slot.id}
                        onClick={() => {
                          setBackfillSlotId(slot.id);
                          setBackfillStatus(record?.status || 'present');
                        }}
                        style={{
                          height: '44px',
                          borderRadius: '8px',
                          backgroundColor: bg,
                          border: border,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-family-mono)'
                        }}
                        title={`${label}: ${record?.status || 'Not Marked'}`}
                      >
                        <span style={{ fontWeight: 700 }}>{slotDate.getDate()}</span>
                        <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>{record?.status.substring(0, 3) || 'None'}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Backfill Dialog */}
            {backfillSlotId && (
              <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Backfill Class Attendance</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['present', 'absent', 'late', 'medical', 'onduty'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setBackfillStatus(st)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: backfillStatus === st ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                        backgroundColor: backfillStatus === st ? 'var(--color-info-bg)' : 'var(--color-bg-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {dbError && (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', gridColumn: '1 / -1' }}>
                      <AlertCircle size={14} /> {dbError}
                    </div>
                  )}
                  <button onClick={handleBackfill} style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                    Save Backfill
                  </button>
                  <button onClick={() => setBackfillSlotId(null)} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', fontSize: '0.85rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Audit Log list */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Audit Change Log
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {subjectRecords
                  .filter(r => r.edit_history && r.edit_history.length > 0)
                  .flatMap(r => r.edit_history!.map(log => ({ ...log, lectureSlotId: r.lecture_slot_id })))
                  .map((log, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '6px var(--space-sm)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                      <span>Changed to <b style={{ textTransform: 'capitalize' }}>{log.new_status}</b></span>
                      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {new Date(log.changed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <button 
              onClick={() => setSelectedSubjectId(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-bg-tertiary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginTop: 'var(--space-xs)'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AttendanceView;
