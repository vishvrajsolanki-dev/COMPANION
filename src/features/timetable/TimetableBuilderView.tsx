import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSubjects } from '../../db/useDatabase';
import { db, LectureSlot } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, CalendarPlus, Trash2, Zap } from 'lucide-react';

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
  const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;

  const start = new Date(semesterStart);
  const end   = new Date(semesterEnd);

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
      id: `slot-${subjectId.slice(-6)}-${dateStr.replace(/-/g, '')}`,
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

  const addPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;
    // Prevent exact duplicate patterns
    const exists = patterns.some(p =>
      p.subjectId === subjectId && p.dayOfWeek === dayOfWeek && p.startTime === startTime
    );
    if (exists) { alert('This pattern already exists in the list.'); return; }

    setPatterns(prev => [...prev, {
      id: `pat-${Date.now()}`,
      subjectId, dayOfWeek, startTime, endTime, roomId,
    }]);
  };

  const removePattern = (id: string) => setPatterns(prev => prev.filter(p => p.id !== id));

  const generateAll = async () => {
    if (!activeSem) { alert('No active semester found. Go to Profile → Semesters and set one active first.'); return; }
    if (patterns.length === 0) { alert('Add at least one pattern row before generating.'); return; }

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '100px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}><ArrowLeft size={24} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Build My Timetable</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
            {activeSem ? `${activeSem.label} · ${activeSem.start_date} → ${activeSem.end_date}` : 'No active semester — set one in Profile → Semesters'}
          </p>
        </div>
      </header>

      {/* Success banner */}
      {generated !== null && (
        <div style={{ margin: 'var(--space-md)', padding: '12px var(--space-md)', backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-success)', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem' }}>
          ✓ Generated {generated} lecture slots across the semester. Check the Schedule tab.
        </div>
      )}

      {/* Pattern builder form */}
      <div style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '10px' }}>Add Recurring Pattern</h3>
        <form onSubmit={addPattern} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          {/* Subject picker */}
          <div>
            <label style={labelStyle}>Subject</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required style={{ ...inputStyle, marginTop: '4px' }}>
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
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid var(--color-border)', backgroundColor: dayOfWeek === d.num ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)', color: dayOfWeek === d.num ? 'var(--color-on-accent)' : 'var(--color-text-secondary)', minWidth: '44px', minHeight: '36px' }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Time pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required style={{ ...inputStyle, marginTop: '4px' }} />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required style={{ ...inputStyle, marginTop: '4px' }} />
            </div>
          </div>

          {/* Room */}
          <div>
            <label style={labelStyle}>Room / Hall (optional)</label>
            <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. LH-301" style={{ ...inputStyle, marginTop: '4px' }} />
          </div>

          <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', fontWeight: 600, border: '1px dashed var(--color-border)' }}>
            <CalendarPlus size={16} /> Add Pattern to List
          </button>
        </form>
      </div>

      {/* Pattern preview list */}
      {patterns.length > 0 && (
        <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Patterns to Generate ({patterns.length})</h3>
          {patterns.map(pat => {
            const s = sub(pat.subjectId);
            const dayName = DAYS.find(d => d.num === pat.dayOfWeek)?.name;
            return (
              <div key={pat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
                {s && <div style={{ width: '8px', height: '36px', borderRadius: '4px', backgroundColor: s.color, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s?.name ?? pat.subjectId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', fontFamily: 'var(--font-family-mono)' }}>
                    {dayName} · {pat.startTime}–{pat.endTime} {pat.roomId ? `· ${pat.roomId}` : ''}
                  </div>
                </div>
                <button onClick={() => removePattern(pat.id)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-danger)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {/* Generate CTA */}
          <button
            onClick={generateAll}
            disabled={generating || !activeSem}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: 'var(--radius-card)', backgroundColor: generating ? 'var(--color-bg-tertiary)' : 'var(--color-accent-primary)', color: generating ? 'var(--color-text-secondary)' : 'var(--color-on-accent)', fontWeight: 700, fontSize: '1rem', marginTop: '4px', opacity: !activeSem ? 0.5 : 1 }}
          >
            <Zap size={18} />
            {generating ? 'Generating…' : `Generate Across Semester`}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            This creates one slot per week for each pattern above. Duplicate dates are skipped automatically.
          </p>
        </div>
      )}

      {patterns.length === 0 && generated === null && (
        <div style={{ padding: '30px var(--space-md)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
          Add one or more patterns above, then tap "Generate Across Semester" to populate the Schedule.
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: '0.95rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' };

export default TimetableBuilderView;
