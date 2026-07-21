/** Deno-compatible shift reminder logic (mirrors src/lib/shift-reminders). */

export type WeekDayId =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export type ShiftPeriod = 'morning' | 'evening';

export type ShiftRole =
  | 'washer'
  | 'ghalya'
  | 'ironing'
  | 'linen'
  | 'calendar'
  | 'weeklyLeave'
  | 'annualLeave';

export type WeeklyCellAssignment = {
  morning: [string, string];
  evening: [string, string];
};

export type ShiftsState = {
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  workingHours: Record<
    WeekDayId,
    Record<ShiftPeriod, { en: string; ar: string }>
  >;
};

export type LaundryEmployee = {
  id: string;
  status: string;
  name: { en: string; ar: string };
  department: { en: string; ar: string };
  tier?: string;
  employeeId?: string;
};

const weekDays: WeekDayId[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const shiftRoles: ShiftRole[] = [
  'washer',
  'ghalya',
  'ironing',
  'linen',
  'calendar',
  'weeklyLeave',
  'annualLeave',
];

const MANAGER_IDS = new Set(['gm-01', 'dm-01']);

function isManagerEmployee(employee: LaundryEmployee): boolean {
  return (
    MANAGER_IDS.has(employee.id) ||
    employee.tier === 'generalManager' ||
    employee.tier === 'departmentManager'
  );
}

function getCairoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
  };
}

function getCairoWeekDay(date: Date): WeekDayId {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
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
  return map[weekday] ?? 'sunday';
}

function addCairoDays(
  parts: ReturnType<typeof getCairoDateParts>,
  days: number,
) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12),
  );
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

function findEmployeeShiftSlots(
  employeeId: string,
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
) {
  const slots: Array<{
    role: ShiftRole;
    period: ShiftPeriod;
    slotIndex: 0 | 1;
  }> = [];

  for (const role of shiftRoles) {
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
  }

  return slots;
}

function getEmployeeDayShiftStatus(
  employeeId: string,
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>,
): ShiftPeriod | 'dayOff' {
  const slots = findEmployeeShiftSlots(employeeId, daySchedule);
  if (slots.length === 0) {
    return 'dayOff';
  }
  if (
    slots.some((s) => s.role === 'weeklyLeave' || s.role === 'annualLeave')
  ) {
    return 'dayOff';
  }
  if (slots.some((s) => s.period === 'morning')) {
    return 'morning';
  }
  if (slots.some((s) => s.period === 'evening')) {
    return 'evening';
  }
  return 'dayOff';
}

function extractStartTime(hoursLabel: string): string {
  const leading = hoursLabel.split(/[–-]/)[0]?.trim() ?? hoursLabel;
  const match = leading.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : leading;
}

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
};

export function buildTomorrowShiftAssignments(
  shifts: ShiftsState,
  employees: LaundryEmployee[],
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

    const primary = slots.find(
      (s) => s.role !== 'weeklyLeave' && s.role !== 'annualLeave',
    ) ?? slots[0];
    const period = status;
    const hours = dayHours[period];

    assignments.push({
      employeeId: employee.id,
      employeeNameEn: employee.name.en,
      employeeNameAr: employee.name.ar,
      departmentEn: employee.department.en,
      departmentAr: employee.department.ar,
      period,
      shiftLabelEn: period === 'morning' ? 'Morning Shift' : 'Evening Shift',
      shiftLabelAr: period === 'morning' ? 'الشفت الصباحي' : 'الشفت المسائي',
      role: primary.role,
      startTimeEn: extractStartTime(hours.en),
      startTimeAr: extractStartTime(hours.ar),
      targetDateKey,
    });
  }

  return assignments;
}

export function formatShiftReminderNotification(
  assignment: TomorrowShiftAssignment,
) {
  return {
    title: "Tomorrow's Shift",
    body: [
      `Hello ${assignment.employeeNameEn},`,
      'Your shift for tomorrow is:',
      assignment.shiftLabelEn,
      `Department: ${assignment.departmentEn}`,
      `Start: ${assignment.startTimeEn}`,
      'Please arrive on time.',
    ].join('\n'),
  };
}

export function migrateWeeklySchedule(raw: unknown, seed: ShiftsState): ShiftsState['weeklySchedule'] {
  if (!raw || typeof raw !== 'object') {
    return seed.weeklySchedule;
  }
  const partial = raw as Partial<Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>>;
  const result = {} as ShiftsState['weeklySchedule'];
  for (const day of weekDays) {
    result[day] = partial[day] ?? seed.weeklySchedule[day];
  }
  return result;
}

export function normalizeShiftsState(raw: unknown): ShiftsState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Partial<ShiftsState>;
  if (!data.weeklySchedule || !data.workingHours) {
    return null;
  }
  return {
    weeklySchedule: data.weeklySchedule as ShiftsState['weeklySchedule'],
    workingHours: data.workingHours as ShiftsState['workingHours'],
  };
}
