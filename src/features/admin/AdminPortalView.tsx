import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { GlassButton, GlassCard, EmptyState, SegmentedControl, Badge, Banner } from '../../components/ui';
import {
  generateKey, listKeys, setKeyActive, listProfiles, getAdminCredential, isMaskedCode,
  ADMIN_ERROR_MESSAGES,
  type AdminKeyRecord, type AdminProfileRecord, type AdminErrorCode, type AdminRole,
} from '../../lib/adminKeys';
import { ArrowLeft, Copy, Check, KeyRound, ShieldCheck, Users, Plus } from 'lucide-react';

type PortalTab = 'generate' | 'keys' | 'activations';

const TABS: { value: PortalTab; label: string }[] = [
  { value: 'generate', label: 'Generate' },
  { value: 'keys', label: 'Keys' },
  { value: 'activations', label: 'Activations' },
];

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
const overlineStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 'var(--text-2xs)',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const roleBadgeTone = (role: AdminRole): 'accent' | 'success' | 'neutral' =>
  role === 'owner' ? 'accent' : role === 'admin' ? 'success' : 'neutral';

const fmtDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const AdminPortalView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);
  const activation = useAuthStore(s => s.activation);

  const currentRole = activation?.role;
  const isAdmin = currentRole === 'admin' || currentRole === 'owner';
  const hasCredential = Boolean(getAdminCredential());

  const [tab, setTab] = useState<PortalTab>('generate');

  // Generate form
  const [role, setRole] = useState<AdminRole>('student');
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<AdminKeyRecord | null>(null);

  // Keys + activations
  const [keys, setKeys] = useState<AdminKeyRecord[] | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileRecord[] | null>(null);
  const [keysError, setKeysError] = useState<AdminErrorCode | null>(null);
  const [profilesError, setProfilesError] = useState<AdminErrorCode | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, p] = await Promise.all([listKeys(), listProfiles()]);
    if (k.ok) { setKeys(k.data); setKeysError(null); } else setKeysError(k.error);
    if (p.ok) { setProfiles(p.data); setProfilesError(null); } else setProfilesError(p.error);
  }, []);

  useEffect(() => {
    if (isAdmin && hasCredential) load();
  }, [isAdmin, hasCredential, load]);

  // Role options the caller may mint — owner may mint any, admin only student.
  const roleOptions: AdminRole[] = currentRole === 'owner' ? ['student', 'admin', 'owner'] : ['student'];

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* Clipboard API unavailable (HTTP, headless) — fallback to execCommand */
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* give up silently — user can long-press to copy */
      }
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setNewKey(null);

    const uses = parseInt(maxUses, 10) || 1;
    if (uses > 5) {
      const proceed = window.confirm(
        `You're about to make this key work on ${uses} devices. ` +
        'Each key is meant for one person — if you need to give access to multiple people, ' +
        'generate a separate key for each. Continue with one key across ' + uses + ' devices?',
      );
      if (!proceed) return;
    }

    setGenerating(true);
    try {
      const res = await generateKey({
        role,
        label: label.trim() || undefined,
        maxUses: uses,
        expiresAt: expiresAt ? new Date(expiresAt + 'T00:00:00').toISOString() : null,
      });
      if (res.ok) {
        setNewKey(res.data);
        setLabel('');
        setMaxUses('1');
        setExpiresAt('');
        load(); // refresh the keys list
      } else {
        setGenError(ADMIN_ERROR_MESSAGES[res.error]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (key: AdminKeyRecord) => {
    setTogglingId(key.id);
    try {
      const res = await setKeyActive(key.id, !key.is_active);
      if (!res.ok) {
        setKeysError(res.error);
        return;
      }
      setKeysError(null);
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  // ── Authorization guard ────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-md)', paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-page)' }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }}><ArrowLeft size={24} /></button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Admin Portal</h2>
        </header>
        <div style={{ padding: 'var(--space-lg)' }}>
          <EmptyState
            icon={<ShieldCheck size={30} />}
            title="No admin access"
            body="The key on this device isn't an admin or owner key."
          />
        </div>
      </div>
    );
  }

  if (!hasCredential) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-md)', paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-page)' }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }}><ArrowLeft size={24} /></button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Admin Portal</h2>
        </header>
        <div style={{ padding: 'var(--space-lg)' }}>
          <EmptyState
            icon={<KeyRound size={30} />}
            title="Sign out and re-activate"
            body="This device was activated before admin support shipped. Sign out from Profile, then re-enter your key once to enable the admin portal."
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-md)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-page)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }}><ArrowLeft size={24} /></button>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Admin Portal</h2>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Access-key distribution</div>
          </div>
        </div>
        <Badge tone={roleBadgeTone(currentRole!)}>{currentRole}</Badge>
      </header>

      {/* Segmented control */}
      <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>

      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* ══════════════ GENERATE ══════════════ */}
        {tab === 'generate' && (
          <>
            {genError && (
              <Banner tone="danger" title={genError} />
            )}

            {newKey && (
              <GlassCard variant="accent">
                <div style={overlineStyle}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary)', flexShrink: 0 }} />
                  New key — share it now
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '6px 0 10px' }}>
                  This is the only time the full code is shown. Share it with your classmate.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 'var(--radius-card)',
                    backgroundColor: 'var(--neutral-100)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <code style={{ flex: 1, fontFamily: 'var(--font-family-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.04em' }}>
                    {newKey.code}
                  </code>
                  <GlassButton variant="ghost" size="sm" onClick={() => copyCode(newKey.code)}>
                    {copiedCode === newKey.code ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode === newKey.code ? 'Copied' : 'Copy'}
                  </GlassButton>
                </div>
              </GlassCard>
            )}

            <GlassCard>
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value as AdminRole); setNewKey(null); }}
                    className="input"
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Label (recipient name)</label>
                  <input
                    value={label}
                    onChange={e => { setLabel(e.target.value); setNewKey(null); }}
                    placeholder="e.g. Meet Patel"
                    className="input"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Devices for this person (not for sharing with others)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    className="input"
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    Each key is meant for one person. If you need to give access to multiple people, generate a separate key for each.
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Expires (optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="input"
                  />
                </div>

                <GlassButton type="submit" variant="primary" size="lg" fullWidth disabled={generating}>
                  <Plus size={16} /> {generating ? 'Generating…' : 'Generate access key'}
                </GlassButton>
              </form>
            </GlassCard>
          </>
        )}

        {/* ══════════════ KEYS ══════════════ */}
        {tab === 'keys' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {keysError && (
              <Banner tone="danger" title={ADMIN_ERROR_MESSAGES[keysError]} />
            )}

            {keys === null ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: '0.85rem' }}>Loading keys…</p>
            ) : keys.length === 0 ? (
              <EmptyState icon={<KeyRound size={28} />} title="No keys yet" body="Generate the first access key on the Generate tab." />
            ) : (
              keys.map(k => (
                <div
                  key={k.id}
                  style={{
                    opacity: k.is_active ? 1 : 0.55,
                    padding: 'var(--space-md)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-hairline)',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Badge tone={roleBadgeTone(k.role)}>{k.role}</Badge>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.label || '—'}
                      </span>
                    </div>
                    <GlassButton
                      variant={k.is_active ? 'ghost' : 'success'}
                      size="sm"
                      disabled={togglingId === k.id}
                      onClick={() => handleToggle(k)}
                    >
                      {k.is_active ? 'Deactivate' : 'Reactivate'}
                    </GlassButton>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
                      {k.code}
                    </code>
                    {isMaskedCode(k.code) ? (
                      <Badge tone="neutral">masked</Badge>
                    ) : (
                      <button
                        onClick={() => copyCode(k.code)}
                        title="Copy code"
                        style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
                      >
                        {copiedCode === k.code ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <span>
                      used {k.used_count}/{k.max_uses}
                    </span>
                    <span>
                      {k.expires_at ? `expires ${fmtDate(k.expires_at)}` : 'no expiry'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════ ACTIVATIONS ══════════════ */}
        {tab === 'activations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profilesError && (
              <Banner tone="danger" title={ADMIN_ERROR_MESSAGES[profilesError]} />
            )}

            {profiles === null ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: '0.85rem' }}>Loading activations…</p>
            ) : profiles.length === 0 ? (
              <EmptyState icon={<Users size={28} />} title="No activations yet" body="When someone redeems a key, they'll show up here." />
            ) : (
              profiles.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: 'var(--space-md)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-hairline)',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: 'var(--bg-card-tint)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {p.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || 'Unnamed'}
                      </span>
                      <Badge tone={roleBadgeTone(p.role)}>{p.role}</Badge>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.key_label ? `via ${p.key_label}` : 'via access key'} · {fmtDate(p.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortalView;
