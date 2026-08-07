import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Subject, LectureSlot } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { GlassButton } from '../../components/ui';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileCode, Play, Copy } from 'lucide-react';
import { SUBJECT_COLORS } from '../subjects/ManageSubjectsView';

interface JSONSubjectImport {
  code: string;
  name: string;
  credits?: number;
  color?: string;
  faculty_name?: string;
}

interface JSONPatternImport {
  subject_code: string;
  day_of_week: number; // 1=Mon ... 7=Sun
  start_time: string;  // "09:00"
  end_time: string;    // "10:15"
  room_id?: string;
  faculty_name?: string;
}

interface JSONTimetablePayload {
  semester_label?: string;
  subjects?: JSONSubjectImport[];
  patterns?: JSONPatternImport[];
}

// Student-facing prompt they paste into any AI (ChatGPT/Gemini/Claude/…) along
// with their timetable to get back JSON matching the exact schema validated in
// handleValidate and consumed by handleCommitImport. Colors are auto-assigned
// from the 8 locked subject tokens, so the AI is told not to emit them.
const CONVERSION_PROMPT = `I need to convert my college timetable into a specific JSON format. I'll describe or show you my weekly timetable — convert it into this exact structure:

{
  "subjects": [
    { "code": "SUBJECT_CODE", "name": "Full Subject Name", "credits": 4 }
  ],
  "patterns": [
    { "subject_code": "SUBJECT_CODE", "day_of_week": 1, "start_time": "09:00", "end_time": "10:15", "room_id": "LH-301", "faculty_name": "Prof. Name" }
  ]
}

Rules:
- "day_of_week" is an integer: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday.
- "start_time" and "end_time" are 24-hour "HH:MM" strings (e.g. "09:00", "14:30").
- One entry in "subjects" per real course, using its short code (e.g. "DS", "DBMS"). Every "subject_code" used in "patterns" MUST have a matching entry in "subjects".
- Labs and tutorials are NOT separate subjects — they are extra entries in "patterns" using the SAME "subject_code" as the parent lecture. Example: if "DS" has a lecture on Monday and a lab on Wednesday, both go in "patterns" with "subject_code": "DS". Do NOT create a "DS Lab" subject.
- Every distinct weekly time slot (lecture, lab, or tutorial) is its own entry in "patterns", even if several slots share a subject_code.
- Do NOT include a "color" field — subject colors are assigned automatically.
- Only include real, confirmed classes — don't guess or fill in gaps.

Here's my timetable: [paste your timetable text, or describe it, or attach an image]`;

/** Parse "YYYY-MM-DD" as a local Date (avoids UTC-midnight timezone drift). */
const parseLocalDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function generateSlotsForPattern(
  subjectId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  roomId?: string,
  facultyName?: string,
  semesterStart?: string,
  semesterEnd?: string
): LectureSlot[] {
  if (!semesterStart || !semesterEnd) return [];
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
      faculty_name: facultyName || undefined,
      start_time: `${dateStr}T${startTime}:00`,
      end_time:   `${dateStr}T${endTime}:00`,
      status: 'scheduled',
      is_deleted: false,
    });
    current.setDate(current.getDate() + 7);
  }
  return slots;
}

