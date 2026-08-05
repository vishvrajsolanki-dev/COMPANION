import React, { useState, useEffect } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useTasks } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import styles from './QuietDashboard.module.css';
import { 
  AlertTriangle, Clock, MapPin, CheckCircle, ArrowRight, 
  BookOpen, BarChart2, Award, Calendar, CheckSquare 
} from 'lucide-react';

export const QuietDashboard: React.FC = () => {
  const { overall } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const tasks = useTasks() || [];

  const navigateToSubview = useUIStore(state => state.navigateToSubview);
  const setActiveTab = useUIStore(state => state.setActiveTab);

  // Time-of-day greeting & counting
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Today is Wednesday Aug 5, 2026 in our mock universe
  // We can simulate today's date based on 2026-08-05 local time
  const simulatedToday = new Date('2026-08-05T11:30:00');
  const todayDayNum = 3; // Wednesday

  // Format date header
  const dateStr = simulatedToday.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Filter slots for today (day_of_week 3 = Wednesday)
  const todaySlots = lectureSlots
    .filter(slot => {
      if (slot.is_deleted) return false;
      const slotDate = new Date(slot.start_time);
      return slotDate.getFullYear() === 2026 && 
             slotDate.getMonth() === 7 && // August (0-indexed 7)
             slotDate.getDate() === 5;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Determine next lecture today (whose start time is after current time 11:30 AM)
  const nextSlot = todaySlots.find(slot => {
    const slotTimeStr = slot.start_time.split('T')[1].substring(0, 5); // "10:30"
    return slotTimeStr > "11:30" && slot.status !== 'cancelled';
  });

  const nextSubject = nextSlot ? subjects.find(s => s.id === nextSlot.subject_id) : null;

  // Compute countdown display if next class exists
  let countdownText = '';
  if (nextSlot) {
    const slotTimeStr = nextSlot.start_time.split('T')[1].substring(0, 5); // "13:00"
    countdownText = `Starts at ${slotTimeStr}`;
  }

  // Active tasks due soon (max 2-3)
  const activeTasks = tasks
    .filter(t => t.status !== 'completed' && !t.is_deleted)
    .slice(0, 3);

  // SVG circular ring configurations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall.overallPercentage / 100) * circumference;

  return (
    <div className={styles.container}>
      {/* Header Greeting */}
      <div className={styles.header}>
        <h1 className={styles.greeting}>Good morning, Vishvraj</h1>
        <p className={styles.dateSubtitle}>{dateStr}</p>
      </div>

      {/* CONDITIONAL WARNING BANNER (Quiet Dashboard Rule: ONLY show if isAnyAtRisk is true) */}
      {overall.isAnyAtRisk && (
        <div className={styles.alertBanner} onClick={() => navigateToSubview('attendance')}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div className={styles.alertText}>
            Attendance Alert: {overall.atRiskSubjectIds.length} subject(s) below 75% threshold.
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
        </div>
      )}

      {/* Next Lecture Hero Card */}
      {nextSlot && nextSubject ? (
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <span className={styles.heroTag}>Next Class Today</span>
            {countdownText && (
              <span className={styles.countdownBadge}>{countdownText}</span>
            )}
          </div>
          <h3 className={styles.heroTitle}>{nextSubject.name}</h3>
          <div className={styles.heroMeta}>
            <span 
              style={{
                backgroundColor: `${nextSubject.color}20`,
                color: nextSubject.color,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}
            >
              {nextSubject.code}
            </span>
            <span className={styles.heroMetaItem}>
              <Clock size={14} />
              {nextSlot.start_time.split('T')[1].substring(0, 5)} - {nextSlot.end_time.split('T')[1].substring(0, 5)}
            </span>
            <span className={styles.heroMetaItem}>
              <MapPin size={14} />
              {nextSlot.room_id || 'Classroom'}
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <span className={styles.heroTag}>Schedule Status</span>
          </div>
          <h3 className={styles.heroTitle}>No more classes today</h3>
          <p className={styles.dateSubtitle}>All scheduled sessions completed.</p>
        </div>
      )}

      {/* Quick Access Grid Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('attendance')}>
          <Award size={20} className={styles.quickLinkIcon} style={{ color: 'var(--color-accent-primary)' }} />
          <span className={styles.quickLinkLabel}>Attendance</span>
        </button>

        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('notes')}>
          <BookOpen size={20} className={styles.quickLinkIcon} style={{ color: '#8B5CF6' }} />
          <span className={styles.quickLinkLabel}>Study Notes</span>
        </button>

        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('exams')}>
          <Calendar size={20} className={styles.quickLinkIcon} style={{ color: '#EC4899' }} />
          <span className={styles.quickLinkLabel}>Exams & Quizzes</span>
        </button>

        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('analytics')}>
          <BarChart2 size={20} className={styles.quickLinkIcon} style={{ color: '#10B981' }} />
          <span className={styles.quickLinkLabel}>Performance</span>
        </button>
      </div>

      {/* Attendance Ring and Summary */}
      <div className={styles.attendanceCard} onClick={() => navigateToSubview('attendance')}>
        <div className={styles.ringWrapper}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              stroke="var(--color-bg-tertiary)"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              stroke={overall.isAnyAtRisk ? 'var(--color-danger)' : 'var(--color-accent-primary)'}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span className={styles.ringPercentage}>{Math.round(overall.overallPercentage)}%</span>
        </div>

        <div className={styles.attendanceInfo}>
          <span 
            className={`${styles.attendanceStatusLabel} ${
              overall.isAnyAtRisk ? styles.labelRisk : styles.labelHealthy
            }`}
          >
            {overall.isAnyAtRisk ? 'Risk Detected' : `${Math.round(overall.overallPercentage)}% Healthy`}
          </span>
          <span className={styles.attendanceSubtext}>
            {overall.isAnyAtRisk 
              ? 'Attendance requires recovery action' 
              : 'All subjects are safely above 75% threshold'}
          </span>
        </div>
      </div>

      {/* Tasks Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Tasks Due Soon</h3>
          <button className={styles.viewAllButton} onClick={() => setActiveTab('tasks')}>
            View All <ArrowRight size={14} />
          </button>
        </div>

        {activeTasks.length === 0 ? (
          <div className={styles.emptyTaskCard}>
            <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
            <span>All tasks completed!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {activeTasks.map(t => {
              const sub = subjects.find(s => s.id === t.subject_id);
              return (
                <div key={t.id} className={styles.taskCard} onClick={() => setActiveTab('tasks')}>
                  <div 
                    className={styles.priorityDot} 
                    style={{ 
                      backgroundColor: 
                        t.priority === 'urgent' || t.priority === 'high' 
                          ? 'var(--color-danger)' 
                          : t.priority === 'medium' 
                          ? 'var(--color-warning)' 
                          : 'var(--color-text-tertiary)' 
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className={styles.taskTitle}>{t.title}</div>
                    {sub && <span className={styles.taskSubjectCode} style={{ color: sub.color }}>{sub.code}</span>}
                  </div>
                  <span className={styles.taskDueText}>
                    {new Date(t.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Timeline */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Today's Schedule</h3>
          <button className={styles.viewAllButton} onClick={() => setActiveTab('schedule')}>
            Timetable <ArrowRight size={14} />
          </button>
        </div>

        {todaySlots.length === 0 ? (
          <div className={styles.emptyTaskCard}>
            <span>No lectures scheduled today.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {todaySlots.map(slot => {
              const sub = subjects.find(s => s.id === slot.subject_id);
              if (!sub) return null;

              const isCancelled = slot.status === 'cancelled';
              const isRescheduled = slot.status === 'rescheduled';
              const isExtra = slot.status === 'extra';

              return (
                <div key={slot.id} className={styles.timelineItem}>
                  <div className={styles.timelineColorBar} style={{ backgroundColor: sub.color }} />
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineSubjectCode} style={{ backgroundColor: `${sub.color}15`, color: sub.color }}>
                        {sub.code}
                      </span>
                      <span className={styles.timelineTime}>
                        {slot.start_time.split('T')[1].substring(0, 5)} - {slot.end_time.split('T')[1].substring(0, 5)}
                      </span>
                    </div>
                    <div className={`${styles.timelineSubjectName} ${isCancelled ? styles.lineThrough : ''}`}>
                      {sub.name}
                    </div>
                    <div className={styles.timelineFooter}>
                      <span className={styles.timelineRoom}>
                        <MapPin size={12} style={{ marginRight: '4px' }} />
                        {slot.room_id || 'Classroom'}
                      </span>
                      {isCancelled && <span className={styles.badgeCancelled}>Cancelled</span>}
                      {isRescheduled && <span className={styles.badgeRescheduled}>Rescheduled</span>}
                      {isExtra && <span className={styles.badgeExtra}>Extra Class</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
