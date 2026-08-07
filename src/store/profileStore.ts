import { create } from 'zustand';

export interface Profile {
  name: string;
  email?: string;
  role: 'student' | 'admin' | 'owner';
  id?: string;
}

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

const STORAGE_KEY = 'academic_os_profile';

// Identity is decoupled from the hardcoded "Vishvraj" greeting. Phase B replaces
// this localStorage-backed stub with the real Supabase profile.
const readStored = (): Profile | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
};

export const useProfileStore = create<ProfileState>(set => ({
  profile: typeof window !== 'undefined' ? readStored() : null,
  setProfile: profile => {
    set({ profile });
    try {
      if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — in-memory only */
    }
  },
}));

/** First name for greeting ("Good morning, Alex") or null when anonymous. */
export const profileFirstName = (p: Profile | null): string | null =>
  p?.name?.trim() ? p.name.trim().split(/\s+/)[0] : null;
