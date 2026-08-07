import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { GlassButton } from '../../components/ui';
import { KeyRound, ShieldCheck, WifiOff, GraduationCap, Loader2, AlertCircle } from 'lucide-react';

/**
 * Phase B gate screen. Shown only when Supabase is configured AND this device
 * has no stored activation. Once activated the key is persisted locally and the
 * app works fully offline — this screen is never seen again on that device.
 */
export const ActivationView: React.FC = () => {
  const status = useAuthStore(s => s.status);
  const error  = useAuthStore(s => s.error);
  const activate = useAuthStore(s => s.activate);
  const clearError = useAuthStore(s => s.clearError);

  const [code, setCode] = useState('');

  const normalized = code.trim();
  const isActivating = status === 'activating';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalized || isActivating) return;
    activate(normalized);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)', background: 'var(--bg-app)' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

        {/* Logo mark + pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-blob)',
              background: 'var(--gradient-accent)',
              color: 'var(--color-on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <GraduationCap size={34} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Student Academic OS</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Enter your access key to unlock your timetable, attendance &amp; study hub.
            </p>
          </div>
        </div>

        {/* Activation card */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderRadius: 'var(--radius-blob)',
            border: '1px solid transparent',
            background:
              'linear-gradient(var(--surface-glass), var(--surface-glass)) padding-box, linear-gradient(135deg, var(--gradient-accent)) border-box',
            boxShadow: 'var(--shadow-glass), var(--shadow-glow)',
            backdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
            WebkitBackdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--gradient-accent-soft)',
                color: 'var(--color-accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <KeyRound size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Activate this device</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>One key per device · works offline after activation</div>
            </div>
          </div>

          <input
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              if (error) clearError();
            }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '13px 14px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '1rem',
              letterSpacing: '0.06em',
              outline: 'none',
            }}
          />

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <GlassButton
            type="submit"
            fullWidth
            size="lg"
            disabled={!normalized || isActivating}
            style={{ opacity: !normalized && !isActivating ? 0.55 : 1 }}
          >
            {isActivating ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Activating…
              </>
            ) : (
              'Activate'
            )}
          </GlassButton>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>

        {/* Trust footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Protected by access-key activation
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <WifiOff size={13} /> Once activated, everything works offline — no account needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivationView;
