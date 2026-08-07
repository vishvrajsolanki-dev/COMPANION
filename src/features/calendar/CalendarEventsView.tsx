import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CalendarEvent } from '../../db/index';
import { useActiveSemester } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { ADIT_CALENDAR_EVENT_DEFAULTS, ADIT_SEMESTER_DEFAULT } from '../../data/aditCalendarDefaults';
import { ArrowLeft, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';

// Event-type styling pulled from the 8 locked design tokens (no free colors).
const EVENT_TYPE_META: Record<CalendarEvent['type'], { label: string; color: string }> = {
  holiday:           { label: 'Holiday',       color: '#D97706' }, // amber
  exam_window:       { label: 'Exam Window',   color: '#DC2626' }, // red
  college_event:     { label: 'College Event', color: '#2563EB' }, // blue
  semester_boundary: { label: 'Semester',      color: '#7C3AED' }, // violet
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_META) as CalendarEvent['type'][];

const keyOf = (e: { date: string; title: string; type: string }) => `${e.date}|${e.title}|${e.type}`;

// "2026-08-15" → { day: "Aug 15", year: "2026" }
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { day: `${months[m - 1]} ${d}`, year: String(y) };
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 'var(--radius-card)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)', fontSize: '0.95rem',
};
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' };
const primaryBtn: React.CSSProperties = { flex: 1, padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', fontWeight: 600 };
const ghostBtn: React.CSSProperties = { padding: '12px 20px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, color: 'var(--color-text-primary)' };

export const CalendarEventsView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);
  const activeSem = useActiveSemester();

  const events = useLiveQuery(
    () => db.calendarEvents.filter(e => !e.is_deleted).toArray()
      .then(rows => rows.sort((a, b) => a.date.localeCompare(b.date))),
    []
  ) || [];

  // Add / edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState('');
  const [type, setType]         = useState<CalendarEvent['type']>('holiday');
  const [description, setDescription] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

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

  const handleDelete = async (ev: CalendarEvent) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    try {
      await db.calendarEvents.update(ev.id, { is_deleted: true });
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      setDbError('Failed to delete event.');
    }
  };

  // Restore the full ADIT default set: keep user customs, un-delete/restore
  // any default that was edited or deleted, and align the sample semester's
  // dates back to the real ADIT ODD 2026 calendar.
  const handleResetDefaults = async () => {
    if (!confirm('Reset the calendar to the official ADIT Academic Calendar 2026-27 defaults?\n\nCustom events are kept. Default events you edited or deleted are restored.')) return;

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

    // If the active semester is still the shipped sample one, realign its
    // dates to the ADIT calendar. Custom semesters are left untouched.
    if (activeSem && activeSem.label === ADIT_SEMESTER_DEFAULT.label) {
      await db.semesters.update(activeSem.id, {
        start_date: ADIT_SEMESTER_DEFAULT.start_date,
        end_date: ADIT_SEMESTER_DEFAULT.end_date,
      });
    }

    setResetMsg(`Calendar reset to ADIT 2026-27 defaults — ${restored} default event(s) restored.`);
    setTimeout(() => setResetMsg(null), 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}><ArrowLeft size={24} /></button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Calendar Events</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {events.length} events · {activeSem?.label || 'No active semester'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleResetDefaults}
            title="Restore the official ADIT Academic Calendar 2026-27 defaults"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-chip)', fontWeight: 600, fontSize: '0.78rem' }}
          >
            <RotateCcw size={14} /> Reset to ADIT
          </button>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', padding: '8px 12px', borderRadius: 'var(--radius-chip)', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </header>

      {resetMsg && (
        <div style={{ margin: 'var(--space-md) var(--space-md) 0', padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'rgba(22,163,74,0.12)', border: '1px solid var(--color-success)', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
          ✓ {resetMsg}
        </div>
      )}

      {/* Source banner */}
      <div style={{ margin: 'var(--space-md) var(--space-md) 0', padding: '10px 12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        Ships with the official <strong>ADIT Academic Calendar 2026-27</strong> ({ADIT_CALENDAR_EVENT_DEFAULTS.length} defaults — source: adit.ac.in). Add your own events or edit/delete any row. "Reset to ADIT" restores the defaults.
      </div>

      {/* Event list */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.length === 0 && (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No calendar events — tap Add to create one, or Reset to ADIT to load the college calendar.
          </div>
        )}
        {events.map(ev => {
          const meta = EVENT_TYPE_META[ev.type] || EVENT_TYPE_META.college_event;
          const fd = fmtDate(ev.date);
          return (
            <div
              key={ev.id}
              style={{ display: 'flex', alignItems: 'stretch', gap: '12px', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}
            >
              {/* Type color bar */}
              <div style={{ width: '5px', borderRadius: '3px', backgroundColor: meta.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{fd.day} {fd.year}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: meta.color, backgroundColor: `${meta.color}18`, padding: '1px 7px', borderRadius: '4px' }}>{meta.label}</span>
                </div>
                {ev.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '4px', lineHeight: 1.4 }}>{ev.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'flex-start' }}>
                <button
                  aria-label={`Edit ${ev.title}`}
                  onClick={() => openEdit(ev)}
                  style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  aria-label={`Delete ${ev.title}`}
                  onClick={() => handleDelete(ev)}
                  style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-danger)' }}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit bottom sheet */}
      {isEditing && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setIsEditing(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-bg-primary)', borderTopLeftRadius: 'var(--radius-sheet)', borderTopRightRadius: 'var(--radius-sheet)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
          >
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-border)', alignSelf: 'center' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>{editTarget ? 'Edit Event' : 'New Calendar Event'}</h3>

            <div>
              <label style={labelStyle}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Holi Vacation"
                required
                style={{ ...inputStyle, marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as CalendarEvent['type'])}
                  style={{ ...inputStyle, marginTop: '4px' }}
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
                style={{ ...inputStyle, marginTop: '4px' }}
              />
            </div>

            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <button type="submit" style={primaryBtn}>Save Event</button>
              <button type="button" onClick={() => setIsEditing(false)} style={ghostBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CalendarEventsView;
