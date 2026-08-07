import React from 'react';
import styles from './ui.module.css';

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLOR: Record<BadgeTone, string> = {
  accent: 'var(--color-accent-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-text-secondary)',
};

interface BadgeProps {
  tone?: BadgeTone;
  color?: string; // explicit hex overrides tone
  children: React.ReactNode;
}

/** Small uppercase pill. Tints itself from the tone color at ~10% alpha. */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', color, children }) => {
  const c = color || TONE_COLOR[tone];
  return (
    <span
      className={styles.badge}
      style={{ color: c, backgroundColor: `${c}1a` }}
    >
      {children}
    </span>
  );
};
