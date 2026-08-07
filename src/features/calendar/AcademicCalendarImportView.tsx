import React, { useState } from 'react';
import { db, CalendarEvent } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
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

export const AcademicCalendarImportView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);
  const navigateToSubview = useUIStore(s => s.navigateToSubview);

  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<JSONAcademicCalendarPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleValidate = () => {
    setError(null);
    setParsed(null);
    setSuccessMsg(null); // clear stale success banner on re-validation
    try {
      if (!jsonText.trim()) throw new Error('Please paste JSON content or load sample.');
      const data: JSONAcademicCalendarPayload = JSON.parse(jsonText);

      if (!data.semester_defaults && (!data.events || data.events.length === 0)) {
        throw new Error('Invalid JSON: Must contain "semester_defaults" or an "events" array.');
      }

      if (data.events) {
        data.events.forEach((ev, idx) => {
          if (!ev.title || !ev.date) throw new Error(`Event #${idx + 1} missing "title" or "date".`);
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
    if (!parsed) return;

    // 1. Create/refresh the pre-filled Semester and make it THE single active one.
    //    A second active semester would silently hijack the app's active-semester
    //    pointer (useActiveSemester().first()) away from the semester holding data.
    if (parsed.semester_defaults) {
      const def = parsed.semester_defaults;
      let targetSemId: string;
      const existing = await db.semesters.filter(s => s.label === def.label && !s.is_deleted).first();
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={closeSubview}><ArrowLeft size={24} /></button>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Import Academic Calendar</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            Import semester boundaries, holidays & exam windows (pre-fills Semester Setup)
          </p>
        </div>
      </header>

      {successMsg && (
        <div style={{ margin: 'var(--space-md)', padding: '14px', backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-success)', color: 'var(--color-success)', fontWeight: 600 }}>
          {successMsg}
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => navigateToSubview('semester-setup')}
              style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', fontWeight: 600 }}
            >
              Open Semester Setup to Edit
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Calendar JSON Data</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setJsonText(sampleCalendarJSON); setError(null); setSuccessMsg(null); }}
              style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              Sample Calendar JSON
            </button>
            <label style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', cursor: 'pointer', fontWeight: 600 }}>
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
          style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem' }}
        />

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-card)', color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <button
          onClick={handleValidate}
          style={{ padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Calendar size={16} /> Validate Calendar Payload
        </button>

        {parsed && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-accent-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> Validated Calendar Data
            </div>

            {parsed.semester_defaults && (
              <div style={{ fontSize: '0.85rem' }}>
                Semester: <strong>{parsed.semester_defaults.label}</strong> ({parsed.semester_defaults.start_date} → {parsed.semester_defaults.end_date})
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Events to import: <strong>{parsed.events?.length || 0}</strong>
            </div>

            <button
              onClick={handleCommitImport}
              style={{ padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-on-accent)', fontWeight: 700, fontSize: '0.95rem' }}
            >
              Import Academic Calendar Defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicCalendarImportView;
