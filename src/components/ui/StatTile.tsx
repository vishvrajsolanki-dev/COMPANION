import React from 'react';
import styles from './ui.module.css';

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Large numeric value (rendered in mono, tabular-nums). */
  value: string | number;
  /** Uppercase label under the value. */
  label: string;
  /** Optional theme-scoped color for the value (defaults to text-primary). */
  valueColor?: string;
}

/** Metric tile: white card, mono tabular value, uppercase label. */
export const StatTile: React.FC<StatTileProps> = ({
  value,
  label,
  valueColor,
  className,
  ...rest
}) => (
  <div className={[styles.statTile, className || ''].join(' ')} {...rest}>
    <div className={styles.statTileValue} style={valueColor ? { color: valueColor } : undefined}>
      {value}
    </div>
    <div className={styles.statTileLabel}>{label}</div>
  </div>
);
