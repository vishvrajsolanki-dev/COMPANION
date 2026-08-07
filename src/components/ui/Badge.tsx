import React from 'react';
import styles from './ui.module.css';

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: styles.badgeAccent,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  neutral: styles.badgeNeutral,
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

/** Small uppercase pill aligned to the Academic Core semantic-badge pattern. */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children }) => (
  <span className={[styles.badge, TONE_CLASS[tone]].join(' ')}>
    {children}
  </span>
);
