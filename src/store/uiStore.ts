import { create } from 'zustand';

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
  | 'calendar-import';

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
  theme: 'dark', // Linear dark mode is the primary experience

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
    return { theme: nextTheme };
  }),
}));
