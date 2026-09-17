/**
 * Logical-day arithmetic.
 *
 * A "day" runs from `boundaryHour` to `boundaryHour` the next morning (default 04:00),
 * so a shutdown chain ticked off at 01:30 still lands on the day you think it does.
 *
 * All keys are `YYYY-MM-DD` strings in LOCAL time. We deliberately never store UTC
 * timestamps for day identity — that's what breaks across timezones.
 * Date maths anchors at local noon so DST transitions (23h/25h days) can't off-by-one us.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

export function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Which logical day does this instant belong to? */
export function dayKeyFor(date: Date, boundaryHour: number): string {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - boundaryHour);
  return dateToKey(shifted);
}

export function todayKey(boundaryHour: number): string {
  return dayKeyFor(new Date(), boundaryHour);
}

/** Parse a key back to a Date anchored at local noon (DST-safe). */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function addDaysToKey(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
}

export const nextDayKey = (key: string): string => addDaysToKey(key, 1);
export const prevDayKey = (key: string): string => addDaysToKey(key, -1);

/** Lexicographic comparison is valid for zero-padded ISO dates. */
export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetweenKeys(from: string, to: string): number {
  const ms = keyToDate(to).getTime() - keyToDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive range of day keys. Returns [] if `to` precedes `from`. */
export function keyRange(from: string, to: string): string[] {
  const out: string[] = [];
  if (compareKeys(from, to) > 0) return out;
  let cursor = from;
  let guard = 0;
  while (compareKeys(cursor, to) <= 0 && guard < 5000) {
    out.push(cursor);
    cursor = nextDayKey(cursor);
    guard += 1;
  }
  return out;
}

/** Milliseconds until the next logical-day rollover. Used to schedule reconciliation. */
export function msUntilNextBoundary(boundaryHour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(boundaryHour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatKeyShort(key: string): string {
  const d = keyToDate(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatKeyLong(key: string): string {
  const d = keyToDate(key);
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** 0 = Sunday. */
export function weekdayOf(key: string): number {
  return keyToDate(key).getDay();
}

/** Monday-anchored week start, used by the weekly summary. */
export function mondayOf(key: string): string {
  const dow = weekdayOf(key);
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysToKey(key, delta);
}

/**
 * How long until a given `HH:MM` local reminder time, in ms.
 * Returns null for malformed input.
 */
export function msUntilLocalTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
