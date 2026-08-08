import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { saveStudentProfile } from '../../lib/accessKeys';
import { GlassButton } from '../../components/ui';
import {
  UserRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
} from 'lucide-react';

/**
 * Part C — student identity onboarding. Shown once after the FIRST student
 * activation, before the main app. Captures name, department and enrollment
 * number and stores them on the server-side account (`save_student_profile`),
 * so an admin can identify who owns each key/session in the portal.
 *
 * Skippable: a student who skips stays functional — the portal just shows them
 * as unprofiled until an admin fills it in.
 */
const ADIT_DEPARTMENTS = [
  'AI (Artificial Intelligence & Data Science)',
  'Computer Engineering',
  'Computer Science & Design',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
];

export const OnboardingView: React.FC = () => {
  const activation = useAuthStore(s => s.activation);
  const setNeedsOnboarding = useAuthStore(s => s.setNeedsOnboarding);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const accountId = activation?.accountId ?? '';
  const nameOk = name.trim().length >= 2;
  const deptOk = department.trim().length >= 2;
  const enrollOk = enrollmentNumber.trim().length >= 3;
  const canSubmit = nameOk && deptOk && enrollOk && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saved) return;
    setSubmitting(true);
    setSubmitError(null);

    const ok = await saveStudentProfile(
      accountId,
      name.trim(),
      department.trim(),
      enrollmentNumber.trim(),
    );

    setSubmitting(false);

    if (!ok) {
      setSubmitError(
        "Couldn't reach the server to save your details. Check your connection and try again — or skip and add them later.",
      );
      return;
    }

    setSaved(true);
    // Slight delay so the success state is visible, then enter the app.
    setTimeout(() => setNeedsOnboarding(false), 700);
  };

  const handleSkip = () => {
    if (submitting) return;
    setNeedsOnboarding(false);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-lg)',
        background: 'var(--bg-page)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Logo mark + pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-card)',
              background: 'var(--bg-card-tint)',
              color: 'var(--color-primary)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <UserRound size={34} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Welcome!</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Let's set up your student profile so your faculty can identify you.
            </p>
          </div>
        </div>

        {saved ? (
          <div
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={40} color="var(--color-success)" />
            <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Profile saved</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Opening your academic workspace…
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-card)',
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
                  background: 'var(--bg-card-tint)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <School size={20} />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Your details</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Shown to your faculty &amp; admins</div>
              </div>
            </div>

            <div>
              <label htmlFor="onboard-name" style={labelStyle}>
                Full name
              </label>
              <input
                id="onboard-name"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Drashti Patel"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="onboard-dept" style={labelStyle}>
                Department
              </label>
              <input
                id="onboard-dept"
                className="input"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Computer Engineering"
                list="onboard-dept-suggestions"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id="onboard-dept-suggestions">
                {ADIT_DEPARTMENTS.map(d => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="onboard-enroll" style={labelStyle}>
                Enrollment number
              </label>
              <input
                id="onboard-enroll"
                className="input"
                value={enrollmentNumber}
                onChange={e => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. 2204039"
                inputMode="numeric"
                autoCorrect="off"
                spellCheck={false}
                style={{ fontFamily: 'var(--font-family-mono)' }}
              />
            </div>

            {submitError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {submitError}
              </div>
            )}

            <GlassButton type="submit" fullWidth size="lg" disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
                </>
              ) : (
                'Save & continue'
              )}
            </GlassButton>

            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 8,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Skip for now
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>
        )}

        {/* Trust footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Used only to identify your account — never shared
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
