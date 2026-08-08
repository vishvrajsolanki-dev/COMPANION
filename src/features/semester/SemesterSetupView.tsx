import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Semester } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, EmptyState, Badge, GlassButton, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Check, Pencil, Trash2, AlertCircle } from 'lucide-react';

function newId() { return `sem-${Date.now()}`; }

export const SemesterSetupView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);

  const semesters = useLiveQuery(
    () => db.semesters.filter(s => !s.is_deleted).toArray(),
    []
  ) || [];

  const [editing, setEditing] = useState<Semester | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Semester | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const openAdd = () => {
    setEditing(null);
    setLabel(''); setStartDate(''); setEndDate('');
    setFormError(null);
    setIsAdding(true);
  };

  const openEdit = (sem: Semester) => {
    setEditing(sem);
    setLabel(sem.label);
    setStartDate(sem.start_date);
    setEndDate(sem.end_date);
    setFormError(null);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate) return;
    if (endDate < startDate) { setFormError('End date must be on or after the start date.'); return; }
    setFormError(null);
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

  const confirmDelete = (sem: Semester) => {
    if (sem.is_active) { setFormError('Cannot delete the active semester.'); return; }
    setPendingDelete(sem);
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    await db.semesters.update(pendingDelete.id, { is_deleted: true });
    setPendingDelete(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Semesters</h1>
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
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Semesters</h2>
        </div>
        <GlassButton size="sm" onClick={openAdd}>
          <Plus size={16} /> New
        </GlassButton>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {semesters.length === 0 && (
          <EmptyState title="No semesters yet" body="Tap New to add one." />
        )}
        {semesters.map(sem => (
          <div
            key={sem.id}
            style={{
              padding: 'var(--space-md)',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-card)',
              border: `1px solid ${sem.is_active ? 'var(--color-primary)' : 'var(--border-hairline)'}`,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sem.label}</div>
                <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {sem.start_date} → {sem.end_date}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {sem.is_active && (
                  <Badge tone="accent">ACTIVE</Badge>
                )}
                {!sem.is_active && (
                  <button
                    onClick={() => setActive(sem)}
                    title="Set as active"
                    style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}
                  >
                    <Check size={15} />
                  </button>
                )}
                <button
                  onClick={() => openEdit(sem)}
                  title="Edit"
                  aria-label="Edit semester"
                  style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--neutral-100)', color: 'var(--text-secondary)' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => confirmDelete(sem)}
                  title="Delete"
                  aria-label="Delete semester"
                  style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Sheet */}
      <BottomSheet open={isAdding} onClose={() => setIsAdding(false)}>
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? 'Edit Semester' : 'New Semester'}</h3>

          {formError && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger-fg)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {formError}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Semester Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Semester 5 (Odd 2026)"
              required
              className="input"
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>
              Save
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.label ?? ''}"?`}
        message="This semester will be removed from the list. Slots and attendance records inside it are not deleted."
        confirmLabel="Delete Semester"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default SemesterSetupView;
