import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Semester } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, Plus, Check, Pencil, Trash2 } from 'lucide-react';

function newId() { return `sem-${Date.now()}`; }

export const SemesterSetupView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);

  const semesters = useLiveQuery(
    () => db.semesters.filter(s => !s.is_deleted).toArray(),
    []
  ) || [];

  const [editing, setEditing] = useState<Semester | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const openAdd = () => {
    setEditing(null);
    setLabel(''); setStartDate(''); setEndDate('');
    setIsAdding(true);
  };

  const openEdit = (sem: Semester) => {
    setEditing(sem);
    setLabel(sem.label);
    setStartDate(sem.start_date);
    setEndDate(sem.end_date);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate) return;
    if (editing) {
      await db.semesters.update(editing.id, { label: label.trim(), start_date: startDate, end_date: endDate });
    } else {
      await db.semesters.add({ id: newId(), label: label.trim(), start_date: startDate, end_date: endDate, is_active: false, is_deleted: false });
    }
    setIsAdding(false);
  };

  const setActive = async (sem: Semester) => {
    // Deactivate all, then activate chosen
    const all = await db.semesters.filter(s => !s.is_deleted).toArray();
    await Promise.all(all.map(s => db.semesters.update(s.id, { is_active: false })));
    await db.semesters.update(sem.id, { is_active: true });
  };

  const deleteSemester = async (sem: Semester) => {
    if (sem.is_active) { alert('Cannot delete the active semester.'); return; }
    if (!confirm(`Delete "${sem.label}"? This won't delete slots/records inside it.`)) return;
    await db.semesters.update(sem.id, { is_deleted: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview}><ArrowLeft size={24} /></button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Semesters</h2>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', padding: '8px 12px', borderRadius: 'var(--radius-chip)', fontWeight: 600, fontSize: '0.85rem' }}>
          <Plus size={16} /> New
        </button>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {semesters.length === 0 && (
          <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '40px 0' }}>No semesters yet — tap New to add one.</p>
        )}
        {semesters.map(sem => (
          <div key={sem.id} style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: `1px solid ${sem.is_active ? 'var(--color-accent-primary)' : 'var(--color-border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sem.label}</div>
                <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {sem.start_date} → {sem.end_date}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {sem.is_active && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', padding: '2px 8px', borderRadius: '10px' }}>ACTIVE</span>
                )}
                {!sem.is_active && (
                  <button onClick={() => setActive(sem)} title="Set as active" style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-success)' }}>
                    <Check size={15} />
                  </button>
                )}
                <button onClick={() => openEdit(sem)} style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteSemester(sem)} style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-danger)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Sheet */}
      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setIsAdding(false)}>
          <form onSubmit={handleSave} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-bg-primary)', borderTopLeftRadius: 'var(--radius-sheet)', borderTopRightRadius: 'var(--radius-sheet)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>{editing ? 'Edit Semester' : 'New Semester'}</h3>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Semester 5 (Odd 2026)" required style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ ...inputStyle, marginTop: '4px' }} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required style={{ ...inputStyle, marginTop: '4px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" onClick={() => setIsAdding(false)} style={ghostBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.95rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' };
const primaryBtn: React.CSSProperties = { flex: 1, padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', fontWeight: 600 };
const ghostBtn: React.CSSProperties = { padding: '12px 20px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, color: 'var(--color-text-primary)' };

export default SemesterSetupView;
