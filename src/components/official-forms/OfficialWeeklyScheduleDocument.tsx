import { employeesRepository } from '@/data/repositories';
import {
  shiftRoles,
  weekDays,
  type ShiftPeriod,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import { dictionaries } from '@/i18n/dictionaries';
import { useLanguage, useSyncStore } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import { OfficialFormHeader } from '@/components/official-forms/OfficialFormHeader';

type OfficialWeeklyScheduleDocumentProps = {
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  workingHours: Record<
    WeekDayId,
    Record<ShiftPeriod, { en: string; ar: string }>
  >;
  selectedDay: WeekDayId;
  readOnly: boolean;
  onCellChange?: (
    day: WeekDayId,
    role: ShiftRole,
    assignment: WeeklyCellAssignment,
  ) => void;
  onHoursChange?: (
    day: WeekDayId,
    period: ShiftPeriod,
    lang: 'en' | 'ar',
    value: string,
  ) => void;
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

const roleLabelKeys: Record<ShiftRole, TranslationKey> = {
  washer: 'shifts.weekly.departments.washing',
  ghalya: 'shifts.weekly.departments.ghalya',
  ironing: 'shifts.weekly.departments.ironing',
  linen: 'shifts.weekly.departments.linen',
  calendar: 'shifts.weekly.departments.calendar',
  weeklyLeave: 'shifts.weekly.departments.weeklyLeave',
  annualLeave: 'shifts.weekly.departments.annualLeave',
};

type SlotKey = 'morning0' | 'morning1' | 'evening0' | 'evening1';

const slotMap: Record<SlotKey, { period: ShiftPeriod; index: 0 | 1 }> = {
  morning0: { period: 'morning', index: 0 },
  morning1: { period: 'morning', index: 1 },
  evening0: { period: 'evening', index: 0 },
  evening1: { period: 'evening', index: 1 },
};

function ScheduleCell({
  assignment,
  day,
  role,
  readOnly,
  onCellChange,
}: {
  assignment: WeeklyCellAssignment;
  day: WeekDayId;
  role: ShiftRole;
  readOnly: boolean;
  onCellChange?: (
    day: WeekDayId,
    role: ShiftRole,
    assignment: WeeklyCellAssignment,
  ) => void;
}) {
  const { language, t } = useLanguage();
  const employees = useSyncStore(employeesRepository);

  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label: language === 'ar' ? employee.name.ar : employee.name.en,
  }));

  const getEmployeeName = (id: string) => {
    const employee = employees.find((entry) => entry.id === id);
    if (!employee) {
      return '—';
    }

    return language === 'ar' ? employee.name.ar : employee.name.en;
  };

  const updateSlot = (slot: SlotKey, employeeId: string) => {
    const { period, index } = slotMap[slot];
    const pair = [...assignment[period]] as [string, string];
    pair[index] = employeeId;
    onCellChange?.(day, role, {
      ...assignment,
      [period]: pair,
    });
  };

  const renderSlot = (slot: SlotKey) => {
    const { period, index } = slotMap[slot];
    const value = assignment[period][index];

    if (readOnly) {
      return (
        <p className="tpl-official-table__employee">{getEmployeeName(value)}</p>
      );
    }

    return (
      <select
        aria-label={`${t(roleLabelKeys[role])} ${t(period === 'morning' ? 'shifts.morning' : 'shifts.evening')} ${index + 1}`}
        className="tpl-official-table__select"
        onChange={(event) => updateSlot(slot, event.target.value)}
        value={value}
      >
        {employeeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div>
      <p className="tpl-official-table__shift-label">{t('shifts.morning')}</p>
      {renderSlot('morning0')}
      {renderSlot('morning1')}
      <div aria-hidden="true" className="tpl-official-table__cell-divider" />
      <p className="tpl-official-table__shift-label">{t('shifts.evening')}</p>
      {renderSlot('evening0')}
      {renderSlot('evening1')}
    </div>
  );
}

export function OfficialWeeklyScheduleDocument({
  weeklySchedule,
  workingHours,
  selectedDay,
  readOnly,
  onCellChange,
  onHoursChange,
}: OfficialWeeklyScheduleDocumentProps) {
  const { language, t } = useLanguage();
  const hoursDay = selectedDay;
  const dayHours = workingHours[hoursDay];

  return (
    <article
      aria-label="Weekly shift schedule form"
      className="tpl-official-sheet tpl-official-sheet--landscape"
    >
      <OfficialFormHeader
        subtitleAr={t('shifts.subtitleAr')}
        subtitleEn={t('shifts.subtitle')}
        titleAr="الجدول الأسبوعي"
        titleEn="Weekly Schedule"
      />

      <div className="tpl-official-sheet__body">
        <div className="tpl-official-sheet__hours">
          <div className="tpl-official-sheet__hours-block">
            <p className="tpl-official-sheet__hours-title-en">
              {t('shifts.morningShift')}
            </p>
            <p className="tpl-official-sheet__hours-title-ar">الشيفت الصباحي</p>
            {readOnly ? (
              <p className="tpl-official-sheet__hours-value tpl-official-sheet__hours-value--readonly">
                {dayHours.morning[language === 'ar' ? 'ar' : 'en']}
              </p>
            ) : (
              <input
                aria-label={t('shifts.morningShift')}
                className="tpl-official-sheet__hours-value"
                onChange={(event) =>
                  onHoursChange?.(
                    hoursDay,
                    'morning',
                    language === 'ar' ? 'ar' : 'en',
                    event.target.value,
                  )
                }
                type="text"
                value={dayHours.morning[language === 'ar' ? 'ar' : 'en']}
              />
            )}
          </div>
          <div className="tpl-official-sheet__hours-block">
            <p className="tpl-official-sheet__hours-title-en">
              {t('shifts.eveningShift')}
            </p>
            <p className="tpl-official-sheet__hours-title-ar">الشيفت المسائي</p>
            {readOnly ? (
              <p className="tpl-official-sheet__hours-value tpl-official-sheet__hours-value--readonly">
                {dayHours.evening[language === 'ar' ? 'ar' : 'en']}
              </p>
            ) : (
              <input
                aria-label={t('shifts.eveningShift')}
                className="tpl-official-sheet__hours-value"
                onChange={(event) =>
                  onHoursChange?.(
                    hoursDay,
                    'evening',
                    language === 'ar' ? 'ar' : 'en',
                    event.target.value,
                  )
                }
                type="text"
                value={dayHours.evening[language === 'ar' ? 'ar' : 'en']}
              />
            )}
          </div>
        </div>

        <div className="tpl-official-sheet__table-scroll">
          <table className="tpl-official-table">
            <thead>
              <tr>
                <th
                  className="tpl-official-table__item tpl-official-table__day-col"
                  scope="col"
                />
                {shiftRoles.map((role) => (
                  <th
                    className="tpl-official-table__role-col"
                    key={role}
                    scope="col"
                  >
                    <span className="tpl-official-table__head-en">
                      {dictionaries.en[roleLabelKeys[role]]}
                    </span>
                    <span className="tpl-official-table__head-ar">
                      {dictionaries.ar[roleLabelKeys[role]]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day) => (
                <tr
                  className={
                    day === selectedDay
                      ? 'tpl-official-table__day-row--today'
                      : undefined
                  }
                  key={day}
                >
                  <th
                    className={`tpl-official-table__item tpl-official-table__day-col${day === selectedDay ? 'tpl-official-sheet__role-head--today' : ''}`}
                    scope="row"
                  >
                    <span className="tpl-official-table__head-en">
                      {dictionaries.en[dayLabelKeys[day]]}
                    </span>
                    <span className="tpl-official-table__head-ar">
                      {dictionaries.ar[dayLabelKeys[day]]}
                    </span>
                  </th>
                  {shiftRoles.map((role) => (
                    <td
                      className="tpl-official-table__role-col"
                      key={`${day}-${role}`}
                    >
                      <ScheduleCell
                        assignment={weeklySchedule[day][role]}
                        day={day}
                        onCellChange={onCellChange}
                        readOnly={readOnly}
                        role={role}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="tpl-official-sheet__footer">
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">أعدّه</p>
            <p className="tpl-official-sheet__signature-label-en">
              Prepared By
            </p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">اعتمد</p>
            <p className="tpl-official-sheet__signature-label-en">
              Approved By
            </p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">التاريخ</p>
            <p className="tpl-official-sheet__signature-label-en">Date</p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
        </footer>
      </div>
    </article>
  );
}
