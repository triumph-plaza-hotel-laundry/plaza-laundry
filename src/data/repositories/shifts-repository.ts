import {
  createDefaultShiftsState,
  migrateWeeklySchedule,
  SHIFT_HOURS,
  weekDays,
  type DailyRoster,
  type ShiftPeriod,
  type ShiftRole,
  type ShiftsState,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  DailyRoster,
  ShiftRole,
  ShiftsState,
  WeekDayId,
  WeeklyCellAssignment,
} from '@/data/laundry-shifts';

function normalizeShiftsState(parsed: unknown, seed: ShiftsState): ShiftsState {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const partial = parsed as Partial<ShiftsState>;
  const workingHours = { ...seed.workingHours, ...partial.workingHours };
  weekDays.forEach((day) => {
    if (!workingHours[day]) {
      workingHours[day] = {
        morning: { ...SHIFT_HOURS.morning },
        evening: { ...SHIFT_HOURS.evening },
      };
    }
  });

  return {
    dailyRosters: { ...seed.dailyRosters, ...partial.dailyRosters },
    weeklySchedule: migrateWeeklySchedule(partial.weeklySchedule, seed),
    workingHours,
  };
}

const store = createLocalStore<ShiftsState>({
  key: STORAGE_KEYS.shifts,
  seed: createDefaultShiftsState,
  normalize: normalizeShiftsState,
});

registerRepository(STORAGE_KEYS.shifts, store);

export const shiftsRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  updateDailyRoster(day: WeekDayId, roster: DailyRoster) {
    const current = store.getSnapshot();
    store.replaceState({
      ...current,
      dailyRosters: {
        ...current.dailyRosters,
        [day]: roster,
      },
    });
  },
  updateWeeklyCell(
    day: WeekDayId,
    role: ShiftRole,
    assignment: WeeklyCellAssignment,
  ) {
    const current = store.getSnapshot();
    store.replaceState({
      ...current,
      weeklySchedule: {
        ...current.weeklySchedule,
        [day]: {
          ...current.weeklySchedule[day],
          [role]: assignment,
        },
      },
    });
  },
  updateWorkingHours(
    day: WeekDayId,
    period: ShiftPeriod,
    lang: 'en' | 'ar',
    value: string,
  ) {
    const current = store.getSnapshot();
    store.replaceState({
      ...current,
      workingHours: {
        ...current.workingHours,
        [day]: {
          ...current.workingHours[day],
          [period]: {
            ...current.workingHours[day][period],
            [lang]: value,
          },
        },
      },
    });
  },
  replaceAll(next: ShiftsState) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};
