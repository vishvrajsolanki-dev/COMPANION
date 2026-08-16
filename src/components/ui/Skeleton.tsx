import React from 'react';
import styles from './ui.module.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

/** Academic OS canonical Skeleton loading shimmer placeholder component. */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 72,
  borderRadius,
  className,
  style,
  ...rest
}) => (
  <div
    className={[styles.skeleton, className || ''].join(' ')}
    style={{
      width,
      height,
      borderRadius: borderRadius ?? 'var(--radius-card, 12px)',
      ...style,
    }}
    {...rest}
  />
);

/** Contextual skeleton loading layout for Today view */
export const TodaySkeleton: React.FC = () => (
  <div data-testid="today-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)', padding: 'var(--stack-md, 16px)' }}>
    <Skeleton height={140} borderRadius="var(--radius-xl, 16px)" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Skeleton height={68} />
      <Skeleton height={68} />
      <Skeleton height={68} />
    </div>
    <Skeleton height={96} />
    <Skeleton height={96} />
  </div>
);

/** Contextual skeleton loading layout for Plan view */
export const PlanSkeleton: React.FC = () => (
  <div data-testid="plan-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)', padding: 'var(--stack-md, 16px)' }}>
    <Skeleton height={44} borderRadius="var(--radius-full, 9999px)" />
    <Skeleton height={120} />
    <Skeleton height={80} />
    <Skeleton height={80} />
  </div>
);

/** Contextual skeleton loading layout for Study view */
export const StudySkeleton: React.FC = () => (
  <div data-testid="study-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)', padding: 'var(--stack-md, 16px)' }}>
    <Skeleton height={52} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Skeleton height={74} />
      <Skeleton height={74} />
    </div>
    <Skeleton height={110} />
    <Skeleton height={110} />
  </div>
);

/** Contextual skeleton loading layout for Account view */
export const AccountSkeleton: React.FC = () => (
  <div data-testid="account-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)', padding: 'var(--stack-md, 16px)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Skeleton width={64} height={64} borderRadius="var(--radius-full, 9999px)" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="60%" height={24} />
        <Skeleton width="40%" height={16} />
      </div>
    </div>
    <Skeleton height={48} borderRadius="var(--radius-full, 9999px)" />
    <Skeleton height={130} />
  </div>
);

export default Skeleton;
