import React from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  FolderOpen,
  BookOpen,
  Layers,
  BarChart3,
  Search,
  Inbox,
} from 'lucide-react';
import styles from './ui.module.css';

export type EmptyDomain =
  | 'timetable'
  | 'tasks'
  | 'notes'
  | 'exams'
  | 'resources'
  | 'subjects'
  | 'semester'
  | 'analytics'
  | 'search'
  | 'generic';

export interface EmptyStateProps {
  domain?: EmptyDomain;
  icon?: React.ReactNode;
  title?: string;
  body?: string;
  suggestion?: string;
  action?: React.ReactNode;
  className?: string;
}

const DOMAIN_DEFAULTS: Record<EmptyDomain, { icon: React.ReactNode; title: string; body: string; suggestion: string }> = {
  timetable: {
    icon: <Calendar size={28} />,
    title: 'No classes scheduled',
    body: 'Your timetable has no active class slots for this day or week.',
    suggestion: 'Import a CSV timetable or use the Timetable Builder to set up your schedule.',
  },
  tasks: {
    icon: <CheckSquare size={28} />,
    title: 'No pending tasks',
    body: 'You have no active assignments, homework, or study tasks logged.',
    suggestion: 'Add a new task using the input above or check back when new work is assigned.',
  },
  notes: {
    icon: <FileText size={28} />,
    title: 'No notes created',
    body: 'Your notebook is currently empty.',
    suggestion: 'Create a new markdown note to start taking lecture notes and summaries.',
  },
  exams: {
    icon: <Clock size={28} />,
    title: 'No upcoming exams',
    body: 'There are no midterms, finals, or quizzes scheduled in your manager.',
    suggestion: 'Add an upcoming exam to enable automatic countdown tracking.',
  },
  resources: {
    icon: <FolderOpen size={28} />,
    title: 'No resources uploaded',
    body: 'No reference materials or study links have been saved yet.',
    suggestion: 'Upload lecture slides, syllabus documents, or web links to access them offline.',
  },
  subjects: {
    icon: <BookOpen size={28} />,
    title: 'No subjects configured',
    body: 'Your current semester has no subjects registered.',
    suggestion: 'Add your enrolled courses to enable attendance tracking and subject stats.',
  },
  semester: {
    icon: <Layers size={28} />,
    title: 'No semester setup',
    body: 'No active academic term or semester structure has been configured.',
    suggestion: 'Define your semester start and end dates in Semester Setup.',
  },
  analytics: {
    icon: <BarChart3 size={28} />,
    title: 'Insufficient data for analytics',
    body: 'Not enough attendance or study data has been recorded yet to generate charts.',
    suggestion: 'Log attendance or complete tasks over a few days to view progress analytics.',
  },
  search: {
    icon: <Search size={28} />,
    title: 'No results found',
    body: 'No matching entries found for your query.',
    suggestion: 'Try adjusting your search terms or clearing filters.',
  },
  generic: {
    icon: <Inbox size={28} />,
    title: 'Nothing here yet',
    body: 'This section contains no records.',
    suggestion: 'Check back later or add new items to populate this view.',
  },
};

/**
 * Academic OS canonical EmptyState component.
 * Communicates: 1) What is empty, 2) Why it's empty, 3) Next action step.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  domain = 'generic',
  icon,
  title,
  body,
  suggestion,
  action,
  className,
}) => {
  const defaults   = DOMAIN_DEFAULTS[domain] || DOMAIN_DEFAULTS.generic;
  const displayIcon = icon ?? defaults.icon;
  const displayTitle = title ?? defaults.title;
  const displayBody = body ?? defaults.body;
  const displaySug  = suggestion ?? defaults.suggestion;

  return (
    <div
      data-testid={`empty-state-${domain}`}
      className={[styles.emptyState, className || ''].join(' ')}
      role="region"
      aria-label={displayTitle}
    >
      <div className={styles.emptyOrb}>
        {displayIcon}
      </div>
      <div className={styles.emptyTitle}>{displayTitle}</div>
      <div className={styles.emptyBody}>{displayBody}</div>
      {displaySug && (
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--on-surface-variant, #444750)',
            fontStyle: 'italic',
            marginTop: 4,
            maxWidth: 320,
          }}
        >
          💡 {displaySug}
        </div>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
