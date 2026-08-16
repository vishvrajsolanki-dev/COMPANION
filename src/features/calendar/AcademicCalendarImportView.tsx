import React, { useState } from 'react';
import { db, CalendarEvent } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/ui';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface JSONSemesterDefaults {
  label: string;
  start_date: string;
  end_date: string;
}

interface JSONCalendarEvent {
  title: string;
  date: string;
  type: 'holiday' | 'exam_window' | 'college_event' | 'semester_boundary';
  description?: string;
}

interface JSONAcademicCalendarPayload {
  semester_defaults?: JSONSemesterDefaults;
  events?: JSONCalendarEvent[];
}

const VALID_EVENT_TYPES = ['holiday', 'exam_window', 'college_event', 'semester_boundary'];

/** Strict "YYYY-MM-DD" structural check that also rejects impossible dates (e.g. 2026-13-40). */
const isValidDateStr = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

export const AcademicCalendarImportView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);
  const navigateToSubview = useUIStore(s => s.navigateToSubview);

  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<JSONAcademicCalendarPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [semesterOverlapWarning, setSemesterOverlapWarning] = useState<string | null>(null);

  const sampleCalendarJSON = JSON.stringify({
    semester_defaults: {
      label: "Semester 5 (Odd 2026)",
      start_date: "2026-07-06",
      end_date: "2026-11-05"
    },
    events: [
      { title: "Internal Exams Sem 3/5/7", date: "2026-08-24", type: "exam_window", description: "Mon 24 Aug to Fri 28 Aug 2026" },
      { title: "Rakshabandhan", date: "2026-08-28", type: "holiday" },
      { title: "Gandhi Jayanti", date: "2026-10-02", type: "holiday" },
      { title: "Diwali Vacation", date: "2026-11-06", type: "college_event", description: "Fri 6 Nov to Fri 13 Nov 2026 (8 days)" }
    ]
  }, null, 2);

  const handleValidate = async () => {
    setError(null);
    setParsed(null);
    setSuccessMsg(null);
    setSemesterOverlapWarning(null);
    try {
      if (!jsonText.trim()) throw new Error('Please paste JSON content or load sample.');
      const data: JSONAcademicCalendarPayload = JSON.parse(jsonText);

      if (!data.semester_defaults && (!data.events || data.events.length === 0)) {
        throw new Error('Invalid JSON: Must contain "semester_defaults" or an "events" array.');
      }

      if (data.semester_defaults) {
        const { label, start_date, end_date } = data.semester_defaults;
        if (!label) throw new Error('"semester_defaults" missing "label".');
        if (!isValidDateStr(start_date)) throw new Error(`"semester_defaults" has invalid "start_date" (expected YYYY-MM-DD): ${start_date}`);
        if (!isValidDateStr(end_date)) throw new Error(`"semester_defaults" has invalid "end_date" (expected YYYY-MM-DD): ${end_date}`);
        if (end_date < start_date) throw new Error('"semester_defaults" end_date is before start_date.');

        // Duplicate / overlap check — fuzzy-match label and detect date collisions
        const normalizedLabel = label.trim().toLowerCase();
        const labelMatch = await db.semesters
          .filter(s => !s.is_deleted && s.label.trim().toLowerCase() === normalizedLabel)
          .first();
        const allSems = await db.semesters.filter(s => !s.is_deleted).toArray();
        const dateOverlap = allSems.find(
          s =>
            s.start_date <= end_date &&
            s.end_date >= start_date &&
            s.label.trim().toLowerCase() !== normalizedLabel,
        );
        if (labelMatch) {
          setSemesterOverlapWarning(
            `A semester named "${labelMatch.label}" already exists — it will be updated with the new dates on import.`,
          );
        } else if (dateOverlap) {
          setSemesterOverlapWarning(
            `This semester's dates overlap with "${dateOverlap.label}" (${dateOverlap.start_date} → ${dateOverlap.end_date}). The other semester will be deactivated on import.`,
          );
        }
      }

      if (data.events) {
        data.events.forEach((ev, idx) => {
          if (!ev.title || !ev.date) throw new Error(`Event #${idx + 1} missing "title" or "date".`);
          if (!isValidDateStr(ev.date)) throw new Error(`Event #${idx + 1} ("${ev.title}") has invalid "date" (expected YYYY-MM-DD): ${ev.date}`);
          if (ev.type && !VALID_EVENT_TYPES.includes(ev.type)) {
            throw new Error(`Event #${idx + 1} ("${ev.title}") has invalid "type": "${ev.type}" (must be one of ${VALID_EVENT_TYPES.join(', ')}).`);
          }
        });
      }

      setParsed(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Academic Calendar JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setJsonText(evt.target?.result as string);
      setError(null);
      setSuccessMsg(null);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (!parsed || isImporting) return;
    setIsImporting(true);
    try {
    // 1. Create/refresh the pre-filled Semester and make it THE single active one.
    //    A second active semester would silently hijack the app's active-semester
    //    pointer (useActiveSemester().first()) away from the semester holding data.
    if (parsed.semester_defaults) {
      const def = parsed.semester_defaults;
      let targetSemId: string;
      const normalizedLabel = def.label.trim().toLowerCase();
      const existing = await db.semesters
        .filter(s => !s.is_deleted && s.label.trim().toLowerCase() === normalizedLabel)
        .first();
      if (!existing) {
        targetSemId = `sem-${Date.now()}`;
        await db.semesters.add({
          id: targetSemId,
          label: def.label,
          start_date: def.start_date,
          end_date: def.end_date,
          is_active: true,
          is_deleted: false
        });
      } else {
        targetSemId = existing.id;
        // Refresh dates so a corrected re-import is honoured, not silently ignored.
        await db.semesters.update(existing.id, { start_date: def.start_date, end_date: def.end_date });
      }
      // Exactly one active semester: deactivate every other one, keep target active.
      const all = await db.semesters.filter(s => !s.is_deleted).toArray();
      await Promise.all(
        all
          .filter(s => s.id !== targetSemId && s.is_active)
          .map(s => db.semesters.update(s.id, { is_active: false }))
      );
      await db.semesters.update(targetSemId, { is_active: true });
    }

    // 2. Add calendar events (deduped by date+title+type so a re-import never multiplies rows)
    let eventCount = 0;
    let duplicateCount = 0;
    if (parsed.events && parsed.events.length > 0) {
      const existingEvents = await db.calendarEvents.filter(e => !e.is_deleted).toArray();
      const existingKeys = new Set(existingEvents.map(e => `${e.date}|${e.title}|${e.type}`));

      const eventsToAdd: CalendarEvent[] = [];
      parsed.events.forEach((ev, idx) => {
        const key = `${ev.date}|${ev.title}|${ev.type || 'college_event'}`;
        if (existingKeys.has(key)) { duplicateCount++; return; }
        existingKeys.add(key); // also guard against dupes within this same payload
        eventsToAdd.push({
          id: `cal-ev-${Date.now()}-${idx}`,
          title: ev.title,
          date: ev.date,
          type: ev.type || 'college_event',
          description: ev.description,
          is_deleted: false
        });
      });

      if (eventsToAdd.length > 0) {
        await db.calendarEvents.bulkAdd(eventsToAdd);
      }
      eventCount = eventsToAdd.length;
    }

    const dupNote = duplicateCount > 0 ? `, ${duplicateCount} duplicate(s) skipped` : '';
    setSuccessMsg(`Academic calendar defaults imported successfully! (${eventCount} events added${dupNote})`);
    setParsed(null);
    setJsonText('');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      <h1 className="sr-only">Import Academic Calendar</h1>
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
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Import Academic Calendar</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Import semester boundaries, holidays & exam windows (pre-fills Semester Setup)
          </p>
        </div>
      </header>

      {successMsg && (
        <div style={{ margin: 'var(--space-md)', padding: '14px', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-success)', color: 'var(--color-success-fg)', fontWeight: 600 }}>
          {successMsg}
          <div style={{ marginTop: '8px' }}>
            <Button size="sm" onClick={() => navigateToSubview('semester-setup')}>
              Open Semester Setup to Edit
            </Button>
          </div>
        </div>
      )}

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Calendar JSON Data</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setJsonText(sampleCalendarJSON); setError(null); setSuccessMsg(null); }}
            >
              Sample Calendar JSON
            </Button>
            <label style={{ fontSize: '0.78rem', padding: '7px 12px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-primary)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={12} style={{ display: 'inline', marginRight: '4px' }} /> Upload .json
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          placeholder="Paste Academic Calendar JSON here..."
          rows={10}
          className="input"
          style={{ marginTop: 4, fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-card)' }}
        />

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-card)', color: 'var(--color-danger-fg)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <Button onClick={handleValidate} variant="ghost" fullWidth>
          <Calendar size={16} /> Validate Calendar Payload
        </Button>

        {parsed && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-fg)', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> Validated Calendar Data
            </div>

            {parsed.semester_defaults && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Semester: <strong>{parsed.semester_defaults.label}</strong> ({parsed.semester_defaults.start_date} → {parsed.semester_defaults.end_date})
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Events to import: <strong>{parsed.events?.length || 0}</strong>
            </div>

            {semesterOverlapWarning && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning-fg)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {semesterOverlapWarning}
              </div>
            )}

            <Button onClick={handleCommitImport} disabled={isImporting} fullWidth>
              {isImporting ? 'Importing…' : 'Import Academic Calendar Defaults'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicCalendarImportView;
