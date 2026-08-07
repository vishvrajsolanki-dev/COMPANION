import React from 'react';
import styles from './ui.module.css';

interface ProgressRingProps {
  /** 0–100 percentage. */
  value: number;
  /** Pixel diameter of the SVG viewBox (default 64). */
  size?: number;
  /** Ring stroke width in px (Academic Core uses ~4–5px). */
  strokeWidth?: number;
  /** Strong ring color — defaults to primary blue; pass danger for critical. */
  color?: string;
  /** Small bold centered label, e.g. the percentage. */
  label?: string;
}

/** Circular progress ring matching the Academic Core ring pattern (rounded cap, semantic color). */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 64,
  strokeWidth = 5,
  color = 'var(--color-primary)',
  label,
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(clamped)}%`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--neutral-200, #E2E8F0)"
        strokeWidth={strokeWidth}
        className={styles.ringTrack}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className={styles.ringFill}
      />
      {label !== undefined && (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.28}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {label}
        </text>
      )}
    </svg>
  );
};
