import type { LaundryEmployee } from '@/data/repositories';
import { employeesRepository } from '@/data/repositories';

export const CAIRO_TIMEZONE = 'Africa/Cairo';

export type CairoDateParts = {
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

export function parseEmployeeBirthday(dobEn: string): { month: number; day: number } | null {
  const match = dobEn.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  if (!match) {
    return null;
  }

  const month = MONTH_BY_NAME[match[2].toLowerCase()];

  if (!month) {
    return null;
  }

  return {
    day: Number(match[1]),
    month,
  };
}

export function isBirthdayOnDate(dobEn: string, today: CairoDateParts): boolean {
  const birthday = parseEmployeeBirthday(dobEn);

  if (!birthday) {
    return false;
  }

  return birthday.month === today.month && birthday.day === today.day;
}

export function getEmployeesWithBirthdayToday(today: CairoDateParts): LaundryEmployee[] {
  return employeesRepository.getSnapshot().filter((employee) =>
    isBirthdayOnDate(employee.dateOfBirth.en, today),
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
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? 0);
  const elapsedMs = ((hour * 60 + minute) * 60 + second) * 1000;

  return 86_400_000 - elapsedMs + 1;
}
