import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/accessKeys', () => ({
  activateAccessKey: vi.fn(),
  signOutSession: vi.fn(),
}));
vi.mock('../lib/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device'),
  getDeviceName: vi.fn(() => 'Test Browser'),
}));
vi.mock('../db/seeds', () => ({ ensureAccountData: vi.fn() }));

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

const validResult = {
  ok: true as const,
  role: 'student' as const,
  accountId: 'account-1',
  sessionToken: 'session-1',
  profile: { id: 'profile-1', name: 'Student', email: null, role: 'student' as const },
  needsOnboarding: false,
};

async function loadStore() {
  vi.resetModules();
  vi.stubGlobal('window', { localStorage });
  vi.stubGlobal('localStorage', localStorage);
  return import('./authStore');
}

describe('authStore activation state', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('does not persist or activate after an invalid key', async () => {
    const { activateAccessKey } = await import('../lib/accessKeys');
    vi.mocked(activateAccessKey).mockResolvedValue({ ok: false, error: 'INVALID_KEY' });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().activate('INVALID-TEST-KEY');

    expect(useAuthStore.getState()).toMatchObject({ status: 'error', activation: null });
    expect(localStorage.getItem('academic_os_activation')).toBeNull();
  });

  it('persists a valid activation', async () => {
    const { activateAccessKey } = await import('../lib/accessKeys');
    vi.mocked(activateAccessKey).mockResolvedValue(validResult);
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().activate('VALID-TEST-KEY');

    expect(useAuthStore.getState()).toMatchObject({ status: 'activated', activation: { accountId: 'account-1' } });
    expect(JSON.parse(localStorage.getItem('academic_os_activation')!)).toMatchObject({ accountId: 'account-1' });
  });

  it('preserves onboarding intent from a valid activation', async () => {
    const { activateAccessKey } = await import('../lib/accessKeys');
    vi.mocked(activateAccessKey).mockResolvedValue({ ...validResult, needsOnboarding: true });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().activate('VALID-TEST-KEY');

    expect(useAuthStore.getState().activation?.needsOnboarding).toBe(true);
  });

  it('hydrates an existing valid activation', async () => {
    localStorage.setItem('academic_os_activation', JSON.stringify({
      role: 'student', accountId: 'account-1', profileId: 'profile-1', sessionToken: 'session-1',
      codePreview: 'VALID…', activatedAt: '2026-08-20T00:00:00.000Z',
    }));

    const { useAuthStore } = await loadStore();

    expect(useAuthStore.getState()).toMatchObject({ status: 'activated', activation: { accountId: 'account-1' } });
  });
});
