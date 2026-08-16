import React from 'react';
import styles from './ui.module.css';

export type BannerTone = 'danger' | 'warning' | 'info' | 'success';

const TONE_CLASS: Record<BannerTone, string> = {
  danger: styles.bannerDanger,
  warning: styles.bannerWarning,
  info: styles.bannerInfo,
  success: styles.bannerSuccess,
};

export interface BannerProps {
  tone?: BannerTone;
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Academic OS Banner alert component for inline feedback, sync warnings, and error messages. */
export const Banner: React.FC<BannerProps> = ({
  tone = 'info',
  title,
  children,
  icon,
  action,
  className,
}) => (
  <div
    className={[styles.banner, TONE_CLASS[tone], className || ''].join(' ')}
    role="status"
    aria-live="polite"
  >
    {icon && <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={styles.bannerTitle}>{title}</div>
      {children && <div className={styles.bannerBody}>{children}</div>}
    </div>
    {action && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{action}</div>}
  </div>
);

export default Banner;
