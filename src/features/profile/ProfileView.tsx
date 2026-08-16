import React, { useState, useEffect } from 'react';
import { useActiveSemester, useSubjects, useCalendarEvents } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { QuickLink, StatTile, Button, Card, BottomSheet, Badge, SegmentedControl, ConfirmDialog } from '../../components/ui';
import { signOutSession } from '../../lib/accessKeys';
import { getDeviceId } from '../../lib/deviceId';
import { exportJSONFile } from '../../lib/fileExport';
import {
  Moon, Sun, HardDrive, Users, BookOpen, Calendar, CalendarDays,
  BookMarked, Sliders, Trash2, Download, AlertTriangle, FileCode, Upload, User,
  ShieldCheck, LogOut, Settings2, Palette, RefreshCw, CheckCircle, Smartphone
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const activeSemester    = useActiveSemester();
  const subjects          = useSubjects() || [];
  const calendarEvents    = useCalendarEvents() || [];
  const profile           = useProfileStore(state => state.profile);
  const theme             = useUIStore(state => state.theme);
  const toggleTheme       = useUIStore(state => state.toggleTheme);
  const setTheme          = useUIStore(state => state.setTheme);
  const authStatus        = useAuthStore(state => state.status);
  const activation        = useAuthStore(state => state.activation);
  const signOut           = useAuthStore(state => state.signOut);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [confirmInput, setConfirmInput]           = useState('');
  const [isExported, setIsExported]               = useState(false);
  const [restoreError, setRestoreError]           = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess]       = useState(false);

  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);

  // Deep-linking scroll listener for #account/appearance and #account/data-sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash === '#account/appearance' || hash.includes('appearance')) {
      const el = document.getElementById('appearance-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#account/data-sync' || hash.includes('data-sync')) {
      const el = document.getElementById('data-sync-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // 1. Export JSON backup of all tables.
  const exportBackupJSON = async () => {
    const tableData = await Promise.all(
      db.tables.map(async (table) => [table.name, await table.toArray()] as const),
    );
    const backup: Record<string, any[]> = Object.fromEntries(tableData);

    const filename = `academic_os_backup_${new Date().toISOString().split('T')[0]}.json`;
    await exportJSONFile(filename, backup);
    setIsExported(true);
    return backup;
  };

  // 2. Import JSON backup into IndexedDB
  const importBackupJSON = async (file: File) => {
    setRestoreError(null);
    setRestoreSuccess(false);

    try {
      const text = await file.text();
      const backup: Record<string, any[]> = JSON.parse(text);

      if (typeof backup !== 'object' || backup === null) {
        throw new Error('Invalid backup format — expected a JSON object with table names as keys.');
      }

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

      localStorage.removeItem('academic_os_user_cleared');
      setRestoreSuccess(true);
      console.log(`Restore complete: ${totalRows} rows across ${db.tables.length} tables.`);
    } catch (err) {
      console.error('Restore failed:', err);
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore backup. Ensure the file is a valid JSON backup from this app.');
    }
  };

  // 3. Perform safe reset (export backup → clear server session → wipe IndexedDB)
  const handleClearAllData = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE') return;

    setIsConfirmingClear(false);
    await exportBackupJSON();

    if (activation?.accountId) {
      await signOutSession(activation.accountId, getDeviceId()).catch(() => {});
    }

    localStorage.setItem('academic_os_user_cleared', 'true');

    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map(table => table.clear()));
    });

    navigateTo(CANONICAL_HASHES.planSemester);
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--on-surface-variant, #444750)',
    fontFamily: 'var(--font-mono)',
  };
  const sectionBar: React.CSSProperties = {
    width: 3,
    height: 14,
    borderRadius: 2,
    background: 'var(--primary, #001e4c)',
    flexShrink: 0,
  };

  return (
    <div style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-lg, 24px)', backgroundColor: 'var(--bg-page)' }} data-testid="account-view">
      <h1 className="sr-only">Account Hub</h1>

      {/* Screen Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Account Hub</h2>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
          Settings, Security & Data Management
        </div>
      </header>

      {/* Subview Quick Links */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.account)}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--primary, #001e4c)',
            color: 'var(--on-primary, #ffffff)',
            border: 'none',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Account
        </button>
        <button
          data-testid="faculty-directory-link"
          onClick={() => navigateTo(CANONICAL_HASHES.accountFaculty)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            color: 'var(--on-surface, #1a1c1c)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={14} /> Faculty Directory
        </button>
        {(activation?.role === 'admin' || activation?.role === 'owner') && (
          <button
            onClick={() => navigateTo(CANONICAL_HASHES.accountAdmin)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full, 9999px)',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'var(--font-primary)',
              backgroundColor: 'var(--surface-container-low, #f4f3f2)',
              color: 'var(--on-surface, #1a1c1c)',
              border: '1px solid var(--outline-variant, #c4c6d1)',
              minHeight: '36px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ShieldCheck size={14} /> Admin Portal
          </button>
        )}
      </div>

      {/* Profile Header Card */}
      <Card
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--stack-md, 16px)',
          padding: 'var(--stack-lg, 24px)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            padding: 3,
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
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
              backgroundColor: 'var(--primary, #001e4c)',
              color: 'var(--on-primary, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.4rem',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {profile?.name?.trim()?.charAt(0)?.toUpperCase() || <User size={28} />}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>
            {profile?.name || 'Your Profile'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2 }}>
            {activeSemester?.label || 'B.Tech AI & DS — ADIT'}
          </p>
        </div>
      </Card>

      {/* Account & Device Security (Activated Session) */}
      {authStatus === 'activated' && activation && (
        <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                  color: 'var(--primary, #001e4c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'Activated Device'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.email || `Key ${activation.codePreview}`}
                </div>
              </div>
            </div>
            <Badge tone={activation.role === 'owner' ? 'danger' : activation.role === 'admin' ? 'accent' : 'neutral'}>
              {activation.role}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
            {(activation.role === 'admin' || activation.role === 'owner') && (
              <Button variant="subtle" size="sm" onClick={() => navigateTo(CANONICAL_HASHES.accountAdmin)}>
                <Settings2 size={14} /> Admin Portal
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={14} /> Sign out of device
            </Button>
          </div>
        </Card>
      )}

      {/* Appearance Section */}
      <div id="appearance-section" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Appearance Preferences
        </div>
        <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {theme === 'dark' ? <Moon size={20} color="var(--primary, #001e4c)" /> : <Sun size={20} color="var(--primary, #001e4c)" />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)' }}>Theme Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)' }}>Current: {theme.toUpperCase()}</div>
              </div>
            </div>

            <SegmentedControl
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={theme}
              onChange={val => setTheme(val as 'light' | 'dark')}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', lineHeight: 1.4 }}>
            Academic OS uses a light-first tonal surface container system with full dark mode parity across all screens.
          </p>
        </Card>
      </div>

      {/* Academic Setup & Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Academic Management
        </div>

        <QuickLink
          label="Semesters & Dates"
          value={activeSemester?.label || 'None Active'}
          icon={<Calendar size={18} />}
          onClick={() => navigateTo(CANONICAL_HASHES.planSemester)}
        />
        <QuickLink
          label="Manage Subjects"
          value={`${subjects.length} active`}
          icon={<BookMarked size={18} />}
          accent="var(--secondary, #5a54a4)"
          onClick={() => navigateTo(CANONICAL_HASHES.planSubjects)}
        />
        <QuickLink
          label="Build Timetable Pattern"
          icon={<Sliders size={18} />}
          accent="var(--success-attendance, #0f336d)"
          onClick={() => navigateTo(CANONICAL_HASHES.planBuilder)}
        />
        <QuickLink
          label="Import Timetable JSON"
          icon={<FileCode size={18} />}
          accent="var(--color-warning, #d97706)"
          onClick={() => navigateTo(CANONICAL_HASHES.planImport)}
        />
        <QuickLink
          label="Import Academic Calendar JSON"
          icon={<Calendar size={18} />}
          accent="var(--secondary, #5a54a4)"
          onClick={() => navigateTo(CANONICAL_HASHES.planCalendar)}
        />
        <QuickLink
          label="Calendar Events"
          value={`${calendarEvents.length} events`}
          icon={<CalendarDays size={18} />}
          accent="var(--secondary, #5a54a4)"
          onClick={() => navigateTo(CANONICAL_HASHES.planCalendar)}
        />
      </div>

      {/* Academic Directory & Resources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Directory & Shelf
        </div>

        <QuickLink
          label="Faculty Directory"
          icon={<Users size={18} />}
          onClick={() => navigateTo(CANONICAL_HASHES.accountFaculty)}
        />
        <QuickLink
          label="Resources Shelf"
          icon={<BookOpen size={18} />}
          accent="var(--secondary, #5a54a4)"
          onClick={() => navigateTo(CANONICAL_HASHES.studyResources)}
        />
        <QuickLink
          label="Design System (Style Guide)"
          icon={<Palette size={18} />}
          accent="var(--secondary, #5a54a4)"
          onClick={() => navigateTo(CANONICAL_HASHES.accountStyleGuide)}
        />
      </div>

      {/* Semester Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Semester Status Overview
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatTile value={subjects.length} label="Courses" valueColor="var(--primary, #001e4c)" />
          <StatTile value={totalCredits} label="Credits" valueColor="var(--success-attendance, #0f336d)" />
          <StatTile value={calendarEvents.length} label="Events" />
        </div>
      </div>

      {/* Storage & Data & Sync Section */}
      <div id="data-sync-section" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Storage & Data & Sync
        </div>
        <Card style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                  color: 'var(--primary, #001e4c)',
                  flexShrink: 0,
                }}
              >
                <HardDrive size={20} />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)' }}>Local IndexedDB Storage</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', marginTop: 2 }}>
                  All student data is stored offline locally on this device.
                </div>
              </div>
            </div>
            <Badge tone="success">Offline Ready</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="subtle" size="sm" onClick={exportBackupJSON} style={{ flex: 1, minHeight: 44 }}>
                <Download size={15} /> Backup Data
              </Button>

              <label
                style={{
                  flex: 1,
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                  border: '1px solid var(--outline-variant, #c4c6d1)',
                  color: 'var(--on-surface, #1a1c1c)',
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
            </div>

            <Button
              variant="danger"
              size="md"
              style={{ width: '100%', minHeight: 44 }}
              onClick={() => {
                setConfirmInput('');
                setIsConfirmingClear(true);
              }}
            >
              <Trash2 size={15} /> Clear All Data
            </Button>
          </div>

          {restoreError && (
            <div style={{ padding: 12, borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', fontWeight: 600 }}>
              {restoreError}
            </div>
          )}
          {restoreSuccess && (
            <div style={{ padding: 12, borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', border: '1px solid var(--outline-variant, #c4c6d1)', color: 'var(--success-attendance, #0f336d)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ Backup restored successfully! Local data has been updated.
            </div>
          )}
          {isExported && (
            <div style={{ padding: 12, borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--surface-container-low, #f4f3f2)', border: '1px solid var(--outline-variant, #c4c6d1)', color: 'var(--primary, #001e4c)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ JSON backup exported to your device.
            </div>
          )}
        </Card>
      </div>

      {/* Active Courses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionBar} />
          Active Courses ({subjects.length})
        </div>
        {subjects.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)', textAlign: 'center', padding: 12 }}>
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
                padding: '12px 16px',
                paddingLeft: 'calc(16px + 4px)',
                backgroundColor: 'var(--surface-container-lowest, #ffffff)',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--outline-variant, #c4c6d1)',
                minHeight: '48px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: s.color,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{s.name}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--on-surface-variant, #444750)' }}>
                {s.code} · {s.credits}cr
              </span>
            </div>
          ))
        )}
      </div>

      {/* Support / App Info */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--stack-sm, 8px)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
          Student Academic OS · v0.1.0 · Phase 1.5
        </p>
      </div>

      {/* Clear Data Confirmation Sheet */}
      <BottomSheet
        open={isConfirmingClear}
        onClose={() => setIsConfirmingClear(false)}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant={confirmInput.trim().toUpperCase() === 'DELETE' ? 'danger' : 'subtle'}
              style={{ flex: 1 }}
              disabled={confirmInput.trim().toUpperCase() !== 'DELETE'}
              onClick={handleClearAllData}
            >
              Export & Wipe All Data
            </Button>
            <Button variant="ghost" onClick={() => setIsConfirmingClear(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--error, #ba1a1a)' }}>
            <AlertTriangle size={24} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Wipe All Local Data?</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)', lineHeight: 1.5 }}>
            This will permanently delete <strong>all sample/local data</strong> including:
          </p>
          <ul style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant, #444750)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Semesters & Date ranges</li>
            <li>Subjects & Course codes</li>
            <li>Lecture Slots & Timetable patterns</li>
            <li>Attendance Records & Edit histories</li>
            <li>Tasks, Study Notes, Exams, & Resources</li>
          </ul>

          <div style={{ padding: 12, backgroundColor: 'var(--surface-container-low, #f4f3f2)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--outline-variant, #c4c6d1)', fontSize: '0.8rem', color: 'var(--primary, #001e4c)' }}>
            ℹ A JSON backup will be exported automatically to your device before deletion.
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant, #444750)' }}>
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="DELETE"
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
            />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
export default ProfileView;
