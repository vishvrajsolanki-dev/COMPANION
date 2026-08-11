import React, { useMemo, useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords, useTasks } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { todayISO, datePart } from '../../utils/date';
import { computeAttendanceTrend, hasTrendData, buildTrendPath } from '../../utils/attendanceTrend';
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
  const tasks = useTasks() || [];

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

  // ── Attendance Trend History (real data — Bug H1) ─────────────────────────
  // Pure bucketing lives in utils/attendanceTrend (unit-tested): ISO-week
  // buckets over the last 6 weeks, per subject + overall, with cancelled slots
  // excluded. A fresh account with zero records yields `hasTrendData === false`
  // and the chart renders an honest empty state instead of invented data.
  const attendanceTrend = useMemo(
    () => computeAttendanceTrend(lectureSlots, attendanceRecords),
    [lectureSlots, attendanceRecords],
  );

  const hasTrend = hasTrendData(attendanceTrend);

  // Series drawn in the chart: overall (primary) + the 2 subjects with the most
  // marked attendance this window (secondary/tertiary), so the multi-line look
  // is preserved while every line comes from real records.
  const chartSeries = useMemo(() => {
    const { overall, bySubject } = attendanceTrend;
    const topSubjects = [...bySubject.entries()]
      .map(([subjectId, buckets]) => ({
        subjectId,
        count: buckets.reduce((n, b) => n + b.effective, 0),
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    const series: {
      key: string;
      label: string;
      color: string;
      buckets: { effective: number; attended: number }[];
    }[] = [
      { key: '__overall__', label: 'Overall', color: 'var(--color-primary)', buckets: overall },
      ...topSubjects.map((s, idx) => {
        const sub = subjects.find(sub => sub.id === s.subjectId);
        return {
          key: s.subjectId,
          label: sub?.code || 'Subject',
          color: idx === 0 ? 'var(--color-secondary)' : 'var(--color-tertiary)',
          buckets: bySubject.get(s.subjectId)!,
        };
      }),
    ];
    return series;
  }, [attendanceTrend, subjects]);

  // ── Task analytics (real stats — Bug F#17–19) ─────────────────────────
  // The Task model has no `completed_at` field, so "completion speed" can't
  // be computed. Instead we show genuine count/ratio stats.
  const activeTasks = tasks.filter(t => !t.is_deleted);
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = activeTasks.filter(t => t.status !== 'completed').length;
  const today = todayISO();
  const overdueTasks = activeTasks.filter(
    t => t.status !== 'completed' && t.due_at && datePart(t.due_at) < today,
  ).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
            {/* Trend Line Chart — real weekly attendance rate, no area fill per DESIGN_SYSTEM.md */}
            <GlassCard>
              <div style={cardTitleStyle}>
                <TrendingUp size={16} color="var(--color-primary)" />
                <span>Attendance Trend History</span>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Last 6 weeks
                </span>
              </div>

              {!hasTrend ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 8px', textAlign: 'center' }}>
                  <TrendingUp size={28} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    No attendance marked yet
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 240 }}>
                    Mark attendance on your timetable slots and your weekly trend will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Grid Lines — 25 / 50 / 75% attendance */}
                      <line x1="0" y1="69" x2="300" y2="69" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />
                      <line x1="0" y1="31" x2="300" y2="31" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="4" />

                      {/* Real attendance series — one thin line per series */}
                      {chartSeries.map(s => {
                        const d = buildTrendPath(s.buckets, attendanceTrend.weekStarts);
                        if (!d) return null;
                        return (
                          <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legend — real subjects */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {chartSeries.map(s => (
                        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, display: 'inline-block' }} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* X-axis — real week-start dates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                    {attendanceTrend.weekStarts.map((ws, i) => (
                      <span key={i}>
                        {ws.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </>
              )}
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
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Task Analytics</h4>
              {totalTasks === 0 ? (
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>No tasks yet. Create tasks from the Tasks tab to see real analytics.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', width: '100%', marginTop: 4 }}>
                  {[
                    { value: totalTasks, label: 'Total', color: 'var(--text-primary)' },
                    { value: completedTasks, label: 'Completed', color: 'var(--color-success-fg)' },
                    { value: pendingTasks, label: 'Pending', color: 'var(--color-primary)' },
                    { value: overdueTasks, label: 'Overdue', color: overdueTasks > 0 ? 'var(--color-danger-fg)' : 'var(--text-muted)' },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: 8, borderRadius: 'var(--radius-card)', backgroundColor: 'var(--bg-page)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-family-mono)' }}>{stat.value}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--text-muted)' }}>
                Completion rate: <strong>{completionRate}%</strong>
                {overdueTasks > 0 && <>, {overdueTasks} overdue</>}
              </p>
            </div>
          </GlassCard>
        )}

        {activeTab === 'study' && (
          <GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Calendar size={32} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Study Hour Logs</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Coming soon — study hour tracking with session timers, daily goals, and weekly reports will be available in a future release.</p>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info-fg)' }}>
                In Development
              </span>
            </div>
          </GlassCard>
        )}

      </div>

    </div>
  );
};
export default AnalyticsView;
