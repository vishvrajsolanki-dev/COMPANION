import React from 'react';
import styles from './ui.module.css';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: styles.badgeAccent,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  neutral: styles.badgeNeutral,
  info: styles.badgeInfo,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: React.ReactNode;
}

/** Academic OS canonical Badge tag component (label-caps typography). */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children, className, ...rest }) => (
  <span className={[styles.badge, TONE_CLASS[tone], className || ''].join(' ')} {...rest}>
    {children}
  </span>
);

export default Badge;
