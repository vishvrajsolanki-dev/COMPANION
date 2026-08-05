import React from 'react';
import { useActiveSemester, useSubjects } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { Moon, Sun, Shield, HardDrive, Users, BookOpen, ChevronRight } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const activeSemester   = useActiveSemester();
  const subjects         = useSubjects() || [];
  const theme            = useUIStore(state => state.theme);
  const toggleTheme      = useUIStore(state => state.toggleTheme);
  const navigateToSubview = useUIStore(state => state.navigateToSubview);

  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);

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

      {/* Academic Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Academic</h3>

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

      {/* Storage */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Storage</h3>
        <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={20} color="var(--color-accent-primary)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Local IndexedDB Storage</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>All data is stored offline on this device. Zero cloud dependency.</div>
          </div>
        </div>
      </div>

      {/* Active Courses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '4px' }}>Active Courses ({subjects.length})</h3>
        {subjects.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              {s.code} · {s.credits}cr
            </span>
          </div>
        ))}
      </div>

      {/* App info */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--space-sm)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
          Student Academic OS · v0.1.0 · Phase 1 MVP
        </p>
      </div>
    </div>
  );
};
export default ProfileView;
