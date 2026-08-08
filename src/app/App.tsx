import React, { Suspense, useEffect, useState } from 'react';
import { seedDatabaseIfEmpty } from '../db/seeds';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { supabaseConfigured } from '../lib/supabase';
import { TabBar } from '../components/layout/TabBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GlobalErrorCatcher } from '../components/GlobalErrorCatcher';
import { ToastProvider } from '../components/ui';
import { ActivationView } from '../features/auth/ActivationView';
import { OnboardingView } from '../features/auth/OnboardingView';

// Lazy-loaded views — each becomes its own chunk via code-splitting.
// Named exports are mapped to a default for React.lazy.
const QuietDashboard       = React.lazy(() => import('../features/dashboard/QuietDashboard').then(m => ({ default: m.QuietDashboard })));
const WeeklyGrid           = React.lazy(() => import('../features/timetable/WeeklyGrid').then(m => ({ default: m.WeeklyGrid })));
const TasksView            = React.lazy(() => import('../features/tasks/TasksView').then(m => ({ default: m.TasksView })));
const ProfileView          = React.lazy(() => import('../features/profile/ProfileView').then(m => ({ default: m.ProfileView })));
const AttendanceView       = React.lazy(() => import('../features/attendance/AttendanceView').then(m => ({ default: m.AttendanceView })));
const NotesView            = React.lazy(() => import('../features/notes/NotesView').then(m => ({ default: m.NotesView })));
const AnalyticsView        = React.lazy(() => import('../features/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const ExamsView            = React.lazy(() => import('../features/exams/ExamsView').then(m => ({ default: m.ExamsView })));
const ResourcesView        = React.lazy(() => import('../features/resources/ResourcesView').then(m => ({ default: m.ResourcesView })));
const DirectoryView        = React.lazy(() => import('../features/directory/DirectoryView').then(m => ({ default: m.DirectoryView })));
const SemesterSetupView    = React.lazy(() => import('../features/semester/SemesterSetupView').then(m => ({ default: m.SemesterSetupView })));
const ManageSubjectsView   = React.lazy(() => import('../features/subjects/ManageSubjectsView').then(m => ({ default: m.ManageSubjectsView })));
const TimetableBuilderView = React.lazy(() => import('../features/timetable/TimetableBuilderView').then(m => ({ default: m.TimetableBuilderView })));
const TimetableImportView  = React.lazy(() => import('../features/timetable/TimetableImportView').then(m => ({ default: m.TimetableImportView })));
const AcademicCalendarImportView = React.lazy(() => import('../features/calendar/AcademicCalendarImportView').then(m => ({ default: m.AcademicCalendarImportView })));
const CalendarEventsView   = React.lazy(() => import('../features/calendar/CalendarEventsView').then(m => ({ default: m.CalendarEventsView })));
const AdminPortalView      = React.lazy(() => import('../features/admin/AdminPortalView').then(m => ({ default: m.AdminPortalView })));
const StyleGuideView       = React.lazy(() => import('../features/design/StyleGuideView').then(m => ({ default: m.StyleGuideView })));

/** Minimal loading state shown while a lazy view chunk downloads. */
const ViewLoading: React.FC<{ scope?: string }> = ({ scope }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', backgroundColor: 'var(--bg-page)' }}>
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    {scope && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-family-mono)' }}>Loading {scope}…</span>}
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const App: React.FC = () => {
  const activeTab    = useUIStore(state => state.activeTab);
  const setActiveTab = useUIStore(state => state.setActiveTab);
  const activeSubview = useUIStore(state => state.activeSubview);
  const theme = useUIStore(state => state.theme);
  const authStatus = useAuthStore(state => state.status);
  const needsOnboarding = useAuthStore(state => state.activation?.needsOnboarding === true);

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

  // Part C gate: first-time student activation shows a one-off onboarding form
  // (name / department / enrollment number) before the app opens. Only students
  // ever see this — needsOnboarding is never set true for owners/admins.
  if (supabaseConfigured && needsOnboarding) {
    return <OnboardingView />;
  }

  const withViewBoundary = (scope: string, children: React.ReactNode) => (
    <ErrorBoundary key={scope} scope={scope}>
      <Suspense fallback={<ViewLoading scope={scope} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <ToastProvider>
      <GlobalErrorCatcher />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {/* Subviews take full screen — tab bar hides */}
          {activeSubview ? (
            <>
              {activeSubview === 'attendance'        && withViewBoundary('Attendance',       <AttendanceView />)}
              {activeSubview === 'notes'             && withViewBoundary('Notes',            <NotesView />)}
              {activeSubview === 'analytics'         && withViewBoundary('Analytics',        <AnalyticsView />)}
              {activeSubview === 'exams'             && withViewBoundary('Exams',            <ExamsView />)}
              {activeSubview === 'resources'         && withViewBoundary('Resources',        <ResourcesView />)}
              {activeSubview === 'directory'         && withViewBoundary('Directory',        <DirectoryView />)}
              {activeSubview === 'semester-setup'    && withViewBoundary('Semesters',        <SemesterSetupView />)}
              {activeSubview === 'manage-subjects'   && withViewBoundary('Subjects',         <ManageSubjectsView />)}
              {activeSubview === 'timetable-builder' && withViewBoundary('Timetable Builder', <TimetableBuilderView />)}
              {activeSubview === 'timetable-import'  && withViewBoundary('Timetable Import', <TimetableImportView />)}
              {activeSubview === 'calendar-import'   && withViewBoundary('Calendar Import',  <AcademicCalendarImportView />)}
              {activeSubview === 'calendar-events'   && withViewBoundary('Calendar Events',  <CalendarEventsView />)}
              {activeSubview === 'admin-portal'      && withViewBoundary('Admin Portal',     <AdminPortalView />)}
              {activeSubview === 'style-guide'       && withViewBoundary('Design System',    <StyleGuideView />)}
            </>
          ) : (
            <>
              {activeTab === 'home'     && withViewBoundary('Dashboard',  <QuietDashboard />)}
              {activeTab === 'schedule' && withViewBoundary('Timetable',  <WeeklyGrid />)}
              {activeTab === 'tasks'    && withViewBoundary('Tasks',      <TasksView />)}
              {activeTab === 'profile'  && withViewBoundary('Profile',    <ProfileView />)}
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
