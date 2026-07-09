import type { LaundryEmployee } from '@/data/laundry-employees';
import { isManagerEmployee } from '@/lib/employee-roles';
import {
  shiftRoles,
  weekDays,
  type ShiftPeriod,
  type ShiftRole,
  type ShiftsState,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { TranslationKey } from '@/types/language';

export type EmployeeShiftSlot = {
  role: ShiftRole;
  period: ShiftPeriod;
  slotIndex: 0 | 1;
};

export type EmployeeDayShiftStatus = 'morning' | 'evening' | 'dayOff';

export const TODAYS_SCHEDULE_COLUMNS: ReadonlyArray<{
  role: ShiftRole;
  labelKey: TranslationKey;
}> = [
  { role: 'washer', labelKey: 'shifts.roles.washer' },
  { role: 'valet', labelKey: 'shifts.roles.valet' },
  { role: 'ironing', labelKey: 'shifts.roles.ironing' },
  { role: 'linen', labelKey: 'shifts.roles.linen' },
  { role: 'off', labelKey: 'shifts.roles.calendar' },
];

export function findEmployeeShiftSlots(
  employeeId: string,
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): EmployeeShiftSlot[] {
  const slots: EmployeeShiftSlot[] = [];

  shiftRoles.forEach((role) => {
    const cell = daySchedule[role];
    cell.morning.forEach((id, index) => {
      if (id === employeeId) {
        slots.push({ role, period: 'morning', slotIndex: index as 0 | 1 });
      }
    });
    cell.evening.forEach((id, index) => {
      if (id === employeeId) {
        slots.push({ role, period: 'evening', slotIndex: index as 0 | 1 });
      }
    });
  });

  return slots;
}

export function formatEmployeeDaySummary(
  slots: EmployeeShiftSlot[],
  labels: Record<ShiftRole, string>,
): { morning: string; evening: string } {
  const morning = slots
    .filter((slot) => slot.period === 'morning')
    .map((slot) => labels[slot.role])
    .join(' · ');
  const evening = slots
    .filter((slot) => slot.period === 'evening')
    .map((slot) => labels[slot.role])
    .join(' · ');

  return {
    morning: morning || '—',
    evening: evening || '—',
  };
}

export function shiftsHasSavedAssignments(state: ShiftsState) {
  return weekDays.some((day) =>
    shiftRoles.some((role) => {
      const cell = state.weeklySchedule[day]?.[role];
      if (!cell) {
        return false;
      }

      return (
        cell.morning.some((employeeId) => employeeId.trim().length > 0) ||
        cell.evening.some((employeeId) => employeeId.trim().length > 0)
      );
    }),
  );
}

export function resolveEmployeeDisplayName(
  employeeId: string,
  employees: LaundryEmployee[],
  language: string,
): string {
  if (!employeeId.trim()) {
    return '-';
  }

  const employee = employees.find((entry) => entry.id === employeeId);
  if (!employee || isManagerEmployee(employee)) {
    return '-';
  }

  return language === 'ar' ? employee.name.ar : employee.name.en;
}

export function getEmployeeDayShiftStatus(
  employeeId: string,
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): EmployeeDayShiftStatus {
  const slots = findEmployeeShiftSlots(employeeId, daySchedule);

  if (slots.length === 0) {
    return 'dayOff';
  }

  if (slots.some((slot) => slot.role === 'off')) {
    return 'dayOff';
  }

  const hasMorning = slots.some((slot) => slot.period === 'morning');
  const hasEvening = slots.some((slot) => slot.period === 'evening');

  if (hasMorning) {
    return 'morning';
  }

  if (hasEvening) {
    return 'evening';
  }

  return 'dayOff';
}

export function stripRemovedEmployeeIds(
  schedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>,
  removedIds: readonly string[],
): Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>> {
  const removed = new Set(removedIds);
  const next = {} as Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;

  weekDays.forEach((day) => {
    next[day] = {} as Record<ShiftRole, WeeklyCellAssignment>;
    shiftRoles.forEach((role) => {
      const cell = schedule[day][role];
      next[day][role] = {
        morning: cell.morning.map((id) => (removed.has(id) ? '' : id)) as [string, string],
        evening: cell.evening.map((id) => (removed.has(id) ? '' : id)) as [string, string],
      };
    });
  });

  return next;
}
