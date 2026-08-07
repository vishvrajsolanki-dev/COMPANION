import React from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './ui.module.css';

interface QuickLinkProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Icon node rendered in a tinted squircle. */
  icon: React.ReactNode;
  /** Primary label. */
  label: string;
  /** Optional metadata / hint line. */
  sub?: string;
  /** Optional trailing value shown before the chevron. */
  value?: string;
  /** Optional accent color for the icon squircle. Defaults to theme accent. */
  accent?: string;
}

/** Navigation row: icon in a tinted squircle, label + sub, value + chevron. Replaces flat list rows. */
export const QuickLink: React.FC<QuickLinkProps> = ({
  icon,
  label,
  sub,
  value,
  accent,
  className,
  ...rest
}) => (
  <button className={[styles.quickLink, className || ''].join(' ')} {...rest}>
    <span
      className={styles.quickLinkIcon}
      style={{
        background: accent ? `${accent}1A` : 'var(--gradient-accent-soft)',
        color: accent || 'var(--color-accent-primary)',
      }}
    >
      {icon}
    </span>
    <span className={styles.quickLinkBody}>
      <span className={styles.quickLinkTitle}>{label}</span>
      {sub && <span className={styles.quickLinkSub}>{sub}</span>}
    </span>
    {(value || rest.onClick) && (
      <>
        {value && <span className={styles.quickLinkSub}>{value}</span>}
        <ChevronRight size={16} className={styles.quickLinkChevron} />
      </>
    )}
  </button>
);
