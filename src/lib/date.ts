/**
 * Date helpers that work on "YYYY-MM-DD" strings only.
 * Everything is treated as a plain calendar date — no timezone maths, because
 * an attendance day is a calendar day, not an instant.
 */

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function dayOfWeek(iso: string): number {
  return toDate(iso).getUTCDay();
}

export function datesBetween(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  let cursor = startIso;
  while (cursor <= endIso) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return toIso(new Date(Date.UTC(y, m, 0)));
}

export function addMonths(monthIso: string, months: number): string {
  const [y, m] = monthIso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return toIso(d).slice(0, 7);
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatMonth(monthIso: string): string {
  const [y, m] = monthIso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

export function formatDayName(iso: string): string {
  return DAY_NAMES[dayOfWeek(iso)];
}

export function formatTime(timestamp: string | null): string {
  if (!timestamp) return '—';
  return timestamp.slice(11, 16);
}

export function formatTimestamp(timestamp: string): string {
  return `${formatDate(timestamp.slice(0, 10))}, ${formatTime(timestamp)}`;
}

/** Whole days between two dates, inclusive of both ends. */
export function inclusiveDayCount(startIso: string, endIso: string): number {
  return datesBetween(startIso, endIso).length;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
