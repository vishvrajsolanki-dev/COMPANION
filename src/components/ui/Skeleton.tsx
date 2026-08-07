import React from 'react';
import styles from './ui.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

/** Shimmer placeholder for async views. */
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 72, borderRadius }) => (
  <div
    className={styles.skeleton}
    style={{ width, height, borderRadius: borderRadius ?? 'var(--radius-card)' }}
  />
);
