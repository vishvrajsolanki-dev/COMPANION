// Real-date engine — replaces the hardcoded "simulated Aug 5 2026" logic.
// All helpers derive from the actual system clock so the app stays correct
// on any real date.

/** "YYYY-MM-DD" for the current local date. */
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "HH:MM" (24h) for the current local time. */
export const nowMinutes = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** True when an ISO date/datetime string falls on the current local date. */
export const isToday = (iso: string, ref: Date = new Date()): boolean => {
  const t = new Date(iso);
  return t.getFullYear() === ref.getFullYear()
    && t.getMonth() === ref.getMonth()
    && t.getDate() === ref.getDate();
};

/** "YYYY-MM-DD" portion of an ISO string. */
export const datePart = (iso: string): string => iso.split('T')[0];

/** "HH:MM" portion of an ISO datetime string. */
export const timePart = (iso: string): string =>
  iso.split('T')[1]?.substring(0, 5) || '';

/** Weekday as 0–6 (0 = Sunday), same as Date#getDay. */
export const weekdayNum = (iso: string): number => new Date(iso).getDay();

/** e.g. "Wednesday, Aug 5" from a Date (or today by default). */
export const formatHeaderDate = (d: Date = new Date()): string =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

/** "Wednesday" from a Date (or today by default). */
export const weekdayName = (d: Date = new Date()): string =>
  d.toLocaleDateString('en-US', { weekday: 'long' });

/** Adds n days to "YYYY-MM-DD" and returns "YYYY-MM-DD". */
export const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayISOFrom(d);
};

function todayISOFrom(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

