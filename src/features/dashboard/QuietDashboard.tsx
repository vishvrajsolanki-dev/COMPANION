import React, { useState, useEffect } from 'react';
import { useAttendanceMath } from '../../hooks/useAttendanceMath';
import { useSubjects, useLectureSlots, useTasks } from '../../db/useDatabase';
import { useUIStore, SubviewType } from '../../store/uiStore';
import { useProfileStore, profileFirstName } from '../../store/profileStore';
import { todayISO, isToday, nowMinutes, timePart, datePart, formatHeaderDate } from '../../utils/date';
import styles from './QuietDashboard.module.css';
import { StatTile, Card, Badge, Banner } from '../../components/ui';
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

  // Real-time clock — ticks every minute so the countdown & greeting stay live
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const profile = useProfileStore(s => s.profile);
  const firstName = profileFirstName(profile);
  const now = currentTime;

  // Format date header
  const dateStr = formatHeaderDate(now);

  // Slots for current date
  const todaySlots = lectureSlots
    .filter(slot => {
      if (slot.is_deleted) return false;
      return isToday(slot.start_time, now);
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Fallback slot if today has no slots scheduled
  const upcomingSlots = lectureSlots
    .filter(s => !s.is_deleted && s.status !== 'cancelled')
    .filter(s => datePart(s.start_time) >= todayISO())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const fallbackSlot = todaySlots.length > 0 ? null : upcomingSlots[0] || null;
  const isFallback = !!fallbackSlot;

  // Next lecture resolution
  const nextSlot = isFallback
    ? fallbackSlot
    : todaySlots.find(slot => slot.status !== 'cancelled' && timePart(slot.start_time) > nowMinutes()) || null;

  const nextSubject = nextSlot ? subjects.find(s => s.id === nextSlot.subject_id) : null;

  let countdownText = '';
  if (nextSlot) {
    countdownText = `Starts at ${timePart(nextSlot.start_time)}`;
  }

  // Greeting by hour
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Tasks due soon
  const activeTasks = tasks
    .filter(t => t.status !== 'completed' && !t.is_deleted)
    .sort((a, b) => (a.due_at || '').localeCompare(b.due_at || ''))
    .slice(0, 3);

  // SVG progress ring math
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(100, Math.max(0, overall.overallPercentage || 0));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className={styles.container} data-testid="today-view">
      {/* Header Greeting */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className={styles.dateSubtitle}>{dateStr}</p>
      </header>

      {/* Setup Guide Banner — shown only on fresh account */}
      {subjects.length === 0 && (
        <Card variant="surface-low" className={styles.setupCard}>
          <div className={styles.setupHeader}>Get started in 4 steps</div>
          <div className={styles.setupList}>
            {[
              { label: 'Set up your semester', sub: 'Dates & active term', go: 'semester-setup' as SubviewType },
              { label: 'Add your subjects', sub: 'Course codes & credits', go: 'manage-subjects' as SubviewType },
              { label: 'Build your timetable', sub: 'Weekly patterns → slots', go: 'timetable-builder' as SubviewType },
              { label: 'Mark attendance', sub: 'After each lecture', go: 'attendance' as SubviewType },
            ].map((step, i) => (
              <button
                key={step.go}
                onClick={() => navigateToSubview(step.go)}
                className={styles.setupStepBtn}
              >
                <span className={styles.setupStepBadge}>{i + 1}</span>
                <span className={styles.setupStepText}>
                  <span className={styles.setupStepTitle}>{step.label}</span>
                  <span className={styles.setupStepSub}>{step.sub}</span>
                </span>
                <ArrowRight size={14} className={styles.setupStepArrow} />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance Risk Alert Banner */}
      {overall.isAnyAtRisk && (
        <div
          className={styles.alertBanner}
          onClick={() => navigateToSubview('attendance')}
          role="button"
          tabIndex={0}
          aria-label="Attendance Alert: view details"
        >
          <AlertTriangle size={20} className={styles.alertIcon} />
          <div className={styles.alertText}>
            Attendance Alert: {overall.atRiskSubjectIds.length} subject(s) below 75% threshold.
          </div>
          <ArrowRight size={16} className={styles.alertArrow} />
        </div>
      )}

      {/* Hero Next Lecture Card */}
      {nextSlot && nextSubject ? (
        <div className={`${styles.heroCard} ${styles.heroAccent}`}>
          <div className={styles.heroTop}>
            <span className={styles.heroTag}>{isFallback ? 'NEXT UP' : 'NEXT CLASS TODAY'}</span>
            {countdownText && (
              <span className={styles.countdownBadge}>{countdownText}</span>
            )}
          </div>
          <h2 className={styles.heroTitle}>{nextSubject.name}</h2>
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
            <span className={styles.heroTag}>SCHEDULE STATUS</span>
          </div>
          <h2 className={styles.heroTitle}>No more classes today</h2>
          <p className={styles.dateSubtitle}>All scheduled sessions completed.</p>
        </div>
      )}

      {/* Quick Access Grid */}
      <section className={styles.quickGrid} aria-label="Quick Navigation">
        <button
          className={styles.quickCard}
          onClick={() => navigateToSubview('attendance')}
          aria-label="Attendance"
        >
          <div className={styles.quickIconTile}>
            <Award size={20} />
          </div>
          <span className={styles.quickLabel}>Attendance</span>
        </button>

        <button
          className={styles.quickCard}
          onClick={() => navigateToSubview('notes')}
          aria-label="Study Notes"
        >
          <div className={styles.quickIconTile}>
            <BookOpen size={20} />
          </div>
          <span className={styles.quickLabel}>Study Notes</span>
        </button>

        <button
          className={styles.quickCard}
          onClick={() => navigateToSubview('exams')}
          aria-label="Exams & Quizzes"
        >
          <div className={styles.quickIconTile}>
            <Calendar size={20} />
          </div>
          <span className={styles.quickLabel}>Exams & Quizzes</span>
        </button>

        <button
          className={styles.quickCard}
          onClick={() => navigateToSubview('analytics')}
          aria-label="Performance"
        >
          <div className={styles.quickIconTile}>
            <BarChart2 size={20} />
          </div>
          <span className={styles.quickLabel}>Performance</span>
        </button>
      </section>

      {/* Metric Tiles Row */}
      <section className={styles.statRow} aria-label="Daily Metrics">
        <StatTile value={todaySlots.length} label="Classes Today" />
        <StatTile value={activeTasks.length} label="Active Tasks" />
        <StatTile
          value={`${Math.round(overall.overallPercentage)}%`}
          label="Attendance"
          valueColor={overall.isAnyAtRisk ? 'var(--error)' : 'var(--primary)'}
        />
      </section>

      {/* Attendance Ring and Summary Card */}
      <div
        className={styles.attendanceCard}
        onClick={() => navigateToSubview('attendance')}
        role="button"
        tabIndex={0}
        aria-label="Attendance Summary"
      >
        <div className={styles.ringWrapper}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="transparent"
              stroke="var(--surface-container-high)"
              strokeWidth="4.5"
            />
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="transparent"
              stroke={overall.isAnyAtRisk ? 'var(--error)' : 'var(--primary)'}
              strokeWidth="4.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span className={styles.ringPercentage}>
            {Math.round(overall.overallPercentage)}%
          </span>
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
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.overline}>TASKS DUE SOON</h3>
          <button
            className={styles.viewAllBtn}
            onClick={() => setActiveTab('tasks')}
            aria-label="View All Tasks"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>

        {activeTasks.length === 0 ? (
          <div className={styles.emptyCard}>
            <CheckCircle size={16} className={styles.emptyIconSuccess} />
            <span>All tasks completed!</span>
          </div>
        ) : (
          <div className={styles.stackList}>
            {activeTasks.map(t => {
              const sub = subjects.find(s => s.id === t.subject_id);
              return (
                <div
                  key={t.id}
                  className={styles.taskCard}
                  onClick={() => setActiveTab('tasks')}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className={styles.priorityDot}
                    style={{
                      backgroundColor:
                        t.priority === 'urgent' || t.priority === 'high'
                          ? 'var(--error)'
                          : t.priority === 'medium'
                          ? 'var(--secondary)'
                          : 'var(--on-surface-variant)',
                    }}
                  />
                  <div className={styles.taskContent}>
                    <div className={styles.taskTitle}>{t.title}</div>
                    {sub && (
                      <span className={styles.taskSubjectCode} style={{ color: sub.color }}>
                        {sub.code}
                      </span>
                    )}
                  </div>
                  <span className={styles.taskDueText}>
                    {t.due_at
                      ? new Date(t.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'No date'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's Schedule Timeline Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.overline}>TODAY'S SCHEDULE</h3>
          <button
            className={styles.viewAllBtn}
            onClick={() => setActiveTab('schedule')}
            aria-label="View Timetable"
          >
            Timetable <ArrowRight size={14} />
          </button>
        </div>

        {todaySlots.length === 0 ? (
          <div className={styles.emptyCard}>
            <span>No lectures scheduled today.</span>
          </div>
        ) : (
          <div className={styles.stackList}>
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
                      <span
                        className={styles.timelineSubjectCode}
                        style={{ backgroundColor: `${sub.color}15`, color: sub.color }}
                      >
                        {sub.code}
                      </span>
                      <span className={styles.timelineTime}>
                        {timePart(slot.start_time)} - {timePart(slot.end_time)}
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
                      {isCancelled && <Badge tone="danger">Cancelled</Badge>}
                      {isRescheduled && <Badge tone="warning">Rescheduled</Badge>}
                      {isExtra && <Badge tone="info">Extra Class</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default QuietDashboard;
