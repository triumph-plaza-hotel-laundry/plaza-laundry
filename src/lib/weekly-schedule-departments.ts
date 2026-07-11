import type { ShiftPeriod, ShiftRole } from '@/data/laundry-shifts';
import type { TranslationKey } from '@/types/language';

export type WeeklyScheduleSlot = {
  period: ShiftPeriod;
  index: 0 | 1;
};

export const WEEKLY_SCHEDULE_SLOT_ROWS: readonly WeeklyScheduleSlot[] = [
  { period: 'morning', index: 0 },
  { period: 'morning', index: 1 },
  { period: 'evening', index: 0 },
  { period: 'evening', index: 1 },
] as const;

export const WEEKLY_SCHEDULE_SLOT_LABEL_KEYS = [
  'shifts.morning',
  'shifts.morning',
  'shifts.evening',
  'shifts.evening',
] as const satisfies readonly TranslationKey[];

export const WEEKLY_SCHEDULE_DEPARTMENTS: ReadonlyArray<{
  role: ShiftRole;
  labelKey: TranslationKey;
}> = [
  { role: 'washer', labelKey: 'shifts.weekly.departments.washing' },
  { role: 'ghalya', labelKey: 'shifts.weekly.departments.ghalya' },
  { role: 'ironing', labelKey: 'shifts.weekly.departments.ironing' },
  { role: 'linen', labelKey: 'shifts.weekly.departments.linen' },
  { role: 'calendar', labelKey: 'shifts.weekly.departments.calendar' },
  { role: 'weeklyLeave', labelKey: 'shifts.weekly.departments.weeklyLeave' },
  { role: 'annualLeave', labelKey: 'shifts.weekly.departments.annualLeave' },
];
