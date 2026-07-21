import type { LaundryEmployee } from '@/data/repositories';
import { employeesRepository } from '@/data/repositories';

export const CAIRO_TIMEZONE = 'Africa/Cairo';

export type CairoDateParts = {
  year: number;
  month: number;
  day: number;
};

export type BirthDateParts = {
  year: number;
  month: number;
  day: number;
};

const MONTH_BY_NAME: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function getCairoDateParts(date = new Date()): CairoDateParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 0);

  return { year, month, day };
}

export function getCairoDateKey(parts: CairoDateParts): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isValidBirthDateParts(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Normalizes `{ en, ar }` birth-date objects from employee JSON. */
export function getLocalizedBirthDate(value: unknown): {
  en: string;
  ar: string;
} {
  if (!value || typeof value !== 'object') {
    return { en: '', ar: '' };
  }

  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === 'string' ? record.en.trim() : '',
    ar: typeof record.ar === 'string' ? record.ar.trim() : '',
  };
}

/** Display label — prefers `dateOfBirth.ar`. */
export function getBirthDateDisplayLabel(dateOfBirth: unknown): string {
  const { ar, en } = getLocalizedBirthDate(dateOfBirth);
  if (ar) {
    return ar;
  }

  const parsed = parseEmployeeBirthDate(en);
  if (!parsed) {
    return en;
  }

  return `${parsed.day} ${MONTH_NAMES_EN[parsed.month - 1]} ${parsed.year}`;
}

/** Age from `dateOfBirth.en` (ISO or legacy English). */
export function getEmployeeAge(
  dateOfBirth: unknown,
  today: CairoDateParts,
): number | null {
  const { en } = getLocalizedBirthDate(dateOfBirth);
  const parsed = parseEmployeeBirthDate(en);
  return parsed ? getAgeFromBirthDate(parsed, today) : null;
}

/** Birthday check from `dateOfBirth.en`. */
export function isEmployeeBirthdayToday(
  dateOfBirth: unknown,
  today: CairoDateParts,
): boolean {
  const { en } = getLocalizedBirthDate(dateOfBirth);
  return isBirthdayOnDate(en, today);
}

/** Parses ISO `YYYY-MM-DD` or legacy `D Month YYYY` English birth dates. */
export function parseEmployeeBirthDate(
  dobEn: string,
): BirthDateParts | null {
  const trimmed = dobEn.trim();
  if (!trimmed) {
    return null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isValidBirthDateParts(year, month, day)
      ? { year, month, day }
      : null;
  }

  const legacy = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (!legacy) {
    return null;
  }

  const month = MONTH_BY_NAME[legacy[2].toLowerCase()];
  if (!month) {
    return null;
  }

  const day = Number(legacy[1]);
  const year = Number(legacy[3]);
  return isValidBirthDateParts(year, month, day)
    ? { year, month, day }
    : null;
}

/** @deprecated Prefer parseEmployeeBirthDate — kept for callers that only need month/day. */
export function parseEmployeeBirthday(
  dobEn: string,
): { month: number; day: number } | null {
  const parsed = parseEmployeeBirthDate(dobEn);
  if (!parsed) {
    return null;
  }

  return { month: parsed.month, day: parsed.day };
}

export function birthDateToIso(parts: BirthDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function birthDateToIsoInputValue(dobEn: string): string {
  const parsed = parseEmployeeBirthDate(dobEn);
  return parsed ? birthDateToIso(parsed) : '';
}

export function localizedBirthDateFromIso(iso: string): {
  en: string;
  ar: string;
} {
  const parsed = parseEmployeeBirthDate(iso);
  if (!parsed) {
    return { en: '', ar: '' };
  }

  const en = birthDateToIso(parsed);
  const ar = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(parsed.year, parsed.month - 1, parsed.day));

  return { en, ar };
}

export function formatBirthDateDisplay(
  dobEn: string,
  language: 'ar' | 'en',
  dobAr = '',
): string {
  const parsed = parseEmployeeBirthDate(dobEn);
  if (!parsed) {
    return language === 'ar' ? dobAr.trim() : dobEn.trim();
  }

  if (language === 'ar') {
    if (dobAr.trim()) {
      return dobAr.trim();
    }

    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(parsed.year, parsed.month - 1, parsed.day));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dobEn.trim())) {
    return `${parsed.day} ${MONTH_NAMES_EN[parsed.month - 1]} ${parsed.year}`;
  }

  return dobEn.trim();
}

export function getAgeFromBirthDate(
  birth: BirthDateParts,
  today: CairoDateParts,
): number {
  let age = today.year - birth.year;

  if (
    today.month < birth.month ||
    (today.month === birth.month && today.day < birth.day)
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function isBirthdayOnDate(
  dobEn: string,
  today: CairoDateParts,
): boolean {
  const birthday = parseEmployeeBirthDate(dobEn);

  if (!birthday) {
    return false;
  }

  return birthday.month === today.month && birthday.day === today.day;
}

export function getEmployeesWithBirthdayToday(
  today: CairoDateParts,
  employees?: readonly LaundryEmployee[],
): LaundryEmployee[] {
  const list = employees ?? employeesRepository.getSnapshot();
  return list.filter((employee) =>
    isEmployeeBirthdayToday(employee.dateOfBirth, today),
  );
}

export function msUntilNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

export function msUntilNextCairoMidnight(now = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0,
  );
  const second = Number(
    parts.find((part) => part.type === 'second')?.value ?? 0,
  );
  const elapsedMs = ((hour * 60 + minute) * 60 + second) * 1000;

  return 86_400_000 - elapsedMs + 1;
}
