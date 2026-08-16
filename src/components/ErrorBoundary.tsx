import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Academic OS global ErrorBoundary component.
 * Catches unhandled React render errors and displays a calm, actionable Stitch recovery screen.
 * Ensures user local data in IndexedDB remains safe and offers immediate retry/reset.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Academic OS] Unhandled runtime error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#today';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="global-error-boundary"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--stack-lg, 32px)',
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
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--error-container, #ffdad6)',
                color: 'var(--on-error-container, #93000a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--on-surface, #1a1c1c)',
                  margin: 0,
                }}
              >
                {this.props.scope ? `${this.props.scope} stopped unexpectedly` : 'Something went wrong'}
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--on-surface-variant, #444750)',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {this.state.error?.message ||
                  'An unexpected runtime error occurred. Your local data is safely stored in IndexedDB.'}
              </p>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant, #444750)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Local data preserved · IndexedDB active
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
              <Button
                variant="primary"
                fullWidth
                onClick={this.handleReset}
                data-testid="error-boundary-retry"
              >
                <RefreshCw size={16} /> Try Again
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={this.handleGoHome}
                data-testid="error-boundary-home"
              >
                <Home size={16} /> Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
