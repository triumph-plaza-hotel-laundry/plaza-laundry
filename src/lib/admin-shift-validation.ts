import {
  LEAVE_SHIFT_ROLES,
  shiftRoles,
  type ShiftRole,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';

export type ShiftSlotAssignment = {
  role: ShiftRole;
  period: 'morning' | 'evening';
  index: 0 | 1;
  employeeId: string;
};

export function collectDayAssignments(
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): ShiftSlotAssignment[] {
  const assignments: ShiftSlotAssignment[] = [];

  shiftRoles.forEach((role) => {
    const cell = daySchedule[role];
    (['morning', 'evening'] as const).forEach((period) => {
      cell[period].forEach((employeeId, index) => {
        if (employeeId.trim()) {
          assignments.push({ role, period, index: index as 0 | 1, employeeId });
        }
      });
    });
  });

  return assignments;
}

export function findDuplicateEmployeeIds(
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  collectDayAssignments(daySchedule).forEach(({ employeeId }) => {
    if (seen.has(employeeId)) {
      duplicates.add(employeeId);
      return;
    }
    seen.add(employeeId);
  });

  return [...duplicates];
}

export function countMorningAssignments(
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): number {
  return new Set(
    shiftRoles.flatMap((role) =>
      daySchedule[role].morning.filter((employeeId) => employeeId.trim()),
    ),
  ).size;
}

export function countEveningAssignments(
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): number {
  return new Set(
    shiftRoles.flatMap((role) =>
      daySchedule[role].evening.filter((employeeId) => employeeId.trim()),
    ),
  ).size;
}

export function countOffAssignments(
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): number {
  return new Set(
    LEAVE_SHIFT_ROLES.flatMap((role) => [
      ...daySchedule[role].morning,
      ...daySchedule[role].evening,
    ]).filter((employeeId) => employeeId.trim()),
  ).size;
}

export function isDepartmentDirtyForDay(
  current: Record<ShiftRole, WeeklyCellAssignment>,
  baseline: Record<ShiftRole, WeeklyCellAssignment>,
  role: ShiftRole,
): boolean {
  return JSON.stringify(current[role]) !== JSON.stringify(baseline[role]);
}
