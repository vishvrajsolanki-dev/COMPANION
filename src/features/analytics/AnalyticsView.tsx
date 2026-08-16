import React, { useMemo, useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords, useTasks } from '../../db/useDatabase';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { todayISO, datePart } from '../../utils/date';
import { computeAttendanceTrend, hasTrendData, buildTrendPath } from '../../utils/attendanceTrend';
import { SegmentedControl, Card, Banner } from '../../components/ui';
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
  color: 'var(--on-surface, #1a1c1c)',
  fontFamily: 'var(--font-primary)',
};

export const AnalyticsView: React.FC = () => {
  const { overall } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];
  const tasks = useTasks() || [];

  const closeSubview = () => navigateTo(CANONICAL_HASHES.studyTasks);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('attendance');

  // Compute stats: weekday absence counts
  const weekdayAbsences = [0, 0, 0, 0, 0, 0, 0];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  attendanceRecords.forEach(rec => {
    if (rec.status === 'absent' && !rec.is_deleted) {
      const slot = lectureSlots.find(s => s.id === rec.lecture_slot_id);
      if (slot) {
        const date = new Date(slot.start_time);
        const day = (date.getDay() + 6) % 7;
        weekdayAbsences[day]++;
      }
    }
  });

  // Faculty cancellation list
  const cancelledSlots = lectureSlots.filter(s => s.status === 'cancelled' && !s.is_deleted);

  // Attendance Trend History
  const attendanceTrend = useMemo(
    () => computeAttendanceTrend(lectureSlots, attendanceRecords),
    [lectureSlots, attendanceRecords],
  );

  const hasTrend = hasTrendData(attendanceTrend);

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
      { key: '__overall__', label: 'Overall', color: 'var(--primary, #001e4c)', buckets: overall },
      ...topSubjects.map((s, idx) => {
        const sub = subjects.find(sub => sub.id === s.subjectId);
        return {
          key: s.subjectId,
          label: sub?.code || 'Subject',
          color: idx === 0 ? 'var(--secondary, #5a54a4)' : 'var(--outline, #747781)',
          buckets: bySubject.get(s.subjectId)!,
        };
      }),
    ];
    return series;
  }, [attendanceTrend, subjects]);

  // Task analytics
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
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="analytics-view">
      <h1 className="sr-only">Analytics</h1>

      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'var(--stack-md, 16px)',
          paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--outline-variant, #c4c6d1)',
          backgroundColor: 'var(--surface-container-lowest, #ffffff)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={closeSubview}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-surface, #1a1c1c)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Analytics Hub</h2>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
            Performance overview
          </div>
        </div>
      </header>

      {/* Segmented Control */}
      <div style={{ padding: 'var(--stack-sm, 8px) var(--stack-md, 16px)' }}>
        <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ padding: '0 var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>

        {activeTab === 'attendance' && (
          <>
            {/* Trend Line Chart */}
            <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
              <div style={cardTitleStyle}>
                <TrendingUp size={16} color="var(--primary, #001e4c)" />
                <span>Attendance Trend History</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                  Last 6 weeks
                </span>
              </div>

              {!hasTrend ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 8px', textAlign: 'center' }}>
                  <TrendingUp size={28} style={{ color: 'var(--on-surface-variant, #444750)' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--on-surface, #1a1c1c)' }}>
                    No attendance marked yet
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant, #444750)', maxWidth: 240 }}>
                    Mark attendance on your timetable slots and your weekly trend will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Grid Lines — 25 / 50 / 75% attendance */}
                      <line x1="0" y1="69" x2="300" y2="69" stroke="var(--outline-variant, #c4c6d1)" strokeWidth="0.5" strokeDasharray="4" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="var(--outline-variant, #c4c6d1)" strokeWidth="0.5" strokeDasharray="4" />
                      <line x1="0" y1="31" x2="300" y2="31" stroke="var(--outline-variant, #c4c6d1)" strokeWidth="0.5" strokeDasharray="4" />

                      {/* Real attendance series */}
                      {chartSeries.map(s => {
                        const d = buildTrendPath(s.buckets, attendanceTrend.weekStarts);
                        if (!d) return null;
                        return (
                          <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {chartSeries.map(s => (
                        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant, #444750)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, display: 'inline-block' }} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* X-axis */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                    {attendanceTrend.weekStarts.map((ws, i) => (
                      <span key={i}>
                        {ws.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Weekday Absence Frequency Bars */}
            <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
              <div style={cardTitleStyle}>
                <AlertCircle size={16} color="var(--error, #ba1a1a)" />
                <span>Absence Frequency by Weekday</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', padding: '0 8px' }}>
                {weekdayAbsences.map((count, index) => {
                  const maxVal = Math.max(...weekdayAbsences, 1);
                  const pctHeight = (count / maxVal) * 100;

                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? 'var(--error, #ba1a1a)' : 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                        {count}
                      </span>
                      <div
                        style={{
                          width: '14px',
                          height: `${Math.max(4, pctHeight)}px`,
                          backgroundColor: count > 0 ? 'var(--error, #ba1a1a)' : 'var(--surface-container-high, #e9e8e7)',
                          borderRadius: '4px',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                        {weekdays[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Faculty Cancellations list */}
            <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={cardTitleStyle}>Faculty Cancellation Records</h3>
              {cancelledSlots.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant, #444750)', textAlign: 'center', padding: '8px 0' }}>
                  No cancelled sessions recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cancelledSlots.map(slot => {
                    const sub = subjects.find(s => s.id === slot.subject_id);
                    const slotDate = new Date(slot.start_time);

                    return (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--surface-container-low, #f4f3f2)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--outline-variant, #c4c6d1)', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--on-surface, #1a1c1c)' }}>{sub?.name || 'Subject'}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant, #444750)' }}>
                            Cancelled on {slotDate.toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant, #444750)', textDecoration: 'line-through' }}>
                          {slot.start_time.split('T')[1]?.substring(0, 5) || slot.start_time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {overall.isAnyAtRisk && (
              <Banner tone="danger" title="Attendance Alert" icon={<AlertCircle size={18} />}>
                {overall.atRiskSubjectIds.length} subject(s) below the 75% threshold.
              </Banner>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <Card style={{ padding: 'var(--stack-md, 16px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', color: 'var(--on-surface-variant, #444750)' }}>
              <CheckCircle size={32} style={{ color: 'var(--success-attendance, #0f336d)' }} />
              <h4 style={{ color: 'var(--on-surface, #1a1c1c)', fontWeight: 700, fontFamily: 'var(--font-primary)' }}>Task Analytics</h4>
              {totalTasks === 0 ? (
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>No tasks yet. Create tasks from the Tasks tab to see real analytics.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--stack-sm, 8px)', width: '100%', marginTop: 8 }}>
                  {[
                    { value: totalTasks, label: 'Total', color: 'var(--on-surface, #1a1c1c)' },
                    { value: completedTasks, label: 'Completed', color: 'var(--success-attendance, #0f336d)' },
                    { value: pendingTasks, label: 'Pending', color: 'var(--primary, #001e4c)' },
                    { value: overdueTasks, label: 'Overdue', color: overdueTasks > 0 ? 'var(--error, #ba1a1a)' : 'var(--on-surface-variant, #444750)' },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: 12, borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', border: '1px solid var(--outline-variant, #c4c6d1)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--on-surface-variant, #444750)' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--on-surface-variant, #444750)' }}>
                Completion rate: <strong>{completionRate}%</strong>
                {overdueTasks > 0 && <>, {overdueTasks} overdue</>}
              </p>
            </div>
          </Card>
        )}

        {activeTab === 'study' && (
          <Card style={{ padding: 'var(--stack-md, 16px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', color: 'var(--on-surface-variant, #444750)' }}>
              <Calendar size={32} style={{ color: 'var(--primary, #001e4c)' }} />
              <h4 style={{ color: 'var(--on-surface, #1a1c1c)', fontWeight: 700, fontFamily: 'var(--font-primary)' }}>Study Hour Logs</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Study hour tracking with session timers, daily goals, and weekly reports will be available in a future release.</p>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full, 9999px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', color: 'var(--primary, #001e4c)', border: '1px solid var(--outline-variant, #c4c6d1)' }}>
                In Development
              </span>
            </div>
          </Card>
        )}

      </div>

    </div>
  );
};
export default AnalyticsView;
