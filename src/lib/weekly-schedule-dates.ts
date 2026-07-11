import {
  getCairoWeekDay,
  weekDays,
  type WeekDayId,
} from '@/data/laundry-shifts';

const CAIRO_TIMEZONE = 'Africa/Cairo';

function getCairoDateParts(reference = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(reference);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(
    parts.find((part) => part.type === 'month')?.value ?? '0',
  );
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');

  return { year, month, day };
}

export function getCairoWeekDates(
  reference = new Date(),
): Record<WeekDayId, Date> {
  const { year, month, day } = getCairoDateParts(reference);
  const currentDay = getCairoWeekDay(reference);
  const dayOffset = weekDays.indexOf(currentDay);

  const saturdayUtc = Date.UTC(year, month - 1, day - dayOffset);

  return weekDays.reduce(
    (accumulator, weekDay, index) => {
      accumulator[weekDay] = new Date(saturdayUtc + index * 86_400_000);
      return accumulator;
    },
    {} as Record<WeekDayId, Date>,
  );
}

export function formatWeeklyScheduleDate(
  date: Date,
  language: 'ar' | 'en',
): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: CAIRO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatWeeklyScheduleRange(
  weekDates: Record<WeekDayId, Date>,
  language: 'ar' | 'en',
): string {
  const start = formatWeeklyScheduleDate(weekDates.saturday, language);
  const end = formatWeeklyScheduleDate(weekDates.friday, language);
  return `${start} – ${end}`;
}
