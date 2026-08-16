import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CalendarEvent } from '../../db/index';
import { useActiveSemester } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { ADIT_CALENDAR_EVENT_DEFAULTS, ADIT_SEMESTER_DEFAULT } from '../../data/aditCalendarDefaults';
import { Button, BottomSheet, EmptyState, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';

import { navigateTo } from '../../hooks/useHashLocation';

const EVENT_TYPE_META: Record<CalendarEvent['type'], { label: string; color: string }> = {
  holiday:           { label: 'Holiday',       color: 'var(--color-warning, #d97706)' },
  exam_window:       { label: 'Exam Window',   color: 'var(--error, #dc2626)' },
  college_event:     { label: 'College Event', color: 'var(--primary, #2563eb)' },
  semester_boundary: { label: 'Semester',      color: 'var(--secondary, #7c3aed)' },
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_META) as CalendarEvent['type'][];

const keyOf = (e: { date: string; title: string; type: string }) => `${e.date}|${e.title}|${e.type}`;

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { day: `${months[m - 1]} ${d}`, year: String(y) };
};

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' };

export const CalendarEventsView: React.FC = () => {
  const closeSubview = () => navigateTo('#plan/timetable');
  const activeSem = useActiveSemester();

  const events = useLiveQuery(
    () => db.calendarEvents.filter(e => !e.is_deleted).toArray()
      .then(rows => rows.sort((a, b) => a.date.localeCompare(b.date))),
    []
  ) || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState('');
  const [type, setType]         = useState<CalendarEvent['type']>('holiday');
  const [description, setDescription] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [pendingReset, setPendingReset] = useState(false);

  const openAdd = () => {
    setEditTarget(null);
    setTitle(''); setDate(''); setType('holiday'); setDescription('');
    setIsEditing(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditTarget(ev);
    setTitle(ev.title); setDate(ev.date); setType(ev.type); setDescription(ev.description || '');
    setIsEditing(true);
  };

  const [dbError, setDbError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;
    setDbError(null);

    try {
      const cleanDesc = description.trim() || undefined;

      if (editTarget) {
        await db.calendarEvents.update(editTarget.id, { title: title.trim(), date, type, description: cleanDesc });
      } else {
        await db.calendarEvents.add({
          id: `cal-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: title.trim(),
          date,
          type,
          description: cleanDesc,
          is_deleted: false,
        });
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save calendar event:', err);
      setDbError('Failed to save event. Please try again.');
    }
  };

  const requestDelete = (ev: CalendarEvent) => setPendingDelete(ev);

  const executeDelete = async () => {
    if (!pendingDelete) return;
    try {
      await db.calendarEvents.update(pendingDelete.id, { is_deleted: true });
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      setDbError('Failed to delete event.');
    }
    setPendingDelete(null);
  };

  const handleResetDefaults = async () => {
    const existing = await db.calendarEvents.toArray();
    const liveKeys = new Set(existing.filter(e => !e.is_deleted).map(keyOf));
    const deletedByKey = new Map<string, CalendarEvent>();
    existing.filter(e => e.is_deleted).forEach(e => deletedByKey.set(keyOf(e), e));

    let restored = 0;
    for (let i = 0; i < ADIT_CALENDAR_EVENT_DEFAULTS.length; i++) {
      const def = ADIT_CALENDAR_EVENT_DEFAULTS[i];
      const key = keyOf(def);
      if (liveKeys.has(key)) continue;

      const deletedMatch = deletedByKey.get(key);
      if (deletedMatch) {
        await db.calendarEvents.update(deletedMatch.id, {
          is_deleted: false,
          title: def.title, date: def.date, type: def.type, description: def.description,
        });
      } else {
        await db.calendarEvents.add({
          ...def,
          id: `cal-ev-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          is_deleted: false,
        });
      }
      restored++;
    }

    if (activeSem && activeSem.label === ADIT_SEMESTER_DEFAULT.label) {
      await db.semesters.update(activeSem.id, {
        start_date: ADIT_SEMESTER_DEFAULT.start_date,
        end_date: ADIT_SEMESTER_DEFAULT.end_date,
      });
    }

    setResetMsg(`Calendar reset to ADIT 2026-27 defaults — ${restored} default event(s) restored.`);
    setTimeout(() => setResetMsg(null), 5000);
    setPendingReset(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
      data-testid="calendar-view"
    >
      <h1 className="sr-only">Calendar Events</h1>

      {/* Header */}
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
            style={{ color: 'var(--on-surface)', flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Calendar Events</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>
              {events.length} events · {activeSem?.label || 'No active semester'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <Button size="sm" variant="subtle" onClick={() => setPendingReset(true)} title="Restore ADIT Academic Calendar">
            <RotateCcw size={14} /> Reset
          </Button>
          <Button size="sm" variant="primary" onClick={openAdd}>
            <Plus size={16} /> Add
          </Button>
        </div>
      </header>

      {resetMsg && (
        <div
          style={{
            margin: '16px 16px 0',
            padding: '12px',
            borderRadius: 'var(--radius-lg, 12px)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          ✓ {resetMsg}
        </div>
      )}

      {/* Source banner */}
      <div
        style={{
          margin: '16px 16px 0',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          fontSize: '0.8125rem',
          color: 'var(--on-surface-variant)',
          lineHeight: 1.5,
        }}
      >
        Ships with official <strong>ADIT Academic Calendar 2026-27</strong> ({ADIT_CALENDAR_EVENT_DEFAULTS.length} defaults — source: adit.ac.in). Custom events, edits, and resets supported.
      </div>

      {/* Event list */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.length === 0 && (
          <EmptyState
            title="No calendar events"
            body="Tap Add to create one, or Reset to load default calendar."
          />
        )}
        {events.map(ev => {
          const meta = EVENT_TYPE_META[ev.type] || EVENT_TYPE_META.college_event;
          const fd = fmtDate(ev.date);
          return (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'var(--surface-container-lowest)',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ width: '4px', borderRadius: '2px', backgroundColor: meta.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{fd.day} {fd.year}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: meta.color, backgroundColor: 'var(--surface-container-low)', padding: '2px 8px', borderRadius: 'var(--radius-full, 9999px)' }}>{meta.label}</span>
                </div>
                {ev.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '4px', lineHeight: 1.4 }}>{ev.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'flex-start' }}>
                <Button
                  aria-label={`Edit ${ev.title}`}
                  size="sm"
                  variant="subtle"
                  onClick={() => openEdit(ev)}
                  title="Edit"
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  aria-label={`Delete ${ev.title}`}
                  size="sm"
                  variant="danger"
                  onClick={() => requestDelete(ev)}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Sheet */}
      {isEditing && (
        <BottomSheet open onClose={() => setIsEditing(false)}>
          <form
            onSubmit={handleSave}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--on-surface)', margin: 0 }}>{editTarget ? 'Edit Event' : 'New Calendar Event'}</h3>

            <div>
              <label style={labelStyle}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Holi Vacation"
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="input"
                  style={{ marginTop: 4, minHeight: 44 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as CalendarEvent['type'])}
                  className="input"
                  style={{ marginTop: 4, minHeight: 44 }}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_TYPE_META[t].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description (optional)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. 8 days: 16 – 23 Nov 2026"
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>

            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>Save Event</Button>
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </form>
        </BottomSheet>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title ?? ''}"?`}
        message="This calendar event will be permanently removed from your calendar."
        confirmLabel="Delete Event"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingReset}
        title="Reset calendar to ADIT defaults?"
        message="Restores the official ADIT Academic Calendar 2026-27 defaults. Custom events are kept."
        confirmLabel="Reset to ADIT"
        tone="primary"
        onConfirm={handleResetDefaults}
        onCancel={() => setPendingReset(false)}
      />
    </div>
  );
};

export default CalendarEventsView;
