const CAIRO_TIMEZONE = 'Africa/Cairo';

export type WeekDayId =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export type ShiftPeriod = 'morning' | 'evening';

export type ShiftRole = 'washer' | 'valet' | 'ironing' | 'press' | 'linen' | 'off';

export type ShiftPair = readonly [string, string];

export type WeeklyCellAssignment = {
  morning: ShiftPair;
  evening: ShiftPair;
};

export type DailyRoster = {
  morning: readonly string[];
  evening: readonly string[];
};

export type DayWorkingHours = Record<ShiftPeriod, { en: string; ar: string }>;

export type ShiftsState = {
  dailyRosters: Record<WeekDayId, DailyRoster>;
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  workingHours: Record<WeekDayId, DayWorkingHours>;
};

export type DerivedDailyView = {
  morning: string[];
  evening: string[];
  offToday: string[];
};

export const weekDays: readonly WeekDayId[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

export const shiftRoles: readonly ShiftRole[] = [
  'washer',
  'valet',
  'ironing',
  'press',
  'linen',
  'off',
] as const;

const WORKER_IDS = [
  'lw-01',
  'lw-02',
  'lw-03',
  'lw-04',
  'lw-05',
  'lw-06',
  'lw-07',
  'lw-08',
  'lw-09',
  'lw-10',
] as const;

const WEEKDAY_BY_JS: Record<number, WeekDayId> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function rotateWorkers(start: number, count: number): string[] {
  const result: string[] = [];

  for (let index = 0; index < count; index += 1) {
    result.push(WORKER_IDS[(start + index) % WORKER_IDS.length]);
  }

  return result;
}

function pairAt(start: number): ShiftPair {
  return [WORKER_IDS[start % WORKER_IDS.length], WORKER_IDS[(start + 1) % WORKER_IDS.length]];
}

function buildWeeklyDay(dayIndex: number): Record<ShiftRole, WeeklyCellAssignment> {
  const base = dayIndex * 2;

  return {
    washer: { morning: pairAt(base), evening: pairAt(base + 8) },
    valet: { morning: pairAt(base + 2), evening: pairAt(base + 10) },
    ironing: { morning: pairAt(base + 4), evening: pairAt(base + 12) },
    press: { morning: pairAt(base + 6), evening: pairAt(base + 14) },
    linen: { morning: pairAt(base + 1), evening: pairAt(base + 9) },
    off: { morning: pairAt(base + 3), evening: pairAt(base + 11) },
  };
}

function buildDailyRoster(dayIndex: number): DailyRoster {
  const offset = dayIndex * 2;

  return {
    morning: rotateWorkers(offset, 8),
    evening: rotateWorkers(offset + 8, 8),
  };
}

function buildWorkingHours(): DayWorkingHours {
  return {
    morning: { ...SHIFT_HOURS.morning },
    evening: { ...SHIFT_HOURS.evening },
  };
}

export function createDefaultShiftsState(): ShiftsState {
  const dailyRosters = {} as Record<WeekDayId, DailyRoster>;
  const weeklySchedule = {} as Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  const workingHours = {} as Record<WeekDayId, DayWorkingHours>;

  weekDays.forEach((day, index) => {
    dailyRosters[day] = buildDailyRoster(index);
    weeklySchedule[day] = buildWeeklyDay(index);
    workingHours[day] = buildWorkingHours();
  });

  return { dailyRosters, weeklySchedule, workingHours };
}

export function getCairoWeekDay(date = new Date()): WeekDayId {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIMEZONE,
    weekday: 'short',
  }).format(date);

  const map: Record<string, WeekDayId> = {
    Sat: 'saturday',
    Sun: 'sunday',
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
  };

  return map[weekday] ?? WEEKDAY_BY_JS[date.getDay()];
}

function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids));
}

export function deriveDailyViewFromWeekly(
  weeklySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): DerivedDailyView {
  const workingRoles = shiftRoles.filter((role) => role !== 'off');

  const morning = uniqueIds(
    workingRoles.flatMap((role) => [weeklySchedule[role].morning[0], weeklySchedule[role].morning[1]]),
  ).slice(0, 8);

  const evening = uniqueIds(
    workingRoles.flatMap((role) => [weeklySchedule[role].evening[0], weeklySchedule[role].evening[1]]),
  ).slice(0, 8);

  const offToday = uniqueIds([
    weeklySchedule.off.morning[0],
    weeklySchedule.off.morning[1],
    weeklySchedule.off.evening[0],
    weeklySchedule.off.evening[1],
  ]);

  return { morning, evening, offToday };
}

export const SHIFT_HOURS: Record<ShiftPeriod, { en: string; ar: string }> = {
  morning: { en: '07:00 AM – 03:00 PM', ar: '07:00 ص – 03:00 م' },
  evening: { en: '03:00 PM – 11:00 PM', ar: '03:00 م – 11:00 م' },
};
