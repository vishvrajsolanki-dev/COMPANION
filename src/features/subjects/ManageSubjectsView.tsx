import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, EmptyState, GlassButton } from '../../components/ui';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

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

  const openAdd = () => {
    setEditTarget(null);
    setCode(''); setName(''); setCredits('4'); setColor(SUBJECT_COLORS[2].hex);
    setIsEditing(true);
  };

  const openEdit = (sub: Subject) => {
    setEditTarget(sub);
    setCode(sub.code); setName(sub.name); setCredits(String(sub.credits));
    // If stored color is outside the locked palette, default to first color
    setColor(SUBJECT_COLORS.some(c => c.hex === sub.color) ? sub.color : SUBJECT_COLORS[0].hex);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const creditsNum = Math.max(1, Math.min(6, parseInt(credits, 10) || 3));

    if (editTarget) {
      await db.subjects.update(editTarget.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        credits: creditsNum,
        color,
      });
    } else {
      await db.subjects.add({
        id: `sub-${Date.now()}`,
        semester_id: activeSem?.id || 'sem-5',
        code: code.trim().toUpperCase(),
        name: name.trim(),
        credits: creditsNum,
        color,
        is_deleted: false,
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async (sub: Subject) => {
    if (!confirm(`Delete "${sub.name}"?\n\nExisting attendance and task records linked to this subject will be preserved but the subject will no longer appear in pickers.`)) return;
    await db.subjects.update(sub.id, { is_deleted: true });
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
              <button onClick={() => handleDelete(sub)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }} title="Delete" aria-label="Delete subject">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit bottom sheet */}
      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)}>
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

          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>Save Subject</GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</GlassButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};

export default ManageSubjectsView;
