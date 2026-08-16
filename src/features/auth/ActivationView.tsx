import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui';
import { KeyRound, ShieldCheck, WifiOff, GraduationCap, Loader2, AlertCircle } from 'lucide-react';

/**
 * Milestone 9 — Activation View (Stitch Canonical Design)
 *
 * Shown only when Supabase is configured AND this device has no stored
 * activation. Once activated the key is persisted locally and the app works
 * fully offline — this screen is never seen again on that device.
 *
 * Canonical Stitch references:
 *   Light: 0295d40f283d4f4d9436d8704ea0b846
 *   Dark:  898283fb491e41b3a1368cebea6e8b46
 */
export const ActivationView: React.FC = () => {
  const status     = useAuthStore(s => s.status);
  const error      = useAuthStore(s => s.error);
  const activate   = useAuthStore(s => s.activate);
  const clearError = useAuthStore(s => s.clearError);

  const [code, setCode] = useState('');

  const normalized  = code.trim();
  const isActivating = status === 'activating';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalized || isActivating) return;
    activate(normalized);
  };

  return (
    <div
      data-testid="activation-view"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--stack-md, 16px)',
        backgroundColor: 'var(--bg-page)',
        fontFamily: 'var(--font-primary)',
        paddingBottom: 'calc(var(--stack-md, 16px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--stack-lg, 32px)',
        }}
      >
        {/* ── Brand mark + headline ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-xl, 16px)',
              backgroundColor: 'var(--surface-container-lowest, #ffffff)',
              border: '1px solid var(--outline-variant, #c4c6d1)',
              color: 'var(--primary, #001e4c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={36} strokeWidth={1.5} />
          </div>

          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--on-surface, #1a1c1c)',
                fontFamily: 'var(--font-primary)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Student Academic OS
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface-variant, #444750)',
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Enter your institution access key to unlock<br />
              your timetable, attendance &amp; study hub.
            </p>
          </div>
        </div>

        {/* ── Activation card + form ── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            backgroundColor: 'var(--surface-container-lowest, #ffffff)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            borderRadius: 'var(--radius-xl, 16px)',
            padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--stack-md, 16px)',
          }}
        >
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg, 12px)',
                backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                color: 'var(--primary, #001e4c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <KeyRound size={20} />
            </span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--on-surface, #1a1c1c)',
                }}
              >
                Activate this device
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant, #444750)',
                  marginTop: 2,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.02em',
                }}
              >
                One key per person · offline after activation
              </div>
            </div>
          </div>

          {/* Key field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="activation-key"
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--on-surface-variant, #444750)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Institution Access Key
            </label>
            <input
              id="activation-key"
              data-testid="activation-key-input"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                if (error) clearError();
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              disabled={isActivating}
              className="input"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                letterSpacing: '0.06em',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Error banner */}
          {error && (
            <div
              data-testid="activation-error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--error-container, #ffdad6)',
                color: 'var(--on-error-container, #93000a)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!normalized || isActivating}
            data-testid="activation-submit"
            style={{ minHeight: 44 }}
          >
            {isActivating ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />
                Activating…
              </>
            ) : (
              'Activate'
            )}
          </Button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>

        {/* ── Trust footer ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.73rem',
              color: 'var(--on-surface-variant, #444750)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: 0,
            }}
          >
            <ShieldCheck size={13} /> Protected by institutional access-key activation
          </p>
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--on-surface-variant, #444750)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: 0,
            }}
          >
            <WifiOff size={13} /> Once activated, everything works offline — no account needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivationView;
