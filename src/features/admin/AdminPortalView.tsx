import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { Button, Card, EmptyState, SegmentedControl, Badge, Banner, ConfirmDialog } from '../../components/ui';
import {
  generateKey, listKeys, setKeyActive, updateKeyLimits, listProfiles, listActions, listSessions, revokeSession,
  getAdminCredential, isMaskedCode, formatAdminError,
  type AdminKeyRecord, type AdminProfileRecord, type AdminActionRecord, type AdminSessionRecord,
  type AdminRole,
} from '../../lib/adminKeys';
import { ArrowLeft, Copy, Check, KeyRound, ShieldCheck, Users, Plus, ScrollText, Upload, FileCode, Play, AlertCircle, Pencil, Smartphone, LogOut } from 'lucide-react';
import {
  upsertReferenceData, listReferenceDataSummary, formatRefError,
  type ReferenceDataSummary, type UpsertResult,
} from '../../lib/referenceData';

type PortalTab = 'generate' | 'keys' | 'activations' | 'sessions' | 'audit' | 'data';

const TABS: { value: PortalTab; label: string }[] = [
  { value: 'generate', label: 'Generate' },
  { value: 'keys', label: 'Keys' },
  { value: 'activations', label: 'Activations' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'data', label: 'Data' },
  { value: 'audit', label: 'Audit' },
];

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--on-surface-variant, #444750)',
};
const overlineStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--on-surface-variant, #444750)',
  fontFamily: 'var(--font-mono)',
};

const roleBadgeTone = (role: AdminRole): 'accent' | 'success' | 'neutral' =>
  role === 'owner' ? 'accent' : role === 'admin' ? 'success' : 'neutral';

const fmtDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

