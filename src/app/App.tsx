import React, { useEffect, useState } from 'react';
import { seedDatabaseIfEmpty } from '../db/seeds';
import { useUIStore } from '../store/uiStore';
import { TabBar } from '../components/layout/TabBar';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Main tab views
import { QuietDashboard }  from '../features/dashboard/QuietDashboard';
import { WeeklyGrid }      from '../features/timetable/WeeklyGrid';
import { TasksView }       from '../features/tasks/TasksView';
import { ProfileView }     from '../features/profile/ProfileView';

// Subviews (full-screen overlays)
import { AttendanceView }  from '../features/attendance/AttendanceView';
import { NotesView }       from '../features/notes/NotesView';
import { AnalyticsView }   from '../features/analytics/AnalyticsView';
import { ExamsView }       from '../features/exams/ExamsView';
import { ResourcesView }   from '../features/resources/ResourcesView';
import { DirectoryView }   from '../features/directory/DirectoryView';

export const App: React.FC = () => {
  const activeTab    = useUIStore(state => state.activeTab);
  const setActiveTab = useUIStore(state => state.setActiveTab);
  const activeSubview = useUIStore(state => state.activeSubview);
  const theme = useUIStore(state => state.theme);

  const [isSeeded, setIsSeeded] = useState(false);

  useEffect(() => {
    // Apply persisted theme to root before first paint
    document.documentElement.setAttribute('data-theme', theme);
    seedDatabaseIfEmpty().then(() => setIsSeeded(true));
  }, []);

  if (!isSeeded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-accent-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem' }}>
          Initialising local database…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-primary)' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {/* Subviews take full screen — tab bar hides */}
          {activeSubview ? (
            <>
              {activeSubview === 'attendance' && <AttendanceView  />}
              {activeSubview === 'notes'      && <NotesView       />}
              {activeSubview === 'analytics'  && <AnalyticsView   />}
              {activeSubview === 'exams'      && <ExamsView       />}
              {activeSubview === 'resources'  && <ResourcesView   />}
              {activeSubview === 'directory'  && <DirectoryView   />}
            </>
          ) : (
            <>
              {activeTab === 'home'     && <QuietDashboard />}
              {activeTab === 'schedule' && <WeeklyGrid     />}
              {activeTab === 'tasks'    && <TasksView      />}
              {activeTab === 'profile'  && <ProfileView    />}
            </>
          )}
        </main>

        {/* Bottom tab bar only when no subview is active */}
        {!activeSubview && (
          <TabBar activeTab={activeTab} onSelectTab={setActiveTab} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
