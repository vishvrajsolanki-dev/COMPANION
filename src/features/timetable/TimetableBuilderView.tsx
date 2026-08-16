import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, LectureSlot } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { Button, EmptyState } from '../../components/ui';
import { ArrowLeft, CalendarPlus, Trash2, Zap, Calendar, AlertCircle } from 'lucide-react';

const DAYS = [
  { num: 1, name: 'Mon' },
  { num: 2, name: 'Tue' },
  { num: 3, name: 'Wed' },
  { num: 4, name: 'Thu' },
  { num: 5, name: 'Fri' },
  { num: 6, name: 'Sat' },
  { num: 7, name: 'Sun' },
];

const parseLocalDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function generateSlotsForPattern(
  subjectId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  roomId: string,
  semesterStart: string,
  semesterEnd: string,
): Omit<LectureSlot, never>[] {
  const numericDay = Number(dayOfWeek);
  const jsDay = numericDay === 7 ? 0 : numericDay;

  const start = parseLocalDate(semesterStart);
  const end   = parseLocalDate(semesterEnd);

  while (start.getDay() !== jsDay) {
    start.setDate(start.getDate() + 1);
  }

  const slots: LectureSlot[] = [];
  let current = new Date(start);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm   = String(current.getMonth() + 1).padStart(2, '0');
    const dd   = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    slots.push({
      id: `slot-${subjectId.slice(-6)}-${dateStr.replace(/-/g, '')}-${(startTime || '0000').replace(/[^0-9]/g, '')}`,
      subject_id: subjectId,
      room_id: roomId || undefined,
      start_time: `${dateStr}T${startTime}:00`,
      end_time:   `${dateStr}T${endTime}:00`,
      status: 'scheduled',
      is_deleted: false,
    });
    current.setDate(current.getDate() + 7);
  }
  return slots;
}

interface PatternRow {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId: string;
}

import { navigateTo } from '../../hooks/useHashLocation';

export const TimetableBuilderView: React.FC = () => {
  const subjects    = useSubjects() || [];
  const closeSubview = () => navigateTo('#plan/timetable');

  const activeSem = useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(), []
  );

  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);

  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime]     = useState('10:15');
  const [roomId, setRoomId]       = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const addPattern = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!subjectId) return;
    if (startTime >= endTime) { setFormError('End time must be after start time.'); return; }
    const exists = patterns.some(p =>
      p.subjectId === subjectId && p.dayOfWeek === dayOfWeek && p.startTime === startTime
    );
    if (exists) { setFormError('This pattern already exists in the list.'); return; }

    setPatterns(prev => [...prev, {
      id: `pat-${Date.now()}`,
      subjectId, dayOfWeek, startTime, endTime, roomId,
    }]);
  };

  const removePattern = (id: string) => setPatterns(prev => prev.filter(p => p.id !== id));

  const generateAll = async () => {
    setFormError(null);
    if (!activeSem) { setFormError('No active semester found. Set one active first.'); return; }
    if (patterns.length === 0) { setFormError('Add at least one pattern row before generating.'); return; }

    setGenerating(true);
    let totalAdded = 0;

    for (const pat of patterns) {
      const slots = generateSlotsForPattern(
        pat.subjectId, pat.dayOfWeek, pat.startTime, pat.endTime, pat.roomId,
        activeSem.start_date, activeSem.end_date,
      );

      const existingIds = new Set(
        (await db.lectureSlots.bulkGet(slots.map(s => s.id)))
          .filter(Boolean)
          .map(s => s!.id)
      );
      const newSlots = slots.filter(s => !existingIds.has(s.id));
      if (newSlots.length > 0) {
        await db.lectureSlots.bulkAdd(newSlots);
        totalAdded += newSlots.length;
      }
    }

    setGenerating(false);
    setGenerated(totalAdded);
    setPatterns([]);
  };

  const sub = (id: string) => subjects.find(s => s.id === id);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
      data-testid="timetable-builder-view"
    >
      <h1 className="sr-only">Build My Timetable</h1>
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
        <button
          onClick={closeSubview}
          style={{ color: 'var(--on-surface)', display: 'flex', alignItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1, marginLeft: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Build My Timetable</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', margin: '1px 0 0 0' }}>
            {activeSem ? `${activeSem.label} · ${activeSem.start_date} → ${activeSem.end_date}` : 'No active semester'}
          </p>
        </div>
      </header>

      {generated !== null && (
        <div
          style={{
            margin: '16px',
            padding: '12px 16px',
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          ✓ Generated {generated} lecture slots across the semester. Check the Schedule.
        </div>
      )}

      {/* Pattern builder form */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '10px' }}>Add Recurring Pattern</h3>
        <form
          onSubmit={addPattern}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'var(--surface-container-lowest)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--outline-variant)',
          }}
        >
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
            <label style={labelStyle}>Subject</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              required
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            >
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Day of Week</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => setDayOfWeek(d.num)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: dayOfWeek === d.num ? 'var(--primary)' : 'var(--surface-container-lowest)',
                    color: dayOfWeek === d.num ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    minWidth: '44px',
                    minHeight: '44px',
                    cursor: 'pointer',
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4, minHeight: 44 }}
              />
            </div>
          </div>


          <div>
            <label style={labelStyle}>Room / Hall (optional)</label>
            <input
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              placeholder="e.g. LH-301"
              className="input"
              style={{ marginTop: 4, minHeight: 44 }}
            />
          </div>

          <Button type="submit" variant="subtle" fullWidth>
            <CalendarPlus size={16} /> Add Pattern to List
          </Button>
        </form>
      </div>

      {patterns.length > 0 && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface-variant)', margin: 0 }}>Patterns to Generate ({patterns.length})</h3>
          {patterns.map(pat => {
            const s = sub(pat.subjectId);
            const dayName = DAYS.find(d => d.num === pat.dayOfWeek)?.name;
            return (
              <div
                key={pat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-container-lowest)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                {s && <div style={{ width: '6px', height: '36px', borderRadius: '3px', backgroundColor: s.color, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface)' }}>{s?.name ?? pat.subjectId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {dayName} · {pat.startTime}–{pat.endTime} {pat.roomId ? `· ${pat.roomId}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => removePattern(pat.id)}
                  aria-label="Remove pattern"
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-full, 9999px)',
                    backgroundColor: 'var(--error-container)',
                    color: 'var(--on-error-container)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          <Button
            onClick={generateAll}
            disabled={generating || !activeSem}
            fullWidth
            size="lg"
            variant="primary"
          >
            <Zap size={18} />
            {generating ? 'Generating…' : 'Generate Across Semester'}
          </Button>
        </div>
      )}

      {patterns.length === 0 && generated === null && (
        <EmptyState
          icon={<Calendar size={32} />}
          title="No patterns yet"
          body='Add one or more patterns above, then tap "Generate Across Semester" to populate the Schedule.'
        />
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' };

export default TimetableBuilderView;