export const AdminPortalView: React.FC = () => {
  const closeSubview = () => navigateTo(CANONICAL_HASHES.account);
  const activation = useAuthStore(s => s.activation);

  const currentRole = activation?.role;
  const isAdmin = currentRole === 'admin' || currentRole === 'owner';
  const hasCredential = Boolean(getAdminCredential());

  const [tab, setTab] = useState<PortalTab>('generate');

  // Generate form
  const [role, setRole] = useState<AdminRole>('student');
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('5');
  const [expiresAt, setExpiresAt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<AdminKeyRecord | null>(null);

  // Keys + activations + sessions + audit
  const [keys, setKeys] = useState<AdminKeyRecord[] | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileRecord[] | null>(null);
  const [sessions, setSessions] = useState<AdminSessionRecord[] | null>(null);
  const [actions, setActions] = useState<AdminActionRecord[] | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [pendingHighUses, setPendingHighUses] = useState<number | null>(null);
  const [editingMaxId, setEditingMaxId]   = useState<string | null>(null);
  const [editingMaxVal, setEditingMaxVal] = useState<string>('');

  // Data tab (reference data)
  const [refSummary, setRefSummary] = useState<ReferenceDataSummary | null>(null);
  const [refSummaryError, setRefSummaryError] = useState<string | null>(null);
  const [refText, setRefText] = useState('');
  const [refParsed, setRefParsed] = useState<{ faculty: Array<{ name: string; designation?: string | null; department: string; email?: string | null }>; subjects: Array<{ course_code: string; name: string; department: string; semester: number; credits?: number; ltp?: string | null }> } | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [refUpserting, setRefUpserting] = useState(false);
  const [refResult, setRefResult] = useState<UpsertResult | null>(null);

  const isOwner = currentRole === 'owner';

  const loadSessions = useCallback(async () => {
    const s = await listSessions();
    if (s.ok) { setSessions(s.data); setSessionsError(null); } else setSessionsError(formatAdminError(s));
  }, []);

  const load = useCallback(async () => {
    const [k, p, s, a] = await Promise.all([
      listKeys(),
      listProfiles(),
      listSessions(),
      isOwner ? listActions() : Promise.resolve(null),
    ]);
    if (k.ok) { setKeys(k.data); setKeysError(null); } else setKeysError(formatAdminError(k));
    if (p.ok) { setProfiles(p.data); setProfilesError(null); } else setProfilesError(formatAdminError(p));
    if (s.ok) { setSessions(s.data); setSessionsError(null); } else setSessionsError(formatAdminError(s));
    if (a) {
      if (a.ok) { setActions(a.data); setActionsError(null); } else setActionsError(formatAdminError(a));
    }
    if (isOwner) {
      const r = await listReferenceDataSummary();
      if (r.ok) { setRefSummary(r.data); setRefSummaryError(null); } else setRefSummaryError(formatRefError(r));
    }
  }, [isOwner]);

  useEffect(() => {
    if (isAdmin && hasCredential) load();
  }, [isAdmin, hasCredential, load]);

  useEffect(() => {
    if (isAdmin && hasCredential && tab === 'sessions') loadSessions();
  }, [isAdmin, hasCredential, tab, loadSessions]);

  const roleOptions: AdminRole[] = currentRole === 'owner' ? ['student', 'admin', 'owner'] : ['student'];

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
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
        /* fallback */
      }
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setNewKey(null);

    const uses = parseInt(maxUses, 10) || 1;
    if (uses > 5) {
      setPendingHighUses(uses);
      return;
    }
    runGenerate(uses);
  };

  const runGenerate = async (uses: number) => {
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
        load();
      } else {
        setGenError(formatAdminError(res));
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
        setKeysError(formatAdminError(res));
        return;
      }
      setKeysError(null);
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateMaxUses = async (keyId: string) => {
    const val = parseInt(editingMaxVal, 10);
    if (isNaN(val) || val < 1 || val > 100) return;
    const res = await updateKeyLimits(keyId, val);
    if (!res.ok) {
      setKeysError(formatAdminError(res));
      return;
    }
    setKeysError(null);
    setEditingMaxId(null);
    await load();
  };

  const handleRevokeSession = async (session: AdminSessionRecord) => {
    setRevokingId(session.id);
    try {
      const res = await revokeSession(session.id);
      if (!res.ok) {
        setSessionsError(formatAdminError(res));
        return;
      }
      setSessionsError(null);
      await load();
    } finally {
      setRevokingId(null);
    }
  };

  const sampleRefJSON = JSON.stringify({
    source: 'https://adit.ac.in',
    scraped_at: '2026-08-08T00:00:00.000Z',
    faculty: [
      { name: 'Dr. Bhagirath Prajapati', designation: 'Associate Professor & Head', department: 'Computer Engineering', email: 'head.cp@adit.ac.in' },
      { name: 'Dr. Ishita Theba', designation: 'Assistant Professor', department: 'Computer Engineering', email: 'thebaishita@adit.ac.in' },
    ],
    subjects: [
      { course_code: '102040304', name: 'Data Structures', department: 'Computer Engineering', semester: 3, credits: 5, ltp: '4-0-2' },
      { course_code: '102040305', name: 'Database Management Systems', department: 'Computer Engineering', semester: 3, credits: 5, ltp: '4-0-2' },
    ],
  }, null, 2);

  const handleValidateRef = () => {
    setRefError(null);
    setRefParsed(null);
    setRefResult(null);
    try {
      if (!refText.trim()) throw new Error('Please paste reference JSON or load sample.');
      const data = JSON.parse(refText);
      const faculty = Array.isArray(data.faculty) ? data.faculty : [];
      const subjects = Array.isArray(data.subjects) ? data.subjects : [];
      if (faculty.length === 0 && subjects.length === 0) {
        throw new Error('Invalid JSON: Must contain a "faculty" and/or "subjects" array.');
      }
      faculty.forEach((f: any, idx: number) => {
        if (!f || typeof f.name !== 'string' || !f.name.trim()) throw new Error(`Faculty #${idx + 1} missing "name".`);
        if (typeof f.department !== 'string' || !f.department.trim()) throw new Error(`Faculty #${idx + 1} missing "department".`);
      });
      subjects.forEach((s: any, idx: number) => {
        if (!s || typeof s.name !== 'string' || !s.name.trim()) throw new Error(`Subject #${idx + 1} missing "name".`);
        if (typeof s.course_code !== 'string' || !s.course_code.trim()) throw new Error(`Subject #${idx + 1} missing "course_code".`);
        if (typeof s.department !== 'string' || !s.department.trim()) throw new Error(`Subject #${idx + 1} missing "department".`);
        if (typeof s.semester !== 'number' || !Number.isInteger(s.semester)) throw new Error(`Subject #${idx + 1} missing numeric "semester".`);
      });
      setRefParsed({ faculty, subjects });
    } catch (err: any) {
      setRefError(err.message || 'Failed to parse reference JSON.');
    }
  };

  const handleRefFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRefText((evt.target?.result as string) || '');
      setRefError(null);
      setRefParsed(null);
      setRefResult(null);
    };
    reader.readAsText(file);
  };

  const handlePublishRef = async () => {
    if (!refParsed) return;
    setRefUpserting(true);
    try {
      const res = await upsertReferenceData(refParsed.faculty, refParsed.subjects);
      if (res.ok) {
        setRefResult(res.data);
        setRefParsed(null);
        setRefText('');
        load();
      } else {
        setRefError(formatRefError(res));
      }
    } finally {
      setRefUpserting(false);
    }
  };

  const visibleTabs = isOwner ? TABS : TABS.filter(t => t.value !== 'audit' && t.value !== 'data');

  const actionLabel = (a: AdminActionRecord): string => {
    switch (a.action) {
      case 'generate_key':   return 'Generated';
      case 'deactivate_key': return 'Deactivated';
      case 'reactivate_key': return 'Reactivated';
      default:               return a.action.replace(/_/g, ' ');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="admin-portal-view">
        <h1 className="sr-only">Admin Portal</h1>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--stack-md, 16px)', paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))', borderBottom: '1px solid var(--outline-variant, #c4c6d1)', backgroundColor: 'var(--surface-container-lowest, #ffffff)' }}>
          <button onClick={closeSubview} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface, #1a1c1c)', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Admin Portal</h2>
        </header>
        <div style={{ padding: 'var(--stack-lg, 24px)' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="admin-portal-view">
        <h1 className="sr-only">Admin Portal</h1>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--stack-md, 16px)', paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))', borderBottom: '1px solid var(--outline-variant, #c4c6d1)', backgroundColor: 'var(--surface-container-lowest, #ffffff)' }}>
          <button onClick={closeSubview} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface, #1a1c1c)', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Admin Portal</h2>
        </header>
        <div style={{ padding: 'var(--stack-lg, 24px)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="admin-portal-view">
      <h1 className="sr-only">Admin Portal</h1>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--stack-md, 16px)',
          paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--outline-variant, #c4c6d1)',
          backgroundColor: 'var(--surface-container-lowest, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={closeSubview} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface, #1a1c1c)', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Admin Portal</h2>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
              Access-key distribution & governance
            </div>
          </div>
        </div>
        <Badge tone={roleBadgeTone(currentRole!)}>{currentRole}</Badge>
      </header>

      <div style={{ padding: 'var(--stack-sm, 8px) var(--stack-md, 16px)' }}>
        <SegmentedControl options={visibleTabs} value={tab} onChange={setTab} />
      </div>

      <div style={{ padding: '0 var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
        {tab === 'generate' && (
          <>
            {genError && (
              <Banner tone="danger" title={genError} />
            )}

            {newKey && (
              <Card style={{ padding: 'var(--stack-md, 16px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', border: '1px solid var(--outline-variant, #c4c6d1)' }}>
                <div style={overlineStyle}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--primary, #001e4c)', flexShrink: 0 }} />
                  New key — share it now
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant, #444750)', margin: '6px 0 10px' }}>
                  This is the only time the full code is shown. Share it with your classmate.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    backgroundColor: 'var(--surface-container-lowest, #ffffff)',
                    border: '1px solid var(--outline-variant, #c4c6d1)',
                  }}
                >
                  <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary, #001e4c)', letterSpacing: '0.04em' }}>
                    {newKey.code}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(newKey.code)}>
                    {copiedCode === newKey.code ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode === newKey.code ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Card>
            )}

            <Card style={{ padding: 'var(--stack-md, 16px)' }}>
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value as AdminRole); setNewKey(null); }}
                    className="input"
                    style={{ width: '100%', minHeight: '44px', marginTop: 4 }}
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
                    style={{ width: '100%', minHeight: '44px', marginTop: 4 }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Devices for this person</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    className="input"
                    style={{ width: '100%', minHeight: '44px', marginTop: 4 }}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant, #444750)', marginTop: 6, lineHeight: 1.5 }}>
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
                    style={{ width: '100%', minHeight: '44px', marginTop: 4 }}
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" style={{ width: '100%', minHeight: '44px' }} disabled={generating}>
                  <Plus size={16} /> {generating ? 'Generating…' : 'Generate access key'}
                </Button>
              </form>
            </Card>
          </>
        )}

        {tab === 'keys' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {keysError && (
              <Banner tone="danger" title={keysError} />
            )}

            {keys === null ? (
              <p style={{ textAlign: 'center', color: 'var(--on-surface-variant, #444750)', padding: 24, fontSize: '0.85rem' }}>Loading keys…</p>
            ) : keys.length === 0 ? (
              <EmptyState icon={<KeyRound size={28} />} title="No keys yet" body="Generate the first access key on the Generate tab." />
            ) : (
              keys.map(k => (
                <Card
                  key={k.id}
                  style={{
                    opacity: k.is_active ? 1 : 0.55,
                    padding: 'var(--stack-md, 16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Badge tone={roleBadgeTone(k.role)}>{k.role}</Badge>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.label || '—'}
                      </span>
                    </div>
                    <Button
                      variant={k.is_active ? 'ghost' : 'subtle'}
                      size="sm"
                      disabled={togglingId === k.id}
                      onClick={() => handleToggle(k)}
                    >
                      {k.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--on-surface-variant, #444750)', letterSpacing: '0.03em' }}>
                      {k.code}
                    </code>
                    {isMaskedCode(k.code) ? (
                      <Badge tone="neutral">masked</Badge>
                    ) : (
                      <button
                        onClick={() => copyCode(k.code)}
                        title="Copy code"
                        aria-label={copiedCode === k.code ? 'Copied' : 'Copy code'}
                        style={{ color: 'var(--on-surface-variant, #444750)', flexShrink: 0, display: 'flex', padding: 12, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {copiedCode === k.code ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', alignItems: 'center' }}>
                    {editingMaxId === k.id ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        used {k.used_count}/
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editingMaxVal}
                          onChange={e => setEditingMaxVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdateMaxUses(k.id); if (e.key === 'Escape') setEditingMaxId(null); }}
                          style={{ width: 48, minHeight: 32, fontSize: '0.74rem', padding: '1px 4px', border: '1px solid var(--outline-variant, #c4c6d1)', borderRadius: 4, background: 'var(--surface-container-lowest, #ffffff)', color: 'var(--on-surface, #1a1c1c)' }}
                        />
                        <button onClick={() => handleUpdateMaxUses(k.id)} aria-label="Save usage limit" style={{ color: 'var(--success-attendance, #0f336d)', display: 'flex', padding: 8, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none' }}><Check size={15} /></button>
                        <button onClick={() => setEditingMaxId(null)} aria-label="Cancel edit" style={{ color: 'var(--on-surface-variant, #444750)', display: 'flex', padding: 8, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none' }}>✕</button>
                      </span>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Edit usage limit"
                        onClick={() => { setEditingMaxId(k.id); setEditingMaxVal(String(k.max_uses)); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingMaxId(k.id); setEditingMaxVal(String(k.max_uses)); } }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 4px', margin: '-6px -4px', minHeight: 44 }}
                      >
                        used {k.used_count}/{k.max_uses}
                        <Pencil size={12} style={{ opacity: 0.6 }} />
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {k.expires_at ? `expires ${fmtDate(k.expires_at)}` : 'no expiry'}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'activations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profilesError && (
              <Banner tone="danger" title={profilesError} />
            )}

            {profiles === null ? (
              <p style={{ textAlign: 'center', color: 'var(--on-surface-variant, #444750)', padding: 24, fontSize: '0.85rem' }}>Loading activations…</p>
            ) : profiles.length === 0 ? (
              <EmptyState icon={<Users size={28} />} title="No activations yet" body="When someone redeems a key, they'll show up here." />
            ) : (
              profiles.map(p => (
                <Card
                  key={p.id}
                  style={{
                    padding: 'var(--stack-md, 16px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                      color: 'var(--primary, #001e4c)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-primary)',
                    }}
                  >
                    {p.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || 'Unnamed'}
                      </span>
                      <Badge tone={roleBadgeTone(p.role)}>{p.role}</Badge>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2 }}>
                      {p.key_label ? `via ${p.key_label}` : 'via access key'} · {fmtDate(p.created_at)}
                    </div>
                    {p.role === 'student' &&
                      (p.student_profile ? (
                        <div style={{ fontSize: '0.76rem', color: 'var(--on-surface, #1a1c1c)', marginTop: 3, fontWeight: 600 }}>
                          {[p.student_profile.name, p.student_profile.department, p.student_profile.enrollment_number]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-warning, #d97706)', marginTop: 3 }}>
                          Awaiting identity profile
                        </div>
                      ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessionsError && (
              <Banner tone="danger" title={sessionsError} />
            )}

            <p style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', lineHeight: 1.5 }}>
              {isOwner
                ? 'Active device sessions across all accounts. Revoking a session signs that device out immediately.'
                : 'Active device sessions for your account. Revoking a session signs that device out immediately.'}
            </p>

            {sessions === null ? (
              <p style={{ textAlign: 'center', color: 'var(--on-surface-variant, #444750)', padding: 24, fontSize: '0.85rem' }}>Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <EmptyState icon={<Smartphone size={28} />} title="No active sessions" body="When a device activates with a key, its session will show up here." />
            ) : (
              sessions.map(s => (
                <Card
                  key={s.id}
                  style={{
                    padding: 'var(--stack-md, 16px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                      color: 'var(--primary, #001e4c)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Smartphone size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.device_name || 'Unknown device'}
                      </span>
                      <Badge tone={roleBadgeTone(s.account_role)}>{s.account_role}</Badge>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2 }}>
                      {s.account_name || 'Unnamed account'}
                      {' · last seen '}
                      {fmtDateTime(s.last_seen)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {s.device_id}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={revokingId === s.id}
                    onClick={() => handleRevokeSession(s)}
                  >
                    <LogOut size={13} style={{ marginRight: 4 }} />
                    {revokingId === s.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
            {refSummaryError && (
              <Banner tone="warning" title={refSummaryError} />
            )}

            <Card style={{ padding: 'var(--stack-md, 16px)' }}>
              <div style={overlineStyle}>
                <span style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--primary, #001e4c)', flexShrink: 0 }} />
                Reference data — ADIT institutional
              </div>
              {refSummary ? (
                <div style={{ display: 'flex', gap: 'var(--stack-md, 16px)', marginTop: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{refSummary.faculty_count}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant, #444750)' }}>Faculty</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{refSummary.subjects_count}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant, #444750)' }}>Subjects</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant, #444750)', marginBottom: 4 }}>Departments</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {refSummary.departments.length === 0 ? (
                        <span style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)' }}>None loaded yet</span>
                      ) : (
                        refSummary.departments.map(d => <Badge key={d} tone="neutral">{d}</Badge>)
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant, #444750)', marginTop: 8 }}>
                  No summary yet. Paste faculty/subjects JSON below and publish to seed the reference tables.
                </p>
              )}
            </Card>

            {refResult && (
              <Banner tone="success" title="Reference data published">
                <div style={{ fontSize: '0.8rem' }}>
                  ✓ {refResult.faculty_inserted} faculty inserted, {refResult.faculty_updated} updated ·
                  {refResult.subjects_inserted} subjects inserted, {refResult.subjects_updated} updated
                </div>
              </Banner>
            )}

            <Card style={{ padding: 'var(--stack-md, 16px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)' }}>Scraper output JSON</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRefText(sampleRefJSON); setRefError(null); setRefParsed(null); setRefResult(null); }}
                  >
                    Load Sample JSON
                  </Button>
                  <label style={{ fontSize: '0.78rem', padding: '8px 16px', borderRadius: 'var(--radius-full, 9999px)', backgroundColor: 'var(--primary, #001e4c)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Upload size={14} /> Upload .json
                    <input type="file" accept=".json" onChange={handleRefFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', marginTop: 8, lineHeight: 1.5 }}>
                Paste the JSON produced by <code style={{ fontFamily: 'var(--font-mono)' }}>node scripts/scrape-adit.mjs</code>{' '}
                (or manually edited data) to upsert ADIT faculty and curriculum.
              </p>

              <textarea
                value={refText}
                onChange={e => { setRefText(e.target.value); setRefResult(null); }}
                placeholder='{"faculty": [...], "subjects": [...]}'
                rows={8}
                className="input"
                style={{ marginTop: 10, fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-md, 8px)', width: '100%' }}
              />

              {refError && (
                <div style={{ marginTop: 10, padding: '12px', backgroundColor: 'var(--error-container, #ffdad6)', borderRadius: 'var(--radius-md, 8px)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={18} /> {refError}
                </div>
              )}

              <Button onClick={handleValidateRef} variant="ghost" style={{ marginTop: 12, width: '100%' }}>
                <FileCode size={16} /> Validate Reference JSON
              </Button>

              {refParsed && (
                <div style={{ marginTop: 'var(--stack-md, 16px)', padding: 'var(--stack-md, 16px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', borderRadius: 'var(--radius-md, 8px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--on-surface, #1a1c1c)' }}>
                    ✓ <strong>{refParsed.faculty.length}</strong> faculty · <strong>{refParsed.subjects.length}</strong> subjects ready to publish.
                  </div>
                  <Button onClick={handlePublishRef} disabled={refUpserting} style={{ width: '100%' }}>
                    <Play size={16} /> {refUpserting ? 'Publishing…' : 'Publish to Supabase'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actionsError && (
              <Banner tone="danger" title={actionsError} />
            )}

            {actions === null ? (
              <p style={{ textAlign: 'center', color: 'var(--on-surface-variant, #444750)', padding: 24, fontSize: '0.85rem' }}>Loading audit trail…</p>
            ) : actions.length === 0 ? (
              <EmptyState icon={<ScrollText size={28} />} title="No actions yet" body="Key generations and deactivations will be logged here." />
            ) : (
              actions.map(a => (
                <Card
                  key={`${a.created_at}-${a.action}-${a.target_code}`}
                  style={{
                    padding: 'var(--stack-md, 16px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Badge tone={roleBadgeTone(a.actor_role)}>{a.actor_role}</Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)' }}>
                        {actionLabel(a)}
                      </span>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--on-surface-variant, #444750)' }}>
                        {a.target_code}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2 }}>
                      {fmtDate(a.created_at)}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingHighUses !== null}
        title={`Allow ${pendingHighUses ?? 0} active sessions?`}
        message={`You're about to make this key work on ${pendingHighUses ?? 0} devices. Each key is meant for one person — if you need to give access to multiple people, generate a separate key for each. Continue with one key across ${pendingHighUses ?? 0} devices?`}
        confirmLabel="Continue"
        tone="primary"
        onConfirm={() => { const uses = pendingHighUses!; setPendingHighUses(null); runGenerate(uses); }}
        onCancel={() => setPendingHighUses(null)}
      />
    </div>
  );
};

export default AdminPortalView;
