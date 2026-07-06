import { memo, useMemo } from 'react';
import type { ShiftRole, WeekDayId, WeeklyCellAssignment } from '@/data/laundry-shifts';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useLanguage } from '@/hooks';
import {
  resolveEmployeeDisplayName,
  TODAYS_SCHEDULE_COLUMNS,
} from '@/lib/shift-schedule-utils';
import type { TranslationKey } from '@/types/language';

type TodaysScheduleCardProps = {
  employees: LaundryEmployee[];
  formattedDate: string;
  selectedDay: WeekDayId;
  dayLabelKey: TranslationKey;
  daySchedule: Record<ShiftRole, WeeklyCellAssignment>;
};

function ShiftNames({
  employeeIds,
  employees,
  language,
}: {
  employeeIds: readonly [string, string];
  employees: LaundryEmployee[];
  language: string;
}) {
  return (
    <>
      {employeeIds.map((employeeId, index) => (
        <p className="shift-today-card__name" key={`${employeeId}-${index}`}>
          {resolveEmployeeDisplayName(employeeId, employees, language)}
        </p>
      ))}
    </>
  );
}

export const TodaysScheduleCard = memo(function TodaysScheduleCard({
  employees,
  formattedDate,
  selectedDay,
  dayLabelKey,
  daySchedule,
}: TodaysScheduleCardProps) {
  const { language, t } = useLanguage();

  const columns = useMemo(
    () =>
      TODAYS_SCHEDULE_COLUMNS.map(({ role, labelKey }) => ({
        role,
        label: t(labelKey),
        assignment: daySchedule[role],
      })),
    [daySchedule, t],
  );

  return (
    <section
      aria-label={t('shifts.todaysSchedule.title')}
      className="shift-today-card"
      data-day={selectedDay}
    >
      <header className="shift-today-card__header">
        <p className="shift-today-card__meta">
          <span aria-hidden="true">📅</span>
          <span className="shift-today-card__meta-label">{t('shifts.todaysSchedule.todayLabel')}</span>
          <strong>{t(dayLabelKey)}</strong>
        </p>
        <p className="shift-today-card__meta">
          <span aria-hidden="true">📆</span>
          <span className="shift-today-card__meta-label">{t('shifts.todaysSchedule.dateLabel')}</span>
          <strong>{formattedDate}</strong>
        </p>
      </header>

      <div className="shift-today-card__table-wrap luxury-table-wrap">
        <table className="shift-today-card__table luxury-table luxury-table--cards">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.role} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((column) => (
                <td data-label={column.label} key={column.role}>
                  <div className="shift-today-card__shift-block">
                    <p className="shift-today-card__shift-label">{t('shifts.morningShift')}</p>
                    <ShiftNames
                      employeeIds={column.assignment.morning}
                      employees={employees}
                      language={language}
                    />
                  </div>
                  <div aria-hidden="true" className="shift-today-card__divider" />
                  <div className="shift-today-card__shift-block">
                    <p className="shift-today-card__shift-label">{t('shifts.eveningShift')}</p>
                    <ShiftNames
                      employeeIds={column.assignment.evening}
                      employees={employees}
                      language={language}
                    />
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
});
