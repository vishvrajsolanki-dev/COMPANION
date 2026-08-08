import React, { useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { SegmentedControl, GlassCard, Banner } from '../../components/ui';
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

type AnalyticsTab = 'attendance' | 'tasks' | 'study';

const TABS: { value: AnalyticsTab; label: string }[] = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'study', label: 'Study' },
];

const cardTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

export const AnalyticsView: React.FC = () => {
  const { overall } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];

  const closeSubview = useUIStore(state => state.closeSubview);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('attendance');

  // Compute stats: weekday absence counts
  const weekdayAbsences = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun (0=Mon, 5=Sat, 6=Sun)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  attendanceRecords.forEach(rec => {
    if (rec.status === 'absent' && !rec.is_deleted) {
      const slot = lectureSlots.find(s => s.id === rec.lecture_slot_id);
      if (slot) {
        const date = new Date(slot.start_time);
        const day = (date.getDay() + 6) % 7; // Mon is 0, Sun is 6
        weekdayAbsences[day]++;
      }
    }
  });

  // Compute Faculty cancellation list
  const cancelledSlots = lectureSlots.filter(s => s.status === 'cancelled' && !s.is_deleted);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Analytics</h1>

      {/* Header */}
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
        <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Analytics Hub</h2>
          <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Performance overview
          </div>
        </div>
      </header>

      {/* Segmented Control */}
      <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
        <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

        {activeTab === 'attendance' && (
          <>
            {/* Trend Line Chart — multi-series, no area fill per DESIGN_SYSTEM.md */}
            <GlassCard>
              <div style={cardTitleStyle}>
                <TrendingUp size={16} color="var(--color-primary)" />
                <span>Attendance Trend History</span>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Last 6 weeks
                </span>
              </div>

              <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="300" y2="25" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="75" x2="300" y2="75" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />

                  {/* Multi-series thin lines (primary / secondary / tertiary accents) */}
                  <path
                    d="M 10,80 L 70,60 L 130,70 L 190,45 L 250,55 L 290,25"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10,88 L 70,72 L 130,78 L 190,60 L 250,68 L 290,45"
                    fill="none"
                    stroke="var(--color-secondary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10,92 L 70,84 L 130,86 L 190,74 L 250,80 L 290,62"
                    fill="none"
                    stroke="var(--color-tertiary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { color: 'var(--color-primary)', code: 'CS301' },
                    { color: 'var(--color-secondary)', code: 'MATH401' },
                    { color: 'var(--color-tertiary)', code: 'PHY205' },
                  ].map(s => (
                    <span key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, display: 'inline-block' }} />
                      {s.code}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                <span>Week 1</span>
                <span>Week 2 (Current)</span>
              </div>
            </GlassCard>

            {/* Weekday Absence Frequency Bars — lavender track, red intensity */}
            <GlassCard>
              <div style={cardTitleStyle}>
                <AlertCircle size={16} color="var(--color-danger)" />
                <span>Absence Frequency by Weekday</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', padding: '0 8px' }}>
                {weekdayAbsences.map((count, index) => {
                  const maxVal = Math.max(...weekdayAbsences, 1);
                  const pctHeight = (count / maxVal) * 100;

                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? 'var(--color-danger)' : 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                        {count}
                      </span>
                      <div
                        style={{
                          width: '14px',
                          height: `${Math.max(4, pctHeight)}px`,
                          backgroundColor: count > 0 ? 'var(--color-danger)' : 'var(--neutral-200, #E2E8F0)',
                          borderRadius: '4px',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {weekdays[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Faculty Cancellations list */}
            <GlassCard>
              <h3 style={cardTitleStyle}>Faculty Cancellation Records</h3>
              {cancelledSlots.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                  No cancelled sessions recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cancelledSlots.map(slot => {
                    const sub = subjects.find(s => s.id === slot.subject_id);
                    const slotDate = new Date(slot.start_time);

                    return (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub?.name || 'Subject'}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Cancelled on {slotDate.toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {slot.start_time.split('T')[1]?.substring(0, 5) || slot.start_time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {overall.isAnyAtRisk && (
              <Banner tone="danger" title="Attendance Alert" icon={<AlertCircle size={18} />}>
                {overall.atRiskSubjectIds.length} subject(s) below the 75% threshold.
              </Banner>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Task Efficiency Analytics</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Average completion speed: 18 hours before deadline.</p>
            </div>
          </GlassCard>
        )}

        {activeTab === 'study' && (
          <GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Calendar size={32} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Study Hour Logs</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Total study log tracking is currently synchronized locally.</p>
            </div>
          </GlassCard>
        )}

      </div>

    </div>
  );
};
export default AnalyticsView;
