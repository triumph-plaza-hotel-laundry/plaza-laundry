import { useCallback } from 'react';
import {
  shiftsRepository,
  type DailyRoster,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/repositories/shifts-repository';
import type { ShiftPeriod } from '@/data/laundry-shifts';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useShiftsStorage() {
  const shifts = useSyncStore(shiftsRepository);
  const { assertCan, logAction } = useAuth();

  const updateDailyRoster = useCallback(
    (day: WeekDayId, roster: DailyRoster) => {
      assertCan('shifts', 'update');
      const oldValue = shifts.dailyRosters[day];
      shiftsRepository.updateDailyRoster(day, roster);
      logAction({
        action: 'shifts.updateDailyRoster',
        page: 'shifts',
        oldValue,
        newValue: roster,
      });
    },
    [assertCan, logAction, shifts.dailyRosters],
  );

  const updateWeeklyCell = useCallback(
    (day: WeekDayId, role: ShiftRole, assignment: WeeklyCellAssignment) => {
      assertCan('shifts', 'update');
      const oldValue = shifts.weeklySchedule[day][role];
      shiftsRepository.updateWeeklyCell(day, role, assignment);
      logAction({
        action: 'shifts.updateWeeklyCell',
        page: 'shifts',
        oldValue,
        newValue: assignment,
      });
    },
    [assertCan, logAction, shifts.weeklySchedule],
  );

  const updateWorkingHours = useCallback(
    (day: WeekDayId, period: ShiftPeriod, lang: 'en' | 'ar', value: string) => {
      assertCan('shifts', 'update');
      const oldValue = shifts.workingHours[day][period][lang];
      shiftsRepository.updateWorkingHours(day, period, lang, value);
      logAction({
        action: 'shifts.updateWorkingHours',
        page: 'shifts',
        oldValue: { day, period, lang, value: oldValue },
        newValue: { day, period, lang, value },
      });
    },
    [assertCan, logAction, shifts.workingHours],
  );

  return { shifts, updateDailyRoster, updateWeeklyCell, updateWorkingHours };
}
