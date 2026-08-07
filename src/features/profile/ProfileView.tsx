import React, { useState } from 'react';
import { useActiveSemester, useSubjects, useCalendarEvents } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import { QuickLink, StatTile, GlassButton, BottomSheet, Badge } from '../../components/ui';
import {
  Moon, Sun, HardDrive, Users, BookOpen, Calendar, CalendarDays,
  BookMarked, Sliders, Trash2, Download, AlertTriangle, FileCode, Upload, User,
  ShieldCheck, LogOut, Settings2, Palette
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const activeSemester    = useActiveSemester();
  const subjects          = useSubjects() || [];
  const calendarEvents    = useCalendarEvents() || [];
  const profile           = useProfileStore(state => state.profile);
  const theme             = useUIStore(state => state.theme);
  const toggleTheme       = useUIStore(state => state.toggleTheme);
  const navigateToSubview = useUIStore(state => state.navigateToSubview);
  const authStatus        = useAuthStore(state => state.status);
  const activation        = useAuthStore(state => state.activation);
  const signOut           = useAuthStore(state => state.signOut);

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

      // Clear existing data and import backup in a single atomic transaction
      let totalRows = 0;
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map(table => table.clear()));
        for (const table of db.tables) {
          const rows = backup[table.name];
          if (Array.isArray(rows) && rows.length > 0) {
            await table.bulkAdd(rows);
            totalRows += rows.length;
          }
        }
      });

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

  const overline: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 'var(--text-2xs)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };
  const overlineBar: React.CSSProperties = {
    width: 3,
    height: 14,
    borderRadius: 2,
    background: 'var(--color-primary)',
    flexShrink: 0,
  };

  return (
    <div style={{ padding: 'var(--space-md)', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Profile Header — white card hero with avatar ring */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--space-lg)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            padding: 3,
            background: 'var(--bg-card-tint)',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.4rem',
            }}
          >
            {profile?.name?.trim()?.charAt(0)?.toUpperCase() || <User size={28} />}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {profile?.name || 'Your Profile'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {activeSemester?.label || 'B.Tech AI & DS — ADIT'}
          </p>
        </div>
      </div>

      {/* Account (Phase B — only when activated via Supabase) */}
      {authStatus === 'activated' && activation && (
        <div
          style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-card)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'var(--bg-card-tint)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={19} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'Activated device'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.email || `Key ${activation.codePreview}`}
                </div>
              </div>
            </div>
            <Badge tone={activation.role === 'owner' ? 'danger' : 'accent'}>
              {activation.role}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
            {(activation.role === 'admin' || activation.role === 'owner') && (
              <GlassButton variant="subtle" size="sm" onClick={() => navigateToSubview('admin-portal')}>
                <Settings2 size={14} /> Admin Portal
              </GlassButton>
            )}
            <GlassButton variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={14} /> Sign out (remove from this device)
            </GlassButton>
          </div>
        </div>
      )}

      {/* Academic Setup & Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Academic Management
        </div>

        <QuickLink
          label="Semesters & Dates"
          value={activeSemester?.label || 'None Active'}
          icon={<Calendar size={18} />}
          onClick={() => navigateToSubview('semester-setup')}
        />
        <QuickLink
          label="Manage Subjects"
          value={`${subjects.length} active`}
          icon={<BookMarked size={18} />}
          accent="var(--color-secondary)"
          onClick={() => navigateToSubview('manage-subjects')}
        />
        <QuickLink
          label="Build Timetable Pattern"
          icon={<Sliders size={18} />}
          accent="var(--color-success)"
          onClick={() => navigateToSubview('timetable-builder')}
        />
        <QuickLink
          label="Import Timetable JSON"
          icon={<FileCode size={18} />}
          accent="var(--color-warning)"
          onClick={() => navigateToSubview('timetable-import')}
        />
        <QuickLink
          label="Import Academic Calendar JSON"
          icon={<Calendar size={18} />}
          accent="var(--color-secondary)"
          onClick={() => navigateToSubview('calendar-import')}
        />
        <QuickLink
          label="Calendar Events"
          value={`${calendarEvents.length} events`}
          icon={<CalendarDays size={18} />}
          accent="var(--color-secondary)"
          onClick={() => navigateToSubview('calendar-events')}
        />
      </div>

      {/* Academic Directory & Resources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Directory & Shelf
        </div>

        <QuickLink
          label="Faculty Directory"
          icon={<Users size={18} />}
          onClick={() => navigateToSubview('directory')}
        />
        <QuickLink
          label="Resources Shelf"
          icon={<BookOpen size={18} />}
          accent="var(--color-secondary)"
          onClick={() => navigateToSubview('resources')}
        />
      </div>

      {/* Preferences */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Preferences
        </div>
        <QuickLink
          label="Appearance"
          value={`${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`}
          icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          accent="var(--color-warning)"
          onClick={toggleTheme}
        />
        <QuickLink
          label="Design System (Academic Core)"
          icon={<Palette size={18} />}
          accent="var(--color-secondary)"
          onClick={() => navigateToSubview('style-guide')}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Semester Status
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatTile value={subjects.length} label="Courses" valueColor="var(--color-primary)" />
          <StatTile value={totalCredits} label="Credits" valueColor="var(--color-success)" />
          <StatTile value={calendarEvents.length} label="Events" />
        </div>
      </div>

      {/* Storage & Reset */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Storage & Data
        </div>
        <div
          style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-card)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-card-tint)',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              <HardDrive size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Local IndexedDB Storage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>All data is stored offline on this device. Zero cloud dependency.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
            <GlassButton variant="ghost" size="sm" onClick={exportBackupJSON} style={{ flex: 1, minWidth: 130 }}>
              <Download size={15} /> Backup Data
            </GlassButton>

            <label
              style={{
                flex: 1,
                minWidth: 130,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 12px',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                userSelect: 'none',
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

            <GlassButton
              variant="danger"
              size="sm"
              style={{ flex: 1, minWidth: 150 }}
              onClick={() => {
                setConfirmInput('');
                setIsConfirmingClear(true);
              }}
            >
              <Trash2 size={15} /> Clear All Data
            </GlassButton>
          </div>

          {restoreError && (
            <div style={{ padding: 10, borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {restoreError}
            </div>
          )}
          {restoreSuccess && (
            <div style={{ padding: 10, borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ Backup restored successfully! Data has been replaced.
            </div>
          )}
          {isExported && (
            <div style={{ padding: 10, borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ JSON backup downloaded to your device.
            </div>
          )}
        </div>
      </div>

      {/* Active Courses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={overline}>
          <span style={overlineBar} />
          Active Courses ({subjects.length})
        </div>
        {subjects.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
            No courses. Go to Manage Subjects to add your real ADIT subjects.
          </p>
        ) : (
          subjects.map(s => (
            <div
              key={s.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px var(--space-md)',
                paddingLeft: 'calc(var(--space-md) + 4px)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: s.color,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {s.code} · {s.credits}cr
              </span>
            </div>
          ))
        )}
      </div>

      {/* App info */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--space-sm)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
          Student Academic OS · v0.1.0 · Phase 1.5
        </p>
      </div>

      {/* Confirmation Sheet */}
      <BottomSheet open={isConfirmingClear} onClose={() => setIsConfirmingClear(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)' }}>
            <AlertTriangle size={24} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Wipe All Local Data?</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This will permanently delete <strong>all sample/local data</strong> including:
          </p>
          <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Semesters & Date ranges</li>
            <li>Subjects & Course codes</li>
            <li>Lecture Slots & Timetable patterns</li>
            <li>Attendance Records & Edit histories</li>
            <li>Tasks, Study Notes, Exams, & Resources</li>
          </ul>

          <div style={{ padding: 10, backgroundColor: 'var(--color-info-bg)', borderRadius: 'var(--radius-card)', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
            ℹ A JSON backup will be exported automatically to your downloads folder before deletion.
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="DELETE"
              className="input"
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <GlassButton
              variant={confirmInput.trim().toUpperCase() === 'DELETE' ? 'danger' : 'subtle'}
              style={{ flex: 1 }}
              disabled={confirmInput.trim().toUpperCase() !== 'DELETE'}
              onClick={handleClearAllData}
            >
              Export & Wipe All Data
            </GlassButton>
            <GlassButton variant="ghost" onClick={() => setIsConfirmingClear(false)}>
              Cancel
            </GlassButton>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
export default ProfileView;
