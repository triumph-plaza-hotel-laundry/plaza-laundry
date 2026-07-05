import { memo, useMemo } from 'react';
import {
  weekDays,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useLanguage } from '@/hooks';
import { getEmployeeDayShiftStatus } from '@/lib/shift-schedule-utils';
import type { TranslationKey } from '@/types/language';

type WeeklyShiftReadOnlyTableProps = {
  employees: LaundryEmployee[];
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
};

const dayLabelKeys: Record<WeekDayId, TranslationKey> = {
  saturday: 'shifts.days.saturday',
  sunday: 'shifts.days.sunday',
  monday: 'shifts.days.monday',
  tuesday: 'shifts.days.tuesday',
  wednesday: 'shifts.days.wednesday',
  thursday: 'shifts.days.thursday',
  friday: 'shifts.days.friday',
};

const statusLabelKeys = {
  morning: 'shifts.status.morning',
  evening: 'shifts.status.evening',
  dayOff: 'shifts.status.dayOff',
} as const satisfies Record<ReturnType<typeof getEmployeeDayShiftStatus>, TranslationKey>;

export const WeeklyShiftReadOnlyTable = memo(function WeeklyShiftReadOnlyTable({
  employees,
  weeklySchedule,
}: WeeklyShiftReadOnlyTableProps) {
  const { language, t } = useLanguage();

  const rows = useMemo(
    () =>
      [...employees]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((employee) => ({
          employee,
          name: language === 'ar' ? employee.name.ar : employee.name.en,
          statuses: Object.fromEntries(
            weekDays.map((day) => [
              day,
              getEmployeeDayShiftStatus(employee.id, weeklySchedule[day]),
            ]),
          ) as Record<WeekDayId, ReturnType<typeof getEmployeeDayShiftStatus>>,
        })),
    [employees, language, weeklySchedule],
  );

  const employeeLabel = t('shifts.weeklyTable.employee');

  return (
    <section aria-label={t('shifts.weeklyTable.title')} className="shift-weekly-card">
      <header className="shift-weekly-card__header">
        <h2 className="shift-weekly-card__title">{t('shifts.weeklyTable.title')}</h2>
        <p className="shift-weekly-card__subtitle">{t('shifts.weeklyTable.subtitle')}</p>
      </header>

      <div className="shift-weekly-card__table-wrap luxury-table-wrap">
        <table className="shift-weekly-card__table luxury-table">
          <thead>
            <tr>
              <th scope="col">{employeeLabel}</th>
              {weekDays.map((day) => (
                <th key={day} scope="col">
                  {t(dayLabelKeys[day])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employee, name, statuses }) => (
              <tr key={employee.id}>
                <th className="shift-weekly-card__employee" data-label={employeeLabel} scope="row">
                  {name}
                </th>
                {weekDays.map((day) => {
                  const status = statuses[day];
                  const statusLabel = t(statusLabelKeys[status]);

                  return (
                    <td data-label={t(dayLabelKeys[day])} key={`${employee.id}-${day}`}>
                      <span className={`shift-weekly-card__status shift-weekly-card__status--${status}`}>
                        {statusLabel}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
