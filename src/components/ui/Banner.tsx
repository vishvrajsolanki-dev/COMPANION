import React from 'react';
import styles from './ui.module.css';

export type BannerTone = 'danger' | 'warning' | 'info' | 'success';

const TONE_CLASS: Record<BannerTone, string> = {
  danger: styles.bannerDanger,
  warning: styles.bannerWarning,
  info: styles.bannerInfo,
  success: styles.bannerSuccess,
};

interface BannerProps {
  tone?: BannerTone;
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/** Soft-tinted alert/info banner per the Academic Core alert-banner pattern. */
export const Banner: React.FC<BannerProps> = ({ tone = 'info', title, children, icon, action }) => (
  <div className={[styles.banner, TONE_CLASS[tone]].join(' ')}>
    {icon && <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={styles.bannerTitle}>{title}</div>
      {children && <div className={styles.bannerBody}>{children}</div>}
    </div>
    {action}
  </div>
);
