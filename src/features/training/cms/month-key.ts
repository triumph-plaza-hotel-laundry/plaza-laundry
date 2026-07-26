/** Africa/Cairo calendar month helpers for Training CMS. */

const CAIRO_TZ = 'Africa/Cairo';

function cairoParts(date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
  return { year, month };
}

/** Returns YYYY-MM for the current Africa/Cairo calendar month. */
export function getCurrentTrainingMonthKey(date = new Date()): string {
  const { year, month } = cairoParts(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Returns YYYY-MM for the previous Africa/Cairo calendar month. */
export function getPreviousTrainingMonthKey(date = new Date()): string {
  const { year, month } = cairoParts(date);
  const prev = new Date(Date.UTC(year, month - 2, 1));
  const y = prev.getUTCFullYear();
  const m = prev.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatTrainingMonthLabel(monthKey: string, locale = 'en'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function isValidTrainingMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value.trim());
}

export function createTrainingEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
