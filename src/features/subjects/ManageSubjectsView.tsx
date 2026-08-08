import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, EmptyState, GlassButton, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, BookOpen, Search, CheckCircle2 } from 'lucide-react';
import { getReferenceSubjects, type ReferenceSubject } from '../../lib/referenceData';

// The 8 locked token colors — no free color picker allowed (design system constraint)
export const SUBJECT_COLORS = [
  { hex: '#7C3AED', label: 'Violet'  },
  { hex: '#DB2777', label: 'Pink'    },
  { hex: '#2563EB', label: 'Blue'    },
  { hex: '#0D9488', label: 'Teal'    },
  { hex: '#D97706', label: 'Amber'   },
  { hex: '#059669', label: 'Green'   },
  { hex: '#DC2626', label: 'Red'     },
  { hex: '#64748B', label: 'Slate'   },
];

export const ManageSubjectsView: React.FC = () => {
  const subjects = useSubjects() || [];
  const closeSubview = useUIStore(s => s.closeSubview);
  const activeSem = useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(), []
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);

  // Form fields
  const [code, setCode]       = useState('');
  const [name, setName]       = useState('');
  const [credits, setCredits] = useState('4');
  const [color, setColor]     = useState(SUBJECT_COLORS[2].hex); // Blue default
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  // Template picker ("choose from college template" → reference_subjects)
  const [templateMode, setTemplateMode] = useState(false);
  const [templates, setTemplates] = useState<ReferenceSubject[] | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState('');

  const closeSheet = () => {
    setIsEditing(false);
    setTemplateMode(false);
    setTemplateQuery('');
  };

  const openAdd = () => {
    setEditTarget(null);
    setCode(''); setName(''); setCredits('4'); setColor(SUBJECT_COLORS[2].hex);
    setDuplicateError(null);
    setTemplateMode(false);
    setTemplateQuery('');
    setIsEditing(true);
  };

  const openEdit = (sub: Subject) => {
    setEditTarget(sub);
    setCode(sub.code); setName(sub.name); setCredits(String(sub.credits));
    // If stored color is outside the locked palette, default to first color
    setColor(SUBJECT_COLORS.some(c => c.hex === sub.color) ? sub.color : SUBJECT_COLORS[0].hex);
    setDuplicateError(null);
    setTemplateMode(false);
    setTemplateQuery('');
    setIsEditing(true);
  };

  /** Open the reference-subject picker (queries reference_subjects via anon SELECT). */
  const openTemplatePicker = async () => {
    setTemplateError(null);
    setTemplateQuery('');
    setTemplates(null);
    setTemplateMode(true);
    const res = await getReferenceSubjects();
    if (res.error) {
      setTemplateError("Couldn't load college templates. Check your internet connection and try again.");
      setTemplates([]);
      return;
    }
    setTemplates(res.data);
  };

  /** Pre-fill the form from a chosen reference subject, then return to form mode. */
  const pickTemplate = (t: ReferenceSubject) => {
    setCode(t.course_code.toUpperCase());
    setName(t.name);
    setCredits(String(t.credits || 3));
    // Auto-assign the first color token not already in use by an active subject.
    const usedColors = new Set(subjects.filter(s => !s.is_deleted).map(s => s.color));
    const free = SUBJECT_COLORS.find(c => !usedColors.has(c.hex));
    setColor(free ? free.hex : SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length].hex);
    setDuplicateError(null);
    setTemplateMode(false);
    setTemplateQuery('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const normalizedCode = code.trim().toUpperCase();
    const creditsNum = Math.max(1, Math.min(6, parseInt(credits, 10) || 3));
    setDuplicateError(null);

    // Prevent creating a subject with a code that already exists (active only)
    const isDuplicate = await db.subjects
      .where('code')
      .equals(normalizedCode)
      .filter(s => !s.is_deleted && s.id !== editTarget?.id)
      .first();

    if (isDuplicate) {
      setDuplicateError(`A subject with code "${normalizedCode}" already exists.`);
      return;
    }

    if (editTarget) {
      await db.subjects.update(editTarget.id, {
        code: normalizedCode,
        name: name.trim(),
        credits: creditsNum,
        color,
      });
    } else {
      await db.subjects.add({
        id: `sub-${Date.now()}`,
        semester_id: activeSem?.id || 'sem-5',
        code: normalizedCode,
        name: name.trim(),
        credits: creditsNum,
        color,
        is_deleted: false,
      });
    }
    closeSheet();
  };

  // Template list filtered by the search box, grouped by department.
  const templateGroups: { department: string; items: ReferenceSubject[] }[] = (() => {
    if (!templates) return [];
    const q = templateQuery.trim().toLowerCase();
    const filtered = q
      ? templates.filter(t =>
          t.name.toLowerCase().includes(q) || t.course_code.toLowerCase().includes(q)
        )
      : templates;
    const byDept = new Map<string, ReferenceSubject[]>();
    for (const t of filtered) {
      const dept = t.department || 'Other';
      const arr = byDept.get(dept);
      if (arr) arr.push(t); else byDept.set(dept, [t]);
    }
    return [...byDept.entries()]
      .map(([department, items]) => ({ department, items }))
      .sort((a, b) => a.department.localeCompare(b.department));
  })();

  const executeDelete = async () => {
    if (!pendingDelete) return;
    await db.subjects.update(pendingDelete.id, { is_deleted: true });
    setPendingDelete(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Manage Subjects</h1>
      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-md)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-page)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button onClick={closeSubview} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }} aria-label="Go back"><ArrowLeft size={24} /></button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Manage Subjects</h2>
        </div>
        <GlassButton size="sm" onClick={openAdd}>
          <Plus size={16} /> Add
        </GlassButton>
      </header>

      {/* Subject list */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {subjects.length === 0 && (
          <EmptyState title="No subjects yet" body="Tap Add to create one." />
        )}
        {subjects.map(sub => (
          <div
            key={sub.id}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)' }}
          >
            {/* Color swatch derived from sub.color */}
            <div style={{ width: '12px', height: '48px', borderRadius: '6px', backgroundColor: sub.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.72rem', fontWeight: 700, color: sub.color, backgroundColor: `${sub.color}18`, padding: '1px 7px', borderRadius: '4px' }}>{sub.code}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.credits} cr</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => openEdit(sub)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--neutral-100)', color: 'var(--text-secondary)' }} title="Edit" aria-label="Edit subject">
                <Pencil size={15} />
              </button>
              <button onClick={() => setPendingDelete(sub)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }} title="Delete" aria-label="Delete subject">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit bottom sheet — form mode, or template picker mode */}
      <BottomSheet open={isEditing} onClose={closeSheet}>
        {templateMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '72vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setTemplateMode(false); setTemplateQuery(''); }}
                style={{ color: 'var(--text-primary)', display: 'flex', padding: 4 }}
                aria-label="Back to subject form"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                Choose from template
              </h3>
            </div>

            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                value={templateQuery}
                onChange={e => setTemplateQuery(e.target.value)}
                placeholder="Search by code or name…"
                className="input"
                style={{ paddingLeft: 34 }}
              />
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Subjects published in the college reference data (ADIT). Pick one to pre-fill the form — you can adjust the details before saving.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {templates === null ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.85rem' }}>Loading templates…</p>
              ) : templateError ? (
                <EmptyState icon={<AlertCircle size={24} />} title="Templates unavailable" body={templateError} />
              ) : templates.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={24} />}
                  title="No reference data yet"
                  body="Ask your admin to publish ADIT reference data from the Admin Portal → Data tab."
                />
              ) : templateGroups.length === 0 ? (
                <EmptyState title="No matches" body="Try a different search term." />
              ) : (
                templateGroups.map(g => (
                  <div key={g.department} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '6px 2px' }}>
                      {g.department}
                    </div>
                    {g.items.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTemplate(t)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          marginBottom: 6,
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-card)',
                          border: '1px solid var(--border-hairline)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.name}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'var(--bg-card-tint)', padding: '1px 6px', borderRadius: 4 }}>
                              {t.course_code}
                            </code>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Sem {t.semester} · {t.credits} cr{t.ltp ? ` · ${t.ltp}` : ''}
                            </span>
                          </div>
                        </div>
                        <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{editTarget ? 'Edit Subject' : 'New Subject'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="2AI501"
                maxLength={10}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Machine Learning"
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Credits (1–6)</label>
            <input
              type="number"
              value={credits}
              onChange={e => setCredits(e.target.value)}
              min="1"
              max="6"
              required
              className="input"
              style={{ marginTop: 4, width: '90px' }}
            />
          </div>

          {/* Locked 8-color palette — no free <input type="color"> anywhere */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject Color — 8 locked tokens</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              {SUBJECT_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: color === c.hex ? '3px solid var(--text-primary)' : '3px solid transparent',
                    outline: color === c.hex ? `2px solid ${c.hex}` : 'none',
                    outlineOffset: '2px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <p style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Selected: <strong style={{ color }}>{SUBJECT_COLORS.find(c => c.hex === color)?.label ?? color}</strong>
            </p>
          </div>

          {duplicateError && (
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
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {duplicateError}
            </div>
          )}

          {!editTarget && (
            <GlassButton type="button" variant="ghost" onClick={openTemplatePicker}>
              <BookOpen size={16} /> Choose from college template
            </GlassButton>
          )}

          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>Save Subject</GlassButton>
            <GlassButton type="button" variant="ghost" onClick={closeSheet}>Cancel</GlassButton>
          </div>
        </form>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message="Existing attendance and task records linked to this subject will be preserved, but the subject will no longer appear in pickers."
        confirmLabel="Delete Subject"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default ManageSubjectsView;
