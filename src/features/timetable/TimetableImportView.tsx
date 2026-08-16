import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LectureSlot } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/ui';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileCode, Play, Copy, UserCheck, Pencil } from 'lucide-react';
import { SUBJECT_COLORS } from '../subjects/ManageSubjectsView';
import { getReferenceFaculty, findBestFacultyMatch, type ReferenceFaculty } from '../../lib/referenceData';

interface JSONSubjectImport {
  code: string;
  name: string;
  credits?: number;
  color?: string;
  faculty_name?: string;
}

interface JSONPatternImport {
  subject_code: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  faculty_name?: string;
}

interface JSONTimetablePayload {
  semester_label?: string;
  subjects?: JSONSubjectImport[];
  patterns?: JSONPatternImport[];
}

interface FacultyMatch {
  key: string;
  input: string;
  matched: ReferenceFaculty | null;
  override: string;
}

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
- One entry in "subjects" per real course.
- Every distinct weekly time slot is its own entry in "patterns".`;

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

import { navigateTo } from '../../hooks/useHashLocation';

export const TimetableImportView: React.FC = () => {
  const closeSubview = () => navigateTo('#plan/timetable');
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
  const [facultyMatches, setFacultyMatches] = useState<FacultyMatch[] | null>(null);
  const [facultyMatchError, setFacultyMatchError] = useState(false);

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
        if (!payloadCodes.has(code) && !knownCodes.has(code)) {
          unresolvable.push(pat.subject_code);
          continue;
        }
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
    setImportedCount(null);
    setCommitSummary(null);
    setFacultyMatches(null);
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
      buildFacultyMatches(data);
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
      setFacultyMatches(null);
    };
    reader.readAsText(file);
  };

  const buildFacultyMatches = async (data: JSONTimetablePayload) => {
    setFacultyMatches(null);
    setFacultyMatchError(false);

    const distinct = new Map<string, string>();
    for (const p of data.patterns || []) {
      if (p.faculty_name && p.faculty_name.trim()) {
        const key = p.faculty_name.trim().toLowerCase();
        if (!distinct.has(key)) distinct.set(key, p.faculty_name.trim());
      }
    }
    if (distinct.size === 0) { setFacultyMatches([]); return; }

    const ref = await getReferenceFaculty();
    if (ref.error) setFacultyMatchError(true);
    const list = ref.error ? [] : ref.data;

    const matches: FacultyMatch[] = [];
    for (const [key, input] of distinct) {
      const matched = list.length > 0 ? findBestFacultyMatch(input, list) : null;
      matches.push({ key, input, matched, override: matched?.name ?? input });
    }
    setFacultyMatches(matches);
  };

  const resolveFacultyName = (input?: string): string | undefined => {
    if (!input || !input.trim()) return undefined;
    const key = input.trim().toLowerCase();
    const m = facultyMatches?.find(f => f.key === key);
    if (!m) return input;
    return m.override.trim() || undefined;
  };

  const copyConversionPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CONVERSION_PROMPT);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CONVERSION_PROMPT;
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
          await db.subjects.update(existingId, { name: s.name, credits: s.credits || 3 });
          updated.push(uppercaseCode);
        }
      }
    }

    let totalGenerated = 0;
    for (const pat of parsed.patterns || []) {
      const subId = codeToIdMap.get(pat.subject_code.toUpperCase());
      if (!subId) {
        skipped.push(pat.subject_code);
        continue;
      }

      const generatedSlots = generateSlotsForPattern(
        subId,
        pat.day_of_week,
        pat.start_time,
        pat.end_time,
        pat.room_id,
        resolveFacultyName(pat.faculty_name),
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
    setFacultyMatches(null);
    setJsonText('');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-page)',
      }}
      data-testid="timetable-import-view"
    >
      <h1 className="sr-only">Import Timetable JSON</h1>
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Import Timetable JSON</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', margin: 0 }}>
            {activeSem ? `${activeSem.label} (${activeSem.start_date} → ${activeSem.end_date})` : 'No active semester'}
          </p>
        </div>
      </header>

      {importedCount !== null && (
        <div
          style={{
            margin: '16px',
            padding: '16px',
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          ✓ Successfully imported and generated {importedCount} lecture slots!
          {commitSummary && (
            <div style={{ marginTop: '8px', fontSize: '0.82rem', fontWeight: 500 }}>
              {commitSummary.created.length > 0 && (
                <div>• Created {commitSummary.created.length} subject(s): {commitSummary.created.join(', ')}</div>
              )}
              {commitSummary.updated.length > 0 && (
                <div>• Updated {commitSummary.updated.length} subject(s): {commitSummary.updated.join(', ')}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>JSON Data</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="subtle" onClick={copyConversionPrompt}>
              <Copy size={12} />
              {copied ? 'Copied ✓' : 'Copy Prompt'}
            </Button>
            <Button size="sm" variant="subtle" onClick={() => { setJsonText(sampleJSON); setError(null); setImportedCount(null); setCommitSummary(null); }}>
              Load Sample
            </Button>
            <label
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Upload size={12} /> Upload .json
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
          style={{ fontFamily: 'var(--font-mono)', minHeight: 160 }}
        />

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--error-container)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--on-error-container)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <Button onClick={handleValidate} variant="subtle" fullWidth>
          <FileCode size={16} /> Validate JSON Payload
        </Button>

        {parsed && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> Validated Payload Ready
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
              <div>• <strong>{parsed.subjects?.length || 0}</strong> subjects defined (<strong>{preview ? `${preview.newSubjects} new` : '…'}</strong>)</div>
              <div>• <strong>{parsed.patterns?.length || 0}</strong> weekly recurring patterns → <strong>{preview ? `~${preview.projectedSlots} dated slots` : '…'}</strong></div>
            </div>

            {parsed.patterns?.some(p => p.faculty_name?.trim()) && (
              <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <UserCheck size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--on-surface)' }}>Faculty auto-matching</span>
                </div>

                {facultyMatches && facultyMatches.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {facultyMatches.map(m => (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                        <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                          {m.input} → <strong>{m.override}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleCommitImport} disabled={!activeSem} fullWidth variant="primary">
              <Play size={16} /> Commit Import & Generate Slots
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableImportView;
