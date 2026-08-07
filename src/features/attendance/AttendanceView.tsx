import React, { useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, GlassButton, ProgressRing, Badge } from '../../components/ui';
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

  const overallPct = Math.round(overall.overallPercentage);
  const overallColor = overall.isAnyAtRisk ? 'var(--color-danger)' : 'var(--color-success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>

      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'var(--space-md)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-page)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Center</h2>
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
              border: '1px solid var(--color-danger-bg)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} />
            <span>Attention: Maintain attendance above 75% threshold to avoid exam registration risks.</span>
          </div>
        )}

        {/* Overall Percentage Ring Hero */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <ProgressRing
            value={overallPct}
            size={56}
            strokeWidth={5}
            color={overallColor}
            label={`${overallPct}%`}
          />
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: overallColor }}>
              {overall.isAnyAtRisk ? 'Attendance at Risk' : 'Attendance Status Healthy'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
                  position: 'relative',
                  overflow: 'hidden',
                  paddingLeft: 'calc(var(--space-md) + 4px)',
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-hairline)',
                  boxShadow: 'var(--shadow-card)',
                  cursor: 'pointer',
                }}
              >
                {/* Left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: sub.color }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '36px', borderRadius: '2px', backgroundColor: sub.color }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{sub.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
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
                        color: res.isAtRisk ? 'var(--color-danger)' : 'var(--text-primary)',
                      }}
                    >
                      {Math.round(res.percentage)}%
                    </span>
                    <span style={{ display: 'inline-flex', width: 'fit-content' }}>
                      <Badge tone={res.isAtRisk ? 'danger' : 'success'}>
                        {res.isAtRisk ? `Recover +${res.classesNeededToRecover}` : `Skip ${res.safeToSkip}`}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap & Details Sheet */}
      <BottomSheet open={!!selectedSubjectId && !!activeSubject && !!subjectResult} onClose={() => { setSelectedSubjectId(null); setBackfillSlotId(null); }}>
        {activeSubject && subjectResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-family-mono)', color: activeSubject.color, fontWeight: 700 }}>
                {activeSubject.code}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeSubject.name}</h3>
            </div>

            {/* Heatmap Grid */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Attendance Heatmap (Past 2 Weeks)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {subjectSlots
                  .filter(slot => slot.status !== 'cancelled')
                  .map(slot => {
                    const record = subjectRecords.find(r => r.lecture_slot_id === slot.id);
                    const slotDate = new Date(slot.start_time);
                    const label = slotDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                    let bg = 'var(--neutral-100)';
                    let border = '1px solid var(--border-hairline)';
                    if (record) {
                      if (record.status === 'present') bg = 'var(--color-success-bg)';
                      if (record.status === 'absent') bg = 'var(--color-danger-bg)';
                      if (record.status === 'late') bg = 'var(--color-warning-bg)';
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
                          fontFamily: 'var(--font-family-mono)',
                        }}
                        title={`${label}: ${record?.status || 'Not Marked'}`}
                      >
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{slotDate.getDate()}</span>
                        <span style={{ fontSize: '0.55rem', opacity: 0.8, color: 'var(--text-secondary)' }}>{record?.status.substring(0, 3) || 'None'}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Backfill Dialog */}
            {backfillSlotId && (
              <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Backfill Class Attendance</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['present', 'absent', 'late', 'medical', 'onduty'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setBackfillStatus(st)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 'var(--radius-pill)',
                        border: backfillStatus === st ? '2px solid var(--color-primary)' : '1px solid var(--border-hairline)',
                        backgroundColor: backfillStatus === st ? 'var(--color-info-bg)' : 'var(--bg-card)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        color: backfillStatus === st ? 'var(--color-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {dbError && (
                    <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', gridColumn: '1 / -1' }}>
                      <AlertCircle size={14} /> {dbError}
                    </div>
                  )}
                  <GlassButton onClick={handleBackfill} style={{ flex: 1 }}>
                    Save Backfill
                  </GlassButton>
                  <GlassButton variant="ghost" onClick={() => setBackfillSlotId(null)}>
                    Cancel
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Audit Log list */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Audit Change Log
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {subjectRecords
                  .filter(r => r.edit_history && r.edit_history.length > 0)
                  .flatMap(r => r.edit_history!.map(log => ({ ...log, lectureSlotId: r.lecture_slot_id })))
                  .map((log, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '6px var(--space-sm)', backgroundColor: 'var(--neutral-100)', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Changed to <b style={{ textTransform: 'capitalize' }}>{log.new_status}</b></span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                        {new Date(log.changed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
export default AttendanceView;
