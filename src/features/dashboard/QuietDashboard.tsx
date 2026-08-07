import React, { useState, useEffect } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useTasks } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { useProfileStore, profileFirstName } from '../../store/profileStore';
import { todayISO, isToday, nowMinutes, timePart, datePart, formatHeaderDate } from '../../utils/date';
import styles from './QuietDashboard.module.css';
import { StatTile } from '../../components/ui';
import {
  AlertTriangle, Clock, MapPin, CheckCircle, ArrowRight,
  BookOpen, BarChart2, Award, Calendar
} from 'lucide-react';

export const QuietDashboard: React.FC = () => {
  const { overall } = useAttendanceMath();
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const tasks = useTasks() || [];

  const navigateToSubview = useUIStore(state => state.navigateToSubview);
  const setActiveTab = useUIStore(state => state.setActiveTab);

  // Real-time clock — ticks every minute so the "Starts at HH:MM" label stays live
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Real-date engine — no simulated "Aug 5 2026" hardcoding anymore
  const profile = useProfileStore(s => s.profile);
  const firstName = profileFirstName(profile);
  const now = currentTime;

  // Format date header from the actual clock
  const dateStr = formatHeaderDate(now);

  // Slots for the real current date
  const todaySlots = lectureSlots
    .filter(slot => {
      if (slot.is_deleted) return false;
      return isToday(slot.start_time, now);
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // When the seeded semester has no class on today's real date (demo data is
  // anchored to the ADIT ODD 2026 semester), fall back to the nearest upcoming
  // slot so the hero card is never dead.
  const upcomingSlots = lectureSlots
    .filter(s => !s.is_deleted)
    .filter(s => datePart(s.start_time) >= todayISO())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const fallbackSlot = todaySlots.length > 0 ? null : upcomingSlots[0] || null;
  const isFallback = !!fallbackSlot;

  // Next lecture today (start time after the real current time)
  const candidates = isFallback ? [fallbackSlot] : todaySlots;
  const nextSlot = candidates.find(
    slot => slot && timePart(slot.start_time) > nowMinutes() && slot.status !== 'cancelled'
  ) || null;

  const nextSubject = nextSlot ? subjects.find(s => s.id === nextSlot.subject_id) : null;

  // Compute countdown display if next class exists
  let countdownText = '';
  if (nextSlot) {
    countdownText = `Starts at ${timePart(nextSlot.start_time)}`;
  }

  // Time-of-day greeting
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
        <h1 className={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ''}</h1>
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
            <span className={styles.heroTag}>{isFallback ? 'Next Up' : 'Next Class Today'}</span>
            {countdownText && (
              <span className={styles.countdownBadge}>{countdownText}</span>
            )}
          </div>
          <h3 className={styles.heroTitle}>{nextSubject.name}</h3>
          <div className={styles.heroMeta}>
            <span
              className={styles.subjectPill}
              style={{ backgroundColor: `${nextSubject.color}20`, color: nextSubject.color }}
            >
              {nextSubject.code}
            </span>
            <span className={styles.heroMetaItem}>
              <Clock size={14} />
              {isFallback ? `${datePart(nextSlot.start_time).slice(5)} · ` : ''}
              {timePart(nextSlot.start_time)} - {timePart(nextSlot.end_time)}
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
          <BookOpen size={20} className={styles.quickLinkIcon} style={{ color: 'var(--color-accent-secondary)' }} />
          <span className={styles.quickLinkLabel}>Study Notes</span>
        </button>

        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('exams')}>
          <Calendar size={20} className={styles.quickLinkIcon} style={{ color: 'var(--color-accent-tertiary)' }} />
          <span className={styles.quickLinkLabel}>Exams & Quizzes</span>
        </button>

        <button className={styles.quickLinkCard} onClick={() => navigateToSubview('analytics')}>
          <BarChart2 size={20} className={styles.quickLinkIcon} style={{ color: 'var(--color-success)' }} />
          <span className={styles.quickLinkLabel}>Performance</span>
        </button>
      </div>

      {/* Metric tiles */}
      <div className={styles.statRow}>
        <StatTile value={todaySlots.length} label="Classes Today" />
        <StatTile value={activeTasks.length} label="Active Tasks" />
        <StatTile
          value={`${Math.round(overall.overallPercentage)}%`}
          label="Attendance"
          valueColor={overall.isAnyAtRisk ? 'var(--color-danger)' : 'var(--color-success)'}
        />
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
          <h3 className={styles.overline}>Tasks Due Soon</h3>
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
          <h3 className={styles.overline}>Today's Schedule</h3>
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
                      {isCancelled && <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelled</span>}
                      {isRescheduled && <span className={`${styles.badge} ${styles.badgeRescheduled}`}>Rescheduled</span>}
                      {isExtra && <span className={`${styles.badge} ${styles.badgeExtra}`}>Extra Class</span>}
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
