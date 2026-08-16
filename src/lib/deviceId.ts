const STORAGE_KEY = 'academic_os_device_id';

function generateId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A stable per-device identifier, persisted in localStorage. The same browser
 * on the same device always returns the same value, so re-activation after a
 * sign-out is recognized as the same device (idempotent session, not a new one).
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable (private mode) — fall back to an ephemeral id.
    return generateId();
  }
}

/** Human-readable device label shown in the Admin Portal sessions list. */
export function getDeviceName(): string {
  // navigator.userAgentData is a newer API not in all TS DOM libs; cast to
  // avoid TS errors on browsers that don't expose it yet.
  const uad = (navigator as Navigator & { userAgentData?: { platform?: string; brands?: Array<{ brand: string; version: string }> } }).userAgentData;
  const platform = uad?.platform ?? navigator.platform ?? '';
  const brands: string[] =
    uad?.brands?.map((b: { brand: string }) => b.brand.replace(/[^A-Za-z0-9 ]/g, '')).filter(Boolean) ?? [];
  const engine =
    brands.find((b: string) => /Chrome|Firefox|Safari|Edge|Opera/i.test(b)) ??
    navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)[/ ]([\d.]+)/)?.[1] ??
    'Browser';
  const os = platform.replace(/[\s]+/g, ' ').trim() || 'Device';
  return `${engine} on ${os}`;
}
