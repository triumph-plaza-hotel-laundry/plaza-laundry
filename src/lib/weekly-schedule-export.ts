import {
  weekDays,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  WEEKLY_SCHEDULE_DEPARTMENTS,
  WEEKLY_SCHEDULE_SLOT_LABEL_KEYS,
  WEEKLY_SCHEDULE_SLOT_ROWS,
} from '@/lib/weekly-schedule-departments';
import {
  formatWeeklyScheduleDate,
  type getCairoWeekDates,
} from '@/lib/weekly-schedule-dates';
import { dictionaries } from '@/i18n/dictionaries';
import type { TranslationKey } from '@/types/language';

type WeekDates = ReturnType<typeof getCairoWeekDates>;

const dayLabelKeys: Record<WeekDayId, TranslationKey> = {
  saturday: 'shifts.days.saturday',
  sunday: 'shifts.days.sunday',
  monday: 'shifts.days.monday',
  tuesday: 'shifts.days.tuesday',
  wednesday: 'shifts.days.wednesday',
  thursday: 'shifts.days.thursday',
  friday: 'shifts.days.friday',
};

function resolveEmployeeName(
  employeeId: string,
  employees: readonly LaundryEmployee[],
  language: 'ar' | 'en',
): string {
  if (!employeeId.trim()) {
    return '';
  }

  const employee = employees.find((entry) => entry.id === employeeId);
  if (!employee) {
    return '';
  }

  return language === 'ar' ? employee.name.ar : employee.name.en;
}

function getSlotValue(
  assignment: WeeklyCellAssignment,
  period: 'morning' | 'evening',
  index: 0 | 1,
): string {
  return assignment[period][index];
}

export function exportWeeklyScheduleToExcel(
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>,
  weekDates: WeekDates,
  employees: readonly LaundryEmployee[],
  language: 'ar' | 'en',
): void {
  const labels = dictionaries[language];
  const departmentHeaders = WEEKLY_SCHEDULE_DEPARTMENTS.map(
    (department) => labels[department.labelKey],
  );
  const dayHeader = labels['shifts.weekly.dayColumn'];
  const shiftHeader = labels['shifts.weekly.shiftColumn'];

  const rows: string[][] = [[dayHeader, shiftHeader, ...departmentHeaders]];

  weekDays.forEach((day) => {
    const dayLabel = labels[dayLabelKeys[day]];
    const dateLabel = formatWeeklyScheduleDate(weekDates[day], language);

    WEEKLY_SCHEDULE_SLOT_ROWS.forEach((slot, slotIndex) => {
      const shiftLabel = labels[WEEKLY_SCHEDULE_SLOT_LABEL_KEYS[slotIndex]];
      const departmentValues = WEEKLY_SCHEDULE_DEPARTMENTS.map((department) => {
        const assignment = weeklySchedule[day][department.role];
        const employeeId = getSlotValue(assignment, slot.period, slot.index);
        return resolveEmployeeName(employeeId, employees, language);
      });

      rows.push([
        slotIndex === 0 ? `${dayLabel}\n${dateLabel}` : '',
        shiftLabel,
        ...departmentValues,
      ]);
    });
  });

  const csvBody = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([`\uFEFF${csvBody}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `weekly-shift-schedule-${formatWeeklyScheduleDate(weekDates.saturday, 'en').replace(/\//g, '-')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
