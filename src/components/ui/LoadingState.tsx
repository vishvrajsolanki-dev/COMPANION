import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './ui.module.css';

export interface LoadingStateProps {
  message?: string;
  variant?: 'page' | 'section' | 'inline';
  className?: string;
}

/** Consistent loading indicator primitive matching Stitch design system. */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading workspace data…',
  variant = 'section',
  className,
}) => {
  if (variant === 'inline') {
    return (
      <span
        data-testid="loading-state-inline"
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.85rem',
          color: 'var(--on-surface-variant, #444750)',
        }}
      >
        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span>{message}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  }

  if (variant === 'page') {
    return (
      <div
        data-testid="loading-state-page"
        role="status"
        aria-live="polite"
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 'var(--stack-lg, 32px)',
          textAlign: 'center',
        }}
        className={className}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-xl, 16px)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary, #001e4c)',
          }}
        >
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--on-surface-variant, #444750)',
            margin: 0,
            fontFamily: 'var(--font-primary)',
          }}
        >
          {message}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      data-testid="loading-state-section"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
        backgroundColor: 'var(--surface-container-lowest, #ffffff)',
        border: '1px solid var(--outline-variant, #c4c6d1)',
        borderRadius: 'var(--radius-card, 12px)',
        color: 'var(--on-surface-variant, #444750)',
      }}
      className={className}
    >
      <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary, #001e4c)' }} />
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingState;
