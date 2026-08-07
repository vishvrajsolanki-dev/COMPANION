import React, { useEffect, useState } from 'react';
import { seedDatabaseIfEmpty } from '../db/seeds';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { supabaseConfigured } from '../lib/supabase';
import { TabBar } from '../components/layout/TabBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/ui';
import { ActivationView } from '../features/auth/ActivationView';

// Main tab views
import { QuietDashboard }  from '../features/dashboard/QuietDashboard';
import { WeeklyGrid }      from '../features/timetable/WeeklyGrid';
import { TasksView }       from '../features/tasks/TasksView';
import { ProfileView }     from '../features/profile/ProfileView';

// Subviews (full-screen overlays)
import { AttendanceView }        from '../features/attendance/AttendanceView';
import { NotesView }             from '../features/notes/NotesView';
import { AnalyticsView }         from '../features/analytics/AnalyticsView';
import { ExamsView }             from '../features/exams/ExamsView';
import { ResourcesView }         from '../features/resources/ResourcesView';
import { DirectoryView }         from '../features/directory/DirectoryView';
import { SemesterSetupView }     from '../features/semester/SemesterSetupView';
import { ManageSubjectsView }    from '../features/subjects/ManageSubjectsView';
import { TimetableBuilderView }     from '../features/timetable/TimetableBuilderView';
import { TimetableImportView }      from '../features/timetable/TimetableImportView';
import { AcademicCalendarImportView } from '../features/calendar/AcademicCalendarImportView';
import { CalendarEventsView }        from '../features/calendar/CalendarEventsView';
import { AdminPortalView }           from '../features/admin/AdminPortalView';
import { StyleGuideView }            from '../features/design/StyleGuideView';

export const App: React.FC = () => {
  const activeTab    = useUIStore(state => state.activeTab);
  const setActiveTab = useUIStore(state => state.setActiveTab);
  const activeSubview = useUIStore(state => state.activeSubview);
  const theme = useUIStore(state => state.theme);
  const authStatus = useAuthStore(state => state.status);

  const [isSeeded, setIsSeeded] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    // Apply persisted theme to root before first paint
    document.documentElement.setAttribute('data-theme', theme);
    seedDatabaseIfEmpty()
      .then(() => setIsSeeded(true))
      .catch((err: any) => {
        console.error('Seed failed:', err);
        setSeedError('Local database failed to initialise. Reload or clear site data to retry.');
      });
  }, []);

  if (seedError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--bg-page)', padding: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '1rem' }}>Database error</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: 320 }}>{seedError}</p>
        <button
          onClick={() => { setSeedError(null); setIsSeeded(false); window.location.reload(); }}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isSeeded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', background: 'var(--bg-page)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem' }}>
          Initialising local database…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Phase B gate: once a Supabase backend is configured, a device must activate
  // with an access key before the app opens. Unconfigured builds (no env vars)
  // render the app exactly as before — the gate is inert until wired up.
  if (supabaseConfigured && authStatus !== 'activated') {
    return <ActivationView />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {/* Subviews take full screen — tab bar hides */}
          {activeSubview ? (
            <>
              {activeSubview === 'attendance'        && <AttendanceView        />}
              {activeSubview === 'notes'             && <NotesView             />}
              {activeSubview === 'analytics'         && <AnalyticsView         />}
              {activeSubview === 'exams'             && <ExamsView             />}
              {activeSubview === 'resources'         && <ResourcesView         />}
              {activeSubview === 'directory'         && <DirectoryView         />}
              {activeSubview === 'semester-setup'    && <SemesterSetupView     />}
              {activeSubview === 'manage-subjects'   && <ManageSubjectsView    />}
              {activeSubview === 'timetable-builder' && <TimetableBuilderView />}
              {activeSubview === 'timetable-import'  && <TimetableImportView  />}
              {activeSubview === 'calendar-import'   && <AcademicCalendarImportView />}
              {activeSubview === 'calendar-events'   && <CalendarEventsView        />}
              {activeSubview === 'admin-portal'      && <AdminPortalView           />}
              {activeSubview === 'style-guide'       && <StyleGuideView            />}
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
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