export const TimetableImportView: React.FC = () => {
  const closeSubview = useUIStore(s => s.closeSubview);
  const activeSem = useLiveQuery(
    () => db.semesters.filter(s => s.is_active && !s.is_deleted).first(), []
  );

  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<JSONTimetablePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [commitSummary, setCommitSummary] = useState<{ created: string[]; updated: string[]; skipped: string[] } | null>(null);
  const [preview, setPreview] = useState<{ newSubjects: number; projectedSlots: number; unresolvable: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  // Live preview of the real DB impact: how many subjects are NEW, and how many
  // dated lecture slots the patterns will generate across the active semester.
  useEffect(() => {
    if (!parsed || !activeSem) { setPreview(null); return; }
    let cancelled = false;
    (async () => {
      const existing = await db.subjects.filter(s => !s.is_deleted).toArray();
      const knownCodes = new Set(existing.map(s => s.code.toUpperCase()));
      const payloadCodes = new Set((parsed.subjects || []).map(s => s.code.toUpperCase()));

      const newSubjects = (parsed.subjects || []).filter(s => !knownCodes.has(s.code.toUpperCase())).length;

      let projectedSlots = 0;
      const unresolvable: string[] = [];
      for (const pat of parsed.patterns || []) {
        const code = pat.subject_code.toUpperCase();
        // A pattern is resolvable if its code is in the payload OR already in the DB.
        if (!payloadCodes.has(code) && !knownCodes.has(code)) {
          unresolvable.push(pat.subject_code);
          continue;
        }
        // Slot COUNT is independent of the subject id — a dummy id is fine here.
        projectedSlots += generateSlotsForPattern(
          '__preview__', pat.day_of_week, pat.start_time, pat.end_time,
          undefined, undefined, activeSem.start_date, activeSem.end_date
        ).length;
      }

      if (!cancelled) setPreview({ newSubjects, projectedSlots, unresolvable });
    })();
    return () => { cancelled = true; };
  }, [parsed, activeSem]);

  const sampleJSON = JSON.stringify({
    semester_label: "Semester 5 (Odd 2026)",
    subjects: [
      { code: "2AI501", name: "Machine Learning", credits: 4, faculty_name: "Prof. Kavita Patel" },
      { code: "2AI502", name: "Data Structures & Algorithms", credits: 4, faculty_name: "Prof. Ramesh Shah" }
    ],
    patterns: [
      { subject_code: "2AI501", day_of_week: 1, start_time: "09:00", end_time: "10:15", room_id: "LH-301", faculty_name: "Prof. Kavita Patel" },
      { subject_code: "2AI502", day_of_week: 2, start_time: "10:30", end_time: "11:45", room_id: "LH-302", faculty_name: "Prof. Ramesh Shah" }
    ]
  }, null, 2);

  const handleValidate = () => {
    setError(null);
    setParsed(null);
    setImportedCount(null);   // clear stale success banner on re-validation
    setCommitSummary(null);
    try {
      if (!jsonText.trim()) throw new Error('Please paste JSON content or load sample.');
      const data: JSONTimetablePayload = JSON.parse(jsonText);

      if (!data.patterns || !Array.isArray(data.patterns) || data.patterns.length === 0) {
        throw new Error('Invalid JSON: Must contain a "patterns" array with at least 1 entry.');
      }

      data.patterns.forEach((p, idx) => {
        if (!p.subject_code) throw new Error(`Pattern #${idx + 1} missing "subject_code".`);
        if (typeof p.day_of_week !== 'number' || !Number.isInteger(p.day_of_week) || p.day_of_week < 1 || p.day_of_week > 7) throw new Error(`Pattern #${idx + 1} has invalid "day_of_week" (must be an integer 1-7).`);
        if (!p.start_time || !p.end_time) throw new Error(`Pattern #${idx + 1} missing "start_time" or "end_time".`);
      });

      setParsed(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setJsonText(content);
      setError(null);
      setImportedCount(null);
      setCommitSummary(null);
    };
    reader.readAsText(file);
  };

  const copyConversionPrompt = async () => {
    const text = CONVERSION_PROMPT;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts (served over plain http / file://)
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommitImport = async () => {
    if (!parsed || !activeSem) return;

    let colorIndex = 0;
    const existingSubjects = await db.subjects.filter(s => !s.is_deleted).toArray();
    const codeToIdMap = new Map<string, string>();
    existingSubjects.forEach(s => codeToIdMap.set(s.code.toUpperCase(), s.id));

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    // 1. Create missing subjects / refresh existing ones. Colors always come from
    //    the 8 locked tokens — never hardcoded, never a free picker.
    if (parsed.subjects && Array.isArray(parsed.subjects)) {
      for (const s of parsed.subjects) {
        const uppercaseCode = s.code.toUpperCase();
        const existingId = codeToIdMap.get(uppercaseCode);
        if (!existingId) {
          const autoColor = s.color && SUBJECT_COLORS.some(c => c.hex === s.color)
            ? s.color
            : SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length].hex;
          colorIndex++;

          const newId = `sub-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          await db.subjects.add({
            id: newId,
            semester_id: activeSem.id,
            code: uppercaseCode,
            name: s.name,
            credits: s.credits || 3,
            color: autoColor,
            is_deleted: false,
          });
          codeToIdMap.set(uppercaseCode, newId);
          created.push(uppercaseCode);
        } else {
          // Code already exists — refresh metadata so a re-import with corrected
          // details isn't silently ignored. Existing color is preserved.
          await db.subjects.update(existingId, { name: s.name, credits: s.credits || 3 });
          updated.push(uppercaseCode);
        }
      }
    }

    // 2. Generate dated slots across active semester using existing generation logic
    let totalGenerated = 0;
    for (const pat of parsed.patterns || []) {
      const subId = codeToIdMap.get(pat.subject_code.toUpperCase());
      if (!subId) {
        // Never skip silently — surface the unresolvable pattern to the user.
        skipped.push(pat.subject_code);
        continue;
      }

      const generatedSlots = generateSlotsForPattern(
        subId,
        pat.day_of_week,
        pat.start_time,
        pat.end_time,
        pat.room_id,
        pat.faculty_name,
        activeSem.start_date,
        activeSem.end_date
      );

      const existingIds = new Set(
        (await db.lectureSlots.bulkGet(generatedSlots.map(s => s.id)))
          .filter(Boolean)
          .map(s => s!.id)
      );

      const newSlots = generatedSlots.filter(s => !existingIds.has(s.id));
      if (newSlots.length > 0) {
        await db.lectureSlots.bulkAdd(newSlots);
        totalGenerated += newSlots.length;
      }
    }

    setImportedCount(totalGenerated);
    setCommitSummary({ created, updated, skipped });
    setParsed(null);
    setJsonText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-md)',
        paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-page)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={closeSubview} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={24} /></button>
        <div style={{ flex: 1, marginLeft: '12px' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Import Timetable JSON</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {activeSem ? `${activeSem.label} (${activeSem.start_date} → ${activeSem.end_date})` : 'No active semester'}
          </p>
        </div>
      </header>

      {importedCount !== null && (
        <div style={{ margin: 'var(--space-md)', padding: '14px', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-success)', color: 'var(--color-success-fg)', fontWeight: 600 }}>
          ✓ Successfully imported and generated {importedCount} lecture slots into IndexedDB!
          {commitSummary && (
            <div style={{ marginTop: '8px', fontSize: '0.82rem', fontWeight: 500 }}>
              {commitSummary.created.length > 0 && (
                <div>• Created {commitSummary.created.length} subject(s): {commitSummary.created.join(', ')}</div>
              )}
              {commitSummary.updated.length > 0 && (
                <div>• Updated {commitSummary.updated.length} existing subject(s): {commitSummary.updated.join(', ')}</div>
              )}
              {commitSummary.skipped.length > 0 && (
                <div style={{ color: 'var(--color-danger-fg)', fontWeight: 600 }}>
                  ⚠ Skipped {commitSummary.skipped.length} pattern(s) — unknown subject codes: {commitSummary.skipped.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Upload file or paste JSON */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>JSON Data</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <GlassButton
              size="sm"
              variant="subtle"
              onClick={copyConversionPrompt}
              title="Copies a prompt you can paste into any AI (ChatGPT/Gemini/Claude) with your timetable to get schema-correct JSON back"
            >
              <Copy size={12} />
              {copied ? 'Copied ✓' : 'Copy Conversion Prompt'}
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => { setJsonText(sampleJSON); setError(null); setImportedCount(null); setCommitSummary(null); }}
            >
              Load Sample JSON
            </GlassButton>
            <label style={{ fontSize: '0.78rem', padding: '7px 12px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-primary)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={12} style={{ display: 'inline', marginRight: '4px' }} /> Upload .json
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          placeholder="Paste timetable JSON here..."
          rows={10}
          className="input"
          style={{ marginTop: 4, fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-card)' }}
        />

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-card)', color: 'var(--color-danger-fg)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <GlassButton onClick={handleValidate} variant="ghost" fullWidth>
          <FileCode size={16} /> Validate JSON Payload
        </GlassButton>

        {/* Preview before commit */}
        {parsed && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-fg)', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> Validated Payload Ready
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>• <strong>{parsed.subjects?.length || 0}</strong> subjects defined (<strong>{preview ? `${preview.newSubjects} new` : '…'}</strong>)</div>
              <div>• <strong>{parsed.patterns?.length || 0}</strong> weekly recurring patterns → <strong>{preview ? `~${preview.projectedSlots} dated lecture slots` : '…'}</strong></div>
              {preview && preview.unresolvable.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-fg)', fontWeight: 600 }}>
                  ⚠ {preview.unresolvable.length} pattern(s) reference subject codes that are neither in this payload nor in your database: {preview.unresolvable.join(', ')}
                </div>
              )}
            </div>

            <GlassButton
              onClick={handleCommitImport}
              disabled={!activeSem}
              fullWidth
            >
              <Play size={16} /> Commit Import & Generate Slots
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableImportView;
