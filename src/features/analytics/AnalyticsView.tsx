import React, { useState } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, BarChart2, CheckCircle, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { subjectResults, overall } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];

  const closeSubview = useUIStore(state => state.closeSubview);
  
  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks' | 'study'>('attendance');

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Analytics Hub</h2>
      </header>

      {/* Segmented Control */}
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {(['attendance', 'tasks', 'study'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                backgroundColor: activeTab === tab ? 'var(--color-bg-primary)' : 'transparent',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {activeTab === 'attendance' && (
          <>
            {/* Trend Line Chart (SVG Line Chart) */}
            <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700 }}>
                <TrendingUp size={16} color="var(--color-accent-primary)" />
                <span>Attendance Trend History</span>
              </div>

              {/* Simple inline SVG chart */}
              <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="300" y2="25" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="75" x2="300" y2="75" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4" />
                  
                  {/* Trend line paths */}
                  <path
                    d="M 10,80 L 70,60 L 130,70 L 190,45 L 250,55 L 290,25"
                    fill="none"
                    stroke="var(--color-accent-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  
                  {/* Area fill */}
                  <path
                    d="M 10,80 L 70,60 L 130,70 L 190,45 L 250,55 L 290,25 L 290,100 L 10,100 Z"
                    fill="url(#accent-grad)"
                    opacity="0.1"
                  />

                  <defs>
                    <linearGradient id="accent-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent-primary)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                <span>Week 1</span>
                <span>Week 2 (Current)</span>
              </div>
            </div>

            {/* Weekday Absence Frequency Bars */}
            <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700 }}>
                <BarChart2 size={16} color="var(--color-danger)" />
                <span>Absence Frequency by Weekday</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', padding: '0 8px' }}>
                {weekdayAbsences.map((count, index) => {
                  const maxVal = Math.max(...weekdayAbsences, 1);
                  const pctHeight = (count / maxVal) * 100;
                  
                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
                        {count}
                      </span>
                      <div 
                        style={{
                          width: '12px',
                          height: `${Math.max(4, pctHeight)}px`,
                          backgroundColor: count > 0 ? 'var(--color-danger)' : 'var(--color-bg-tertiary)',
                          borderRadius: '3px'
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {weekdays[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Faculty Cancellations list */}
            <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Faculty Cancellation Records</h3>
              {cancelledSlots.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                  No cancelled sessions recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cancelledSlots.map(slot => {
                    const sub = subjects.find(s => s.id === slot.subject_id);
                    const slotDate = new Date(slot.start_time);
                    
                    return (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--color-bg-primary)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{sub?.name || 'Subject'}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                            Cancelled on {slotDate.toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
                          {slot.start_time.split('T')[1].substring(0, 5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CheckCircle size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
            <h4>Task Efficiency Analytics</h4>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Average completion speed: 18 hours before deadline.</p>
          </div>
        )}

        {activeTab === 'study' && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <Calendar size={32} style={{ color: 'var(--color-accent-primary)', marginBottom: '8px' }} />
            <h4>Study Hour Logs</h4>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Total study log tracking is currently synchronized locally.</p>
          </div>
        )}

      </div>

    </div>
  );
};
export default AnalyticsView;
