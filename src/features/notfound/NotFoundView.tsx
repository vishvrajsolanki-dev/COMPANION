import React from 'react';
import { GraduationCap, ArrowLeft, Home, Compass } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { navigateTo } from '../../hooks/useHashLocation';

/**
 * Milestone 10 — Canonical Academic OS 404 / Not Found View
 *
 * Rendered when a user navigates to an invalid hash route or non-existent subview.
 * Provides a calm, branded Academic OS recovery experience with primary navigation
 * back to the Today view.
 */
export const NotFoundView: React.FC = () => {
  const currentHash = typeof window !== 'undefined' ? window.location.hash || '#today' : '#today';

  return (
    <div
      data-testid="not-found-view"
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
        backgroundColor: 'var(--bg-page)',
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--stack-md, 16px)',
          backgroundColor: 'var(--surface-container-lowest, #ffffff)',
          border: '1px solid var(--outline-variant, #c4c6d1)',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-xl, 16px)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            color: 'var(--primary, #001e4c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={36} strokeWidth={1.5} />
        </div>

        {/* Tag & Heading */}
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm, 4px)',
              backgroundColor: 'var(--primary-container, #1b3462)',
              color: 'var(--on-primary-container, #879dd2)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            404 — View Not Found
          </span>

          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--on-surface, #1a1c1c)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Requested view does not exist
          </h1>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--on-surface-variant, #444750)',
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            The academic view or section you requested (<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>{currentHash}</code>) is not recognized or may have been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            data-testid="not-found-today-btn"
            onClick={() => navigateTo('#today')}
          >
            <Home size={18} /> Return to Today
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            data-testid="not-found-account-btn"
            onClick={() => navigateTo('#account')}
          >
            <ArrowLeft size={16} /> Go to Account Hub
          </Button>
        </div>

        {/* Footer brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7, marginTop: 4 }}>
          <GraduationCap size={14} color="var(--primary)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
            Student Academic OS
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotFoundView;
