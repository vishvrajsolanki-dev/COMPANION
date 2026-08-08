import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, LectureSlot } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { GlassButton, EmptyState } from '../../components/ui';
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

/**
 * Generate one dated LectureSlot per occurrence of `dayOfWeek` between
 * semesterStart and semesterEnd (inclusive). Uses naive local ISO strings (no Z).
 *
 * dayOfWeek: 1=Mon … 6=Sat, 7=Sun  (matches DAYS[] above and WeeklyGrid convention)
 */

/** Parse "YYYY-MM-DD" as a local Date (avoids UTC-midnight timezone drift). */
const parseLocalDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function generateSlotsForPattern(
  subjectId: string,
  dayOfWeek: number,       // 1–7
  startTime: string,       // "HH:MM"
  endTime: string,         // "HH:MM"
  roomId: string,
  semesterStart: string,   // "YYYY-MM-DD"
  semesterEnd: string,     // "YYYY-MM-DD"
): Omit<LectureSlot, never>[] {
  // JS getDay(): 0=Sun, 1=Mon … 6=Sat → convert our 1-7 to JS 0-6
  const numericDay = Number(dayOfWeek);
  const jsDay = numericDay === 7 ? 0 : numericDay;

  const start = parseLocalDate(semesterStart);
  const end   = parseLocalDate(semesterEnd);

  // Advance start to the first matching weekday
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

export const TimetableBuilderView: React.FC = () => {
  const subjects    = useSubjects() || [];
  const closeSubview = useUIStore(s => s.closeSubview);

  const activeSem = useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(), []
  );

  // Local patterns the user is building before committing to DB
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);

  // Form for adding a pattern row
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
    // Time-order validation (Bug F#9): a recurring class must end after it starts.
    if (startTime >= endTime) { setFormError('End time must be after start time.'); return; }
    // Prevent exact duplicate patterns
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
    if (!activeSem) { setFormError('No active semester found. Go to Profile → Semesters and set one active first.'); return; }
    if (patterns.length === 0) { setFormError('Add at least one pattern row before generating.'); return; }

    setGenerating(true);
    let totalAdded = 0;

    for (const pat of patterns) {
      const slots = generateSlotsForPattern(
        pat.subjectId, pat.dayOfWeek, pat.startTime, pat.endTime, pat.roomId,
        activeSem.start_date, activeSem.end_date,
      );

      // Skip slots whose ID already exists in DB (idempotent)
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '100px' }}>
      <h1 className="sr-only">Build My Timetable</h1>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-md)',
        paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-page)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={closeSubview} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }} aria-label="Go back"><ArrowLeft size={24} /></button>
        <div style={{ flex: 1, marginLeft: '12px' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Build My Timetable</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
            {activeSem ? `${activeSem.label} · ${activeSem.start_date} → ${activeSem.end_date}` : 'No active semester — set one in Profile → Semesters'}
          </p>
        </div>
      </header>

      {/* Success banner */}
      {generated !== null && (
        <div style={{ margin: 'var(--space-md)', padding: '12px var(--space-md)', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-success)', color: 'var(--color-success-fg)', fontWeight: 600, fontSize: '0.9rem' }}>
          ✓ Generated {generated} lecture slots across the semester. Check the Schedule tab.
        </div>
      )}

      {/* Pattern builder form */}
      <div style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>Add Recurring Pattern</h3>
        <form onSubmit={addPattern} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 'var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)' }}>
          {formError && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {formError}
            </div>
          )}
          {/* Subject picker */}
          <div>
            <label style={labelStyle}>Subject</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="input" style={{ marginTop: 4 }}>
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Day of week */}
          <div>
            <label style={labelStyle}>Day of Week</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => setDayOfWeek(d.num)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: dayOfWeek === d.num ? 'var(--color-primary)' : 'var(--neutral-100)',
                    color: dayOfWeek === d.num ? '#FFFFFF' : 'var(--text-secondary)',
                    minWidth: '44px',
                    minHeight: '36px',
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Time pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="input" style={{ marginTop: 4 }} />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="input" style={{ marginTop: 4 }} />
            </div>
          </div>

          {/* Room */}
          <div>
            <label style={labelStyle}>Room / Hall (optional)</label>
            <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. LH-301" className="input" style={{ marginTop: 4 }} />
          </div>

          <GlassButton type="submit" variant="ghost" fullWidth>
            <CalendarPlus size={16} /> Add Pattern to List
          </GlassButton>
        </form>
      </div>

      {/* Pattern preview list */}
      {patterns.length > 0 && (
        <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Patterns to Generate ({patterns.length})</h3>
          {patterns.map(pat => {
            const s = sub(pat.subjectId);
            const dayName = DAYS.find(d => d.num === pat.dayOfWeek)?.name;
            return (
              <div key={pat.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '10px var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)' }}>
                {s && <div style={{ width: '8px', height: '36px', borderRadius: '4px', backgroundColor: s.color, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s?.name ?? pat.subjectId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-family-mono)' }}>
                    {dayName} · {pat.startTime}–{pat.endTime} {pat.roomId ? `· ${pat.roomId}` : ''}
                  </div>
                </div>
                <button onClick={() => removePattern(pat.id)} aria-label="Remove pattern" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {/* Generate CTA */}
          <GlassButton
            onClick={generateAll}
            disabled={generating || !activeSem}
            fullWidth
            size="lg"
            style={{ marginTop: '4px' }}
          >
            <Zap size={18} />
            {generating ? 'Generating…' : 'Generate Across Semester'}
          </GlassButton>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            This creates one slot per week for each pattern above. Duplicate dates are skipped automatically.
          </p>
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

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' };

export default TimetableBuilderView;
