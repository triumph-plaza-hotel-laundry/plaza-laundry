import {
  getCairoWeekDay,
  type ShiftPeriod,
  type ShiftRole,
  type ShiftsState,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { getCairoDateParts } from '@/lib/birthday-utils';
import { isManagerEmployee } from '@/lib/employee-roles';
import {
  findEmployeeShiftSlots,
  getEmployeeDayShiftStatus,
  type EmployeeShiftSlot,
} from '@/lib/shift-schedule-utils';

export type TomorrowShiftAssignment = {
  employeeId: string;
  employeeNameEn: string;
  employeeNameAr: string;
  departmentEn: string;
  departmentAr: string;
  period: ShiftPeriod;
  shiftLabelEn: string;
  shiftLabelAr: string;
  role: ShiftRole;
  startTimeEn: string;
  startTimeAr: string;
  targetDateKey: string;
  weekDayId: WeekDayId;
};

const ROLE_LABELS_EN: Record<ShiftRole, string> = {
  washer: 'Washing',
  ghalya: 'Ghalya',
  ironing: 'Ironing',
  linen: 'Linen',
  calendar: 'Calendar',
  weeklyLeave: 'Weekly Leave',
  annualLeave: 'Annual Leave',
};

const ROLE_LABELS_AR: Record<ShiftRole, string> = {
  washer: 'الغسيل',
  ghalya: 'الغالية',
  ironing: 'الكي',
  linen: 'اللينن',
  calendar: 'الجندرة',
  weeklyLeave: 'إجازة أسبوعية',
  annualLeave: 'إجازة سنوية',
};

function addCairoDays(parts: ReturnType<typeof getCairoDateParts>, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return getCairoDateParts(date);
}

export function getTomorrowCairoDateKey(now = new Date()): string {
  const tomorrow = addCairoDays(getCairoDateParts(now), 1);
  return `${tomorrow.year}-${String(tomorrow.month).padStart(2, '0')}-${String(tomorrow.day).padStart(2, '0')}`;
}

export function getTomorrowWeekDayId(now = new Date()): WeekDayId {
  const tomorrow = addCairoDays(getCairoDateParts(now), 1);
  const date = new Date(
    Date.UTC(tomorrow.year, tomorrow.month - 1, tomorrow.day, 12),
  );
  return getCairoWeekDay(date);
}

export function extractStartTime(hoursLabel: string): string {
  const leading = hoursLabel.split(/[–-]/)[0]?.trim() ?? hoursLabel;
  const match = leading.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : leading;
}

function pickPrimarySlot(slots: EmployeeShiftSlot[]): EmployeeShiftSlot {
  const working = slots.filter(
    (slot) => slot.role !== 'weeklyLeave' && slot.role !== 'annualLeave',
  );
  return working[0] ?? slots[0];
}

/**
 * Builds personalized tomorrow shift assignments from the latest schedule snapshot.
 * Always pass freshly loaded `shifts` from Supabase — never a stale client cache.
 */
export function buildTomorrowShiftAssignments(
  shifts: ShiftsState,
  employees: readonly LaundryEmployee[],
  now = new Date(),
): TomorrowShiftAssignment[] {
  const weekDayId = getTomorrowWeekDayId(now);
  const targetDateKey = getTomorrowCairoDateKey(now);
  const daySchedule = shifts.weeklySchedule[weekDayId];
  const dayHours = shifts.workingHours[weekDayId];
  const assignments: TomorrowShiftAssignment[] = [];

  for (const employee of employees) {
    if (employee.status !== 'active' || isManagerEmployee(employee)) {
      continue;
    }

    const status = getEmployeeDayShiftStatus(employee.id, daySchedule);
    if (status === 'dayOff') {
      continue;
    }

    const slots = findEmployeeShiftSlots(employee.id, daySchedule);
    if (slots.length === 0) {
      continue;
    }

    const primary = pickPrimarySlot(slots);
    const period = status;
    const hours = dayHours[period];
    const shiftLabelEn =
      period === 'morning' ? 'Morning Shift' : 'Evening Shift';
    const shiftLabelAr = period === 'morning' ? 'الشفت الصباحي' : 'الشفت المسائي';

    assignments.push({
      employeeId: employee.id,
      employeeNameEn: employee.name.en,
      employeeNameAr: employee.name.ar,
      departmentEn: employee.department.en || ROLE_LABELS_EN[primary.role],
      departmentAr: employee.department.ar || ROLE_LABELS_AR[primary.role],
      period,
      shiftLabelEn,
      shiftLabelAr,
      role: primary.role,
      startTimeEn: extractStartTime(hours.en),
      startTimeAr: extractStartTime(hours.ar),
      targetDateKey,
      weekDayId,
    });
  }

  return assignments;
}

export function formatShiftReminderNotification(assignment: TomorrowShiftAssignment) {
  const title = "Tomorrow's Shift";
  const body = [
    `Hello ${assignment.employeeNameEn},`,
    'Your shift for tomorrow is:',
    assignment.shiftLabelEn,
    `Department: ${assignment.departmentEn}`,
    `Start: ${assignment.startTimeEn}`,
    'Please arrive on time.',
  ].join('\n');

  return { title, body };
}

export function getEmployeesForShiftTomorrow(
  shifts: ShiftsState,
  employees: readonly LaundryEmployee[],
  now = new Date(),
): LaundryEmployee[] {
  const weekDayId = getTomorrowWeekDayId(now);
  const daySchedule = shifts.weeklySchedule[weekDayId];

  return employees.filter((employee) => {
    if (employee.status !== 'active' || isManagerEmployee(employee)) {
      return false;
    }

    return getEmployeeDayShiftStatus(employee.id, daySchedule) !== 'dayOff';
  });
}

export type { ShiftsState, WeeklyCellAssignment };