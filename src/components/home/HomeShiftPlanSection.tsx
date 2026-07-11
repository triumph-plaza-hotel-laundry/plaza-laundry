import { useMemo } from 'react';
import { createDefaultShiftsState } from '@/data/laundry-shifts';
import {
  resolveEmployeeDisplayName,
  shiftsHasSavedAssignments,
  TODAYS_SCHEDULE_COLUMNS,
} from '@/lib/shift-schedule-utils';
import { useCairoWeekDay, useHomeShiftPlan, useLanguage } from '@/hooks';
import '@/components/shifts/shifts-page.css';

const defaultDaySchedules = createDefaultShiftsState().weeklySchedule;

export function HomeShiftPlanSection() {
  const { language, t } = useLanguage();
  const selectedDay = useCairoWeekDay();
  const { shifts, employees, isReady, error } = useHomeShiftPlan();

  const hasSavedAssignments = useMemo(
    () => shiftsHasSavedAssignments(shifts),
    [shifts],
  );

  const daySchedule =
    shifts.weeklySchedule[selectedDay] ?? defaultDaySchedules[selectedDay];
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
      aria-label={t('home.shiftPlan.region')}
      className="home-shift-plan"
    >
      {error ? <p className="home-shift-plan__error">{error}</p> : null}

      {!isReady ? (
        <p className="home-shift-plan__loading">
          {t('home.shiftPlan.loading')}
        </p>
      ) : error ? null : !hasSavedAssignments ? (
        <p className="home-shift-plan__empty">{t('home.shiftPlan.empty')}</p>
      ) : (
        <div className="home-shift-plan__schedule">
          <section className="shift-today-card" data-day={selectedDay}>
            <div className="shift-today-card__table-wrap">
              <table className="shift-today-card__table">
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
                          <p className="shift-today-card__shift-label">
                            {t('shifts.morningShift')}
                          </p>
                          {column.assignment.morning.map(
                            (employeeId, index) => (
                              <p
                                className="shift-today-card__name"
                                key={`${employeeId}-${index}`}
                              >
                                {resolveEmployeeDisplayName(
                                  employeeId,
                                  employees,
                                  language,
                                )}
                              </p>
                            ),
                          )}
                        </div>
                        <div
                          aria-hidden="true"
                          className="shift-today-card__divider"
                        />
                        <div className="shift-today-card__shift-block">
                          <p className="shift-today-card__shift-label">
                            {t('shifts.eveningShift')}
                          </p>
                          {column.assignment.evening.map(
                            (employeeId, index) => (
                              <p
                                className="shift-today-card__name"
                                key={`${employeeId}-${index}`}
                              >
                                {resolveEmployeeDisplayName(
                                  employeeId,
                                  employees,
                                  language,
                                )}
                              </p>
                            ),
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
