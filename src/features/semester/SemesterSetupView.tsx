import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Semester } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { BottomSheet, EmptyState, Badge, Button, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Check, Pencil, Trash2, AlertCircle } from 'lucide-react';

function newId() { return `sem-${Date.now()}`; }

import { navigateTo } from '../../hooks/useHashLocation';

export const SemesterSetupView: React.FC = () => {
  const closeSubview = () => navigateTo('#plan/timetable');

  const semesters = useLiveQuery(
    () => db.semesters.filter(s => !s.is_deleted).toArray(),
    []
  ) || [];

  const [editing, setEditing] = useState<Semester | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Semester | null>(null);

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
      data-testid="semesters-view"
    >
      <h1 className="sr-only">Semesters</h1>

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Semesters</h2>
        </div>
        <Button size="sm" variant="primary" onClick={openAdd}>
          <Plus size={16} /> New
        </Button>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {semesters.length === 0 && (
          <EmptyState title="No semesters yet" body="Tap New to add one." />
        )}
        {semesters.map(sem => (
          <div
            key={sem.id}
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: `1px solid ${sem.is_active ? 'var(--primary)' : 'var(--outline-variant)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sem.label}</div>
                <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  {sem.start_date} → {sem.end_date}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {sem.is_active && (
                  <Badge tone="accent">ACTIVE</Badge>
                )}
                {!sem.is_active && (
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setActive(sem)}
                    title="Set as active"
                  >
                    <Check size={15} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => openEdit(sem)}
                  title="Edit"
                  aria-label="Edit semester"
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => confirmDelete(sem)}
                  title="Delete"
                  aria-label="Delete semester"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={isAdding} onClose={() => setIsAdding(false)}>
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>{editing ? 'Edit Semester' : 'New Semester'}</h3>

          {formError && (
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
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {formError}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Semester Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Semester 5 (Odd 2026)"
              required
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.label ?? ''}"?`}
        message="This semester will be removed from the list."
        confirmLabel="Delete Semester"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default SemesterSetupView;
