import { create } from 'zustand';

const THEME_STORAGE_KEY = 'academic_os_theme';

const readTheme = (): 'light' | 'dark' => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark'; // dark is the primary experience
  } catch {
    return 'dark';
  }
};

export type TabType = 'home' | 'schedule' | 'tasks' | 'profile';
export type SubviewType =
  | 'attendance'
  | 'notes'
  | 'analytics'
  | 'exams'
  | 'resources'
  | 'directory'
  | 'semester-setup'
  | 'manage-subjects'
  | 'timetable-builder'
  | 'timetable-import'
  | 'calendar-import'
  | 'calendar-events'
  | 'admin-portal';

interface UIState {
  activeTab: TabType;
  activeSubview: SubviewType | null;
  selectedSubjectId: string | null;
  selectedExamId: string | null;
  selectedNoteId: string | null;
  theme: 'light' | 'dark';

  setActiveTab: (tab: TabType) => void;
  navigateToSubview: (subview: SubviewType, data?: { subjectId?: string; examId?: string; noteId?: string }) => void;
  closeSubview: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'home',
  activeSubview: null,
  selectedSubjectId: null,
  selectedExamId: null,
  selectedNoteId: null,
  theme: typeof window !== 'undefined' ? readTheme() : 'dark',

  setActiveTab: (tab) => set({ activeTab: tab, activeSubview: null }),
  navigateToSubview: (subview, data) => set({
    activeSubview: subview,
    selectedSubjectId: data?.subjectId || null,
    selectedExamId: data?.examId || null,
    selectedNoteId: data?.noteId || null,
  }),
  closeSubview: () => set({
    activeSubview: null,
    selectedSubjectId: null,
    selectedExamId: null,
    selectedNoteId: null,
  }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      /* ignore — persistence is best-effort */
    }
    return { theme: nextTheme };
  }),
}));
