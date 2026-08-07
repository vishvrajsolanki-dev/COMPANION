import React from 'react';
import styles from './ui.module.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

/** Consistent empty state — replaces bare "No X found." text. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, body, action }) => (
  <div className={styles.emptyState}>
    {icon && <div style={{ opacity: 0.7, marginBottom: 4 }}>{icon}</div>}
    <div className={styles.emptyTitle}>{title}</div>
    {body && <div className={styles.emptyBody}>{body}</div>}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);
