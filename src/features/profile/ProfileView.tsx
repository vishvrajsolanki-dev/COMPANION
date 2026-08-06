import React, { useState } from 'react';
import { useActiveSemester, useSubjects, useCalendarEvents } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { Moon, Sun, HardDrive, Users, BookOpen, ChevronRight, Calendar, CalendarDays, BookMarked, Sliders, Trash2, Download, AlertTriangle, FileCode, Upload } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const activeSemester    = useActiveSemester();
  const subjects          = useSubjects() || [];
  const calendarEvents    = useCalendarEvents() || [];
  const theme             = useUIStore(state => state.theme);
  const toggleTheme       = useUIStore(state => state.toggleTheme);
  const navigateToSubview = useUIStore(state => state.navigateToSubview);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [confirmInput, setConfirmInput]           = useState('');
  const [isExported, setIsExported]               = useState(false);
  const [restoreError, setRestoreError]           = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess]       = useState(false);

  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);

  // 1. Export JSON backup of all tables before clearing
  const exportBackupJSON = async () => {
    const backup: Record<string, any[]> = {};
    for (const table of db.tables) {
      backup[table.name] = await table.toArray();
    }

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_os_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExported(true);
    return backup;
  };

  // 2. Import JSON backup into IndexedDB (merge mode: upsert by ID)
  const importBackupJSON = async (file: File) => {
    setRestoreError(null);
    setRestoreSuccess(false);

    try {
      const text = await file.text();
      const backup: Record<string, any[]> = JSON.parse(text);

      if (typeof backup !== 'object' || backup === null) {
        throw new Error('Invalid backup format — expected a JSON object with table names as keys.');
      }

      // Clear existing data first (fresh restore, not merge)
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map(table => table.clear()));
      });

      // Import each table
      let totalRows = 0;
      for (const table of db.tables) {
        const rows = backup[table.name];
        if (Array.isArray(rows) && rows.length > 0) {
          await table.bulkAdd(rows);
          totalRows += rows.length;
        }
      }

      // Remove the "user cleared" flag so seed doesn't re-trigger
      localStorage.removeItem('academic_os_user_cleared');

      setRestoreSuccess(true);
      console.log(`Restore complete: ${totalRows} rows across ${db.tables.length} tables.`);
    } catch (err) {
      console.error('Restore failed:', err);
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore backup. Ensure the file is a valid JSON backup from this app.');
    }
  };

  // 3. Perform safe reset (export backup → set flag → clear all IndexedDB tables)
  const handleClearAllData = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE') return;

    // Step 1: Auto export backup
    await exportBackupJSON();

    // Step 2: Set flag in localStorage so seedDatabaseIfEmpty does NOT auto-reseed
    localStorage.setItem('academic_os_user_cleared', 'true');

    // Step 3: Clear all IndexedDB tables
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map(table => table.clear()));
    });

    setIsConfirmingClear(false);
    // Direct user to real Semester Setup flow immediately
    navigateToSubview('semester-setup');
  };

  const Row: React.FC<{ label: string; value?: string; onClick?: () => void; icon: React.ReactNode }> = ({ label, value, onClick, icon }) => (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', width: '100%', textAlign: 'left' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.9rem' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
        {value && <span>{value}</span>}
        {onClick && <ChevronRight size={16} />}
      </div>
    </button>
  );

  return (
    <div style={{ padding: 'var(--space-md)', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem' }}>
          V
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Vishvraj Solanki</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            {activeSemester?.label || 'B.Tech AI & DS — ADIT'}
          </p>
        </div>
      </div>

      {/* Academic Setup & Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Academic Management</h3>

        <Row
          label="Semesters & Dates"
          value={activeSemester?.label || 'None Active'}
          icon={<Calendar size={18} color="var(--color-accent-primary)" />}
          onClick={() => navigateToSubview('semester-setup')}
        />
        <Row
          label="Manage Subjects"
          value={`${subjects.length} active`}
          icon={<BookMarked size={18} color="#06B6D4" />}
          onClick={() => navigateToSubview('manage-subjects')}
        />
        <Row
          label="Build Timetable Pattern"
          icon={<Sliders size={18} color="#10B981" />}
          onClick={() => navigateToSubview('timetable-builder')}
        />
        <Row
          label="Import Timetable JSON"
          icon={<FileCode size={18} color="#F59E0B" />}
          onClick={() => navigateToSubview('timetable-import')}
        />
        <Row
          label="Import Academic Calendar JSON"
          icon={<Calendar size={18} color="#8B5CF6" />}
          onClick={() => navigateToSubview('calendar-import')}
        />
        <Row
          label="Calendar Events"
          value={`${calendarEvents.length} events`}
          icon={<CalendarDays size={18} color="#8B5CF6" />}
          onClick={() => navigateToSubview('calendar-events')}
        />
      </div>

      {/* Academic Directory & Resources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Directory & Shelf</h3>

        <Row
          label="Faculty Directory"
          icon={<Users size={18} color="var(--color-accent-primary)" />}
          onClick={() => navigateToSubview('directory')}
        />
        <Row
          label="Resources Shelf"
          icon={<BookOpen size={18} color="#8B5CF6" />}
          onClick={() => navigateToSubview('resources')}
        />
      </div>

      {/* Preferences */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Preferences</h3>
        <Row
          label="Appearance"
          value={`${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`}
          icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          onClick={toggleTheme}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Semester Status</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{subjects.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Courses</div>
          </div>
          <div style={{ flex: 1, padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{totalCredits}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Credits</div>
          </div>
        </div>
      </div>

      {/* Storage & Reset */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Storage & Data Setup</h3>
        <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HardDrive size={20} color="var(--color-accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Local IndexedDB Storage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>All data is stored offline on this device. Zero cloud dependency.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <button
              onClick={exportBackupJSON}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <Download size={15} /> Backup Data (JSON)
            </button>

            <label
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Upload size={15} /> Restore from JSON
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importBackupJSON(file);
                  e.target.value = '';
                }}
              />
            </label>

            {restoreError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, flexBasis: '100%' }}>
                {restoreError}
              </div>
            )}
            {restoreSuccess && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-success-bg, #dcfce7)', color: 'var(--color-success, #16a34a)', fontSize: '0.85rem', fontWeight: 600, flexBasis: '100%' }}>
                ✓ Backup restored successfully! Data has been replaced.
              </div>
            )}

            <button
              onClick={() => {
                setConfirmInput('');
                setIsConfirmingClear(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <Trash2 size={15} /> Clear All Data & Start Fresh
            </button>
          </div>
        </div>
      </div>

      {/* Active Courses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Active Courses ({subjects.length})</h3>
        {subjects.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '12px' }}>No courses. Go to Manage Subjects to add your real ADIT subjects.</p>
        ) : (
          subjects.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                {s.code} · {s.credits}cr
              </span>
            </div>
          ))
        )}
      </div>

      {/* App info */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--space-sm)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
          Student Academic OS · v0.1.0 · Phase 1.5
        </p>
      </div>

      {/* Confirmation Modal */}
      {isConfirmingClear && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)'
          }}
          onClick={() => setIsConfirmingClear(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--color-bg-primary)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Wipe All Local Data?</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              This will permanently delete <strong>all sample/local data</strong> including:
            </p>
            <ul style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Semesters & Date ranges</li>
              <li>Subjects & Course codes</li>
              <li>Lecture Slots & Timetable patterns</li>
              <li>Attendance Records & Edit histories</li>
              <li>Tasks, Study Notes, Exams, & Resources</li>
            </ul>

            <div style={{ padding: '10px', backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--color-accent-primary)' }}>
              ℹ A JSON backup will be exported automatically to your downloads folder before deletion.
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-chip)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.95rem',
                  marginTop: '4px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={handleClearAllData}
                disabled={confirmInput.trim().toUpperCase() !== 'DELETE'}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: confirmInput.trim().toUpperCase() === 'DELETE' ? 'var(--color-danger)' : 'var(--color-bg-tertiary)',
                  color: confirmInput.trim().toUpperCase() === 'DELETE' ? '#ffffff' : 'var(--color-text-tertiary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: confirmInput.trim().toUpperCase() === 'DELETE' ? 'pointer' : 'not-allowed'
                }}
              >
                Export & Wipe All Data
              </button>
              <button
                onClick={() => setIsConfirmingClear(false)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfileView;
