import { useEffect } from 'react';
import { useUIStore, TabType, SubviewType } from '../store/uiStore';

export const HASH_NAVIGATE_EVENT = 'academic-hash-navigate';

export interface LocationState {
  hash: string;
  tab: TabType;
  subview: SubviewType | null;
  params: Record<string, string>;
}

// Canonical Hash Definitions
export const CANONICAL_HASHES = {
  today: '#today',
  planTimetable: '#plan/timetable',
  planCalendar: '#plan/calendar',
  planSubjects: '#plan/subjects',
  planSemester: '#plan/semester',
  planBuilder: '#plan/builder',
  planImport: '#plan/import',
  studyTasks: '#study/tasks',
  studyNotes: '#study/notes',
  studyExams: '#study/exams',
  studyResources: '#study/resources',
  studyAnalytics: '#study/analytics',
  studyAttendance: '#study/attendance',
  account: '#account',
  accountAppearance: '#account/appearance',
  accountDataSync: '#account/data-sync',
  accountFaculty: '#account/faculty',
  accountAdmin: '#account/admin',
  accountStyleGuide: '#account/style-guide',
} as const;

// Mapping matrix between URL Hash paths and UI state
export function parseHash(hashString: string): LocationState {
  const rawHash = hashString.startsWith('#') ? hashString.slice(1) : hashString;
  const [pathPart, queryPart] = rawHash.split('?');

  const params: Record<string, string> = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }

  const cleanPath = (pathPart || 'today').toLowerCase().trim();

  // Legacy mappings table
  const legacyMap: Record<string, string> = {
    'home': 'today',
    'schedule': 'plan/timetable',
    'tasks': 'study/tasks',
    'profile': 'account',
    'notes': 'study/notes',
    'exams': 'study/exams',
    'resources': 'study/resources',
    'analytics': 'study/analytics',
    'attendance': 'study/attendance',
    'directory': 'account/faculty',
    'faculty': 'account/faculty',
    'semester-setup': 'plan/semester',
    'manage-subjects': 'plan/subjects',
    'timetable-builder': 'plan/builder',
    'timetable-import': 'plan/import',
    'calendar-import': 'plan/calendar',
    'calendar-events': 'plan/calendar',
    'admin-portal': 'account/admin',
    'style-guide': 'account/style-guide',
    'plan': 'plan/timetable',
    'study': 'study/tasks',
  };

  const resolvedPath = legacyMap[cleanPath] || cleanPath;

  let tab: TabType = 'home';
  let subview: SubviewType | null = null;

  if (resolvedPath === 'today') {
    tab = 'home';
    subview = null;
  } else if (resolvedPath.startsWith('plan')) {
    tab = 'schedule';
    if (resolvedPath === 'plan' || resolvedPath === 'plan/timetable') subview = null;
    else if (resolvedPath.includes('calendar')) subview = 'calendar-events';
    else if (resolvedPath.includes('subjects')) subview = 'manage-subjects';
    else if (resolvedPath.includes('semester')) subview = 'semester-setup';
    else if (resolvedPath.includes('builder')) subview = 'timetable-builder';
    else if (resolvedPath.includes('import')) subview = 'timetable-import';
    else subview = 'not-found';
  } else if (resolvedPath.startsWith('study')) {
    tab = 'tasks';
    if (resolvedPath === 'study' || resolvedPath === 'study/tasks') subview = null;
    else if (resolvedPath.includes('notes')) subview = 'notes';
    else if (resolvedPath.includes('exams')) subview = 'exams';
    else if (resolvedPath.includes('resources')) subview = 'resources';
    else if (resolvedPath.includes('analytics')) subview = 'analytics';
    else if (resolvedPath.includes('attendance')) subview = 'attendance';
    else subview = 'not-found';
  } else if (resolvedPath.startsWith('account')) {
    tab = 'profile';
    if (resolvedPath === 'account' || resolvedPath === 'account/appearance' || resolvedPath === 'account/data-sync') subview = null;
    else if (resolvedPath.includes('faculty') || resolvedPath.includes('directory')) subview = 'directory';
    else if (resolvedPath.includes('admin')) subview = 'admin-portal';
    else if (resolvedPath.includes('style-guide')) subview = 'style-guide';
    else subview = 'not-found';
  } else {
    subview = 'not-found';
  }

  const canonicalHash = `#${resolvedPath}${queryPart ? `?${queryPart}` : ''}`;

  return {
    hash: canonicalHash,
    tab,
    subview,
    params,
  };
}

/** Single canonical navigation dispatch function. */
export function navigateTo(targetHash: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return;

  const formattedHash = targetHash.startsWith('#') ? targetHash : `#${targetHash}`;
  
  // Prevent duplicate history entries if navigating to current location
  if (window.location && window.location.hash === formattedHash && !options?.replace) {
    return;
  }

  if (window.history) {
    if (options?.replace) {
      window.history.replaceState(null, '', formattedHash);
    } else {
      window.history.pushState(null, '', formattedHash);
    }
  }

  // Dispatch custom window event so state updates immediately without waiting for popstate
  window.dispatchEvent(new CustomEvent(HASH_NAVIGATE_EVENT, { detail: { hash: formattedHash } }));
}

/** Hook that binds URL hash state with uiStore Zustand state. */
export function useHashLocation() {
  const { setActiveTab, navigateToSubview, closeSubview } = useUIStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncStateFromHash = () => {
      const currentHash = window.location.hash || '#today';
      const parsed = parseHash(currentHash);

      // Perform legacy hash URL rewrite if needed without creating extra history entry
      if (currentHash !== parsed.hash && window.history) {
        window.history.replaceState(null, '', parsed.hash);
      }

      // Sync Zustand store
      if (parsed.subview) {
        navigateToSubview(parsed.subview, {
          subjectId: parsed.params.subjectId || parsed.params.subject_id,
          examId: parsed.params.examId || parsed.params.exam_id,
          noteId: parsed.params.noteId || parsed.params.note_id,
        });
      } else {
        closeSubview();
        setActiveTab(parsed.tab);
      }
    };

    // Initial load sync
    syncStateFromHash();

    const handleNavigationEvent = () => syncStateFromHash();

    window.addEventListener('popstate', handleNavigationEvent);
    window.addEventListener('hashchange', handleNavigationEvent);
    window.addEventListener(HASH_NAVIGATE_EVENT, handleNavigationEvent);

    return () => {
      window.removeEventListener('popstate', handleNavigationEvent);
      window.removeEventListener('hashchange', handleNavigationEvent);
      window.removeEventListener(HASH_NAVIGATE_EVENT, handleNavigationEvent);
    };
  }, [setActiveTab, navigateToSubview, closeSubview]);
}
