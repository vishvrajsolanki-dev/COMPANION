import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, EmptyState, Button, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, BookOpen, Search, CheckCircle2 } from 'lucide-react';
import { getReferenceSubjects, type ReferenceSubject } from '../../lib/referenceData';

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

import { navigateTo } from '../../hooks/useHashLocation';

export const ManageSubjectsView: React.FC = () => {
  const subjects = useSubjects() || [];
  const closeSubview = () => navigateTo('#plan/timetable');
  const activeSem = useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(), []
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);

  const [code, setCode]       = useState('');
  const [name, setName]       = useState('');
  const [credits, setCredits] = useState('4');
  const [color, setColor]     = useState(SUBJECT_COLORS[2].hex);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

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
    setColor(SUBJECT_COLORS.some(c => c.hex === sub.color) ? sub.color : SUBJECT_COLORS[0].hex);
    setDuplicateError(null);
    setTemplateMode(false);
    setTemplateQuery('');
    setIsEditing(true);
  };

  const openTemplatePicker = async () => {
    setTemplateError(null);
    setTemplateQuery('');
    setTemplates(null);
    setTemplateMode(true);
    const res = await getReferenceSubjects();
    if (res.error) {
      setTemplateError("Couldn't load college templates. Check your connection.");
      setTemplates([]);
      return;
    }
    setTemplates(res.data);
  };

  const pickTemplate = (t: ReferenceSubject) => {
    setCode(t.course_code.toUpperCase());
    setName(t.name);
    setCredits(String(t.credits || 3));
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
      data-testid="subjects-view"
    >
      <h1 className="sr-only">Manage Subjects</h1>

      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--outline-variant)',
          backgroundColor: 'var(--surface-container-lowest)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            onClick={closeSubview}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--on-surface)', border: 'none', background: 'transparent', cursor: 'pointer' }}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Manage Subjects</h2>
        </div>
        <Button size="sm" variant="primary" onClick={openAdd}>
          <Plus size={16} /> Add
        </Button>
      </header>

      {/* Subject list */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subjects.length === 0 && (
          <EmptyState title="No subjects yet" body="Tap Add to create one." />
        )}
        {subjects.map(sub => (
          <div
            key={sub.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ width: '6px', height: '44px', borderRadius: '3px', backgroundColor: sub.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: sub.color, backgroundColor: 'var(--surface-container-low)', padding: '2px 8px', borderRadius: 'var(--radius-full, 9999px)' }}>{sub.code}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{sub.credits} cr</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <Button size="sm" variant="subtle" onClick={() => openEdit(sub)} title="Edit" aria-label="Edit subject">
                <Pencil size={15} />
              </Button>
              <Button size="sm" variant="danger" onClick={() => setPendingDelete(sub)} title="Delete" aria-label="Delete subject">
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Sheet */}
      <BottomSheet open={isEditing} onClose={closeSheet}>
        {templateMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '72vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setTemplateMode(false); setTemplateQuery(''); }}
                style={{ color: 'var(--on-surface)', display: 'flex', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
                aria-label="Back to subject form"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0, flex: 1 }}>
                Choose from template
              </h3>
            </div>

            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', pointerEvents: 'none' }}
              />
              <input
                value={templateQuery}
                onChange={e => setTemplateQuery(e.target.value)}
                placeholder="Search by code or name…"
                className="input"
                style={{ paddingLeft: 34, minHeight: 44 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {templates === null ? (
                <p style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: 20, fontSize: '0.85rem' }}>Loading templates…</p>
              ) : templateError ? (
                <EmptyState icon={<AlertCircle size={24} />} title="Templates unavailable" body={templateError} />
              ) : templates.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={24} />}
                  title="No reference data yet"
                  body="Ask your admin to publish ADIT reference data."
                />
              ) : templateGroups.length === 0 ? (
                <EmptyState title="No matches" body="Try a different search term." />
              ) : (
                templateGroups.map(g => (
                  <div key={g.department} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', margin: '6px 2px' }}>
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
                          padding: '12px',
                          marginBottom: 6,
                          backgroundColor: 'var(--surface-container-lowest)',
                          borderRadius: 'var(--radius-lg, 12px)',
                          border: '1px solid var(--outline-variant)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.name}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                              {t.course_code}
                            </code>
                            <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
                              Sem {t.semester} · {t.credits} cr
                            </span>
                          </div>
                        </div>
                        <CheckCircle2 size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
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
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>{editTarget ? 'Edit Subject' : 'New Subject'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Code</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="2AI501"
                  maxLength={10}
                  required
                  className="input"
                  style={{ marginTop: 4, minHeight: 44 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Subject Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Machine Learning"
                  required
                  className="input"
                  style={{ marginTop: 4, minHeight: 44 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Credits (1–6)</label>
              <input
                type="number"
                value={credits}
                onChange={e => setCredits(e.target.value)}
                min="1"
                max="6"
                required
                className="input"
                style={{ marginTop: 4, width: '100px', minHeight: 44 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Subject Color — 8 locked tokens</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                {SUBJECT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.hex)}
                    style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: color === c.hex ? '3px solid var(--on-surface)' : '3px solid transparent',
                      outline: color === c.hex ? `2px solid ${c.hex}` : 'none',
                      outlineOffset: '2px',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {duplicateError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--error-container)',
                  color: 'var(--on-error-container)',
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
              <Button type="button" variant="subtle" onClick={openTemplatePicker}>
                <BookOpen size={16} /> Choose from college template
              </Button>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>Save Subject</Button>
              <Button type="button" variant="ghost" onClick={closeSheet}>Cancel</Button>
            </div>
          </form>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message="Existing attendance and task records linked to this subject will be preserved."
        confirmLabel="Delete Subject"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default ManageSubjectsView;
