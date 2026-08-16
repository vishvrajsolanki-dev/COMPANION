import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { saveStudentProfile } from '../../lib/accessKeys';
import { Button } from '../../components/ui';
import {
  UserRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
} from 'lucide-react';

/**
 * Milestone 9 — Onboarding View (Stitch Canonical Design)
 *
 * Part C — student identity onboarding. Shown once after the FIRST student
 * activation, before the main app. Captures name, department and enrollment
 * number and stores them on the server-side account (save_student_profile),
 * so an admin can identify who owns each key/session in the portal.
 *
 * Skippable: a student who skips stays functional — the portal just shows
 * them as unprofiled until an admin fills it in.
 *
 * The field set and submission contract are PRESERVED unchanged.
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

const labelCapStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--on-surface-variant, #444750)',
  fontFamily: 'var(--font-mono)',
  marginBottom: 6,
  display: 'block',
};

export const OnboardingView: React.FC = () => {
  const activation        = useAuthStore(s => s.activation);
  const setNeedsOnboarding = useAuthStore(s => s.setNeedsOnboarding);

  const [name,             setName]             = useState('');
  const [department,       setDepartment]       = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState<string | null>(null);
  const [saved,            setSaved]            = useState(false);

  const accountId = activation?.accountId ?? '';
  const nameOk    = name.trim().length >= 2;
  const deptOk    = department.trim().length >= 2;
  const enrollOk  = enrollmentNumber.trim().length >= 3;
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

  return (
    <div
      data-testid="onboarding-view"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--stack-md, 16px)',
        backgroundColor: 'var(--bg-page)',
        fontFamily: 'var(--font-primary)',
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
            <UserRound size={36} strokeWidth={1.5} />
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
              Welcome!
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface-variant, #444750)',
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Let's set up your student profile so your<br />faculty can identify you.
            </p>
          </div>
        </div>

        {/* ── Main card ── */}
        {saved ? (
          // ── Success state ──
          <div
            data-testid="onboarding-success"
            style={{
              backgroundColor: 'var(--surface-container-lowest, #ffffff)',
              border: '1px solid var(--outline-variant, #c4c6d1)',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={44} color="var(--success-attendance, #0f336d)" />
            <p style={{ fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', margin: 0 }}>Profile saved</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant, #444750)', margin: 0 }}>
              Opening your academic workspace…
            </p>
          </div>
        ) : (
          // ── Form state ──
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
                <School size={20} />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--on-surface, #1a1c1c)' }}>
                  Your details
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
                  Shown to your faculty &amp; admins
                </div>
              </div>
            </div>

            {/* Full name */}
            <div>
              <label htmlFor="onboard-name" style={labelCapStyle}>Full Name</label>
              <input
                id="onboard-name"
                data-testid="onboard-name"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Drashti Patel"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                style={{ minHeight: '44px' }}
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="onboard-dept" style={labelCapStyle}>Department</label>
              <input
                id="onboard-dept"
                data-testid="onboard-dept"
                className="input"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Computer Engineering"
                list="onboard-dept-suggestions"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ minHeight: '44px' }}
              />
              <datalist id="onboard-dept-suggestions">
                {ADIT_DEPARTMENTS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            {/* Enrollment number */}
            <div>
              <label htmlFor="onboard-enroll" style={labelCapStyle}>Enrollment Number</label>
              <input
                id="onboard-enroll"
                data-testid="onboard-enroll"
                className="input"
                value={enrollmentNumber}
                onChange={e => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. 2204039"
                inputMode="numeric"
                autoCorrect="off"
                spellCheck={false}
                style={{ fontFamily: 'var(--font-mono)', minHeight: '44px' }}
              />
            </div>

            {/* Error */}
            {submitError && (
              <div
                data-testid="onboard-error"
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
                {submitError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canSubmit}
              data-testid="onboard-submit"
              style={{ minHeight: 44 }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />
                  Saving…
                </>
              ) : (
                'Save & continue'
              )}
            </Button>

            {/* Skip */}
            <button
              type="button"
              data-testid="onboard-skip"
              onClick={handleSkip}
              disabled={submitting}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--on-surface-variant, #444750)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '10px 8px',
                minHeight: 44,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontFamily: 'var(--font-primary)',
              }}
            >
              Skip for now
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>
        )}

        {/* ── Trust footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
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
            <ShieldCheck size={13} /> Used only to identify your account — never shared
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
