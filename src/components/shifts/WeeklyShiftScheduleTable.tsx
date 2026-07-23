import {
  ChevronDown,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Save,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useMemo, useState } from 'react';
import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  weekDays,
  type ShiftPeriod,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import { dictionaries } from '@/i18n/dictionaries';
import { useLanguage } from '@/hooks';
import { exportWeeklyScheduleToExcel } from '@/lib/weekly-schedule-export';
import {
  formatWeeklyScheduleDate,
  formatWeeklyScheduleRange,
  getCairoWeekDates,
} from '@/lib/weekly-schedule-dates';
import { WEEKLY_SCHEDULE_DEPARTMENTS } from '@/lib/weekly-schedule-departments';
import type { TranslationKey } from '@/types/language';
import { ShiftEmployeeCombobox } from './ShiftEmployeeCombobox';
import './shift-schedule-view.css';

type WeeklyShiftScheduleTableProps = {
  employees: readonly LaundryEmployee[];
  selectableEmployees?: readonly LaundryEmployee[];
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  editable?: boolean;
  onSlotChange?: (
    day: WeekDayId,
    role: ShiftRole,
    period: ShiftPeriod,
    index: 0 | 1,
    employeeId: string,
  ) => void;
  onSave?: () => void | Promise<void>;
  onReset?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  toast?: { message: string; tone: 'success' | 'error' } | null;
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

const SHIFT_ROWS: ReadonlyArray<{
  period: ShiftPeriod;
  labelKey: TranslationKey;
}> = [
  { period: 'morning', labelKey: 'shifts.morning' },
  { period: 'evening', labelKey: 'shifts.evening' },
];

function resolveEmployeeName(
  employeeId: string,
  employees: readonly LaundryEmployee[],
  language: 'ar' | 'en',
): string {
  if (!employeeId.trim()) {
    return '—';
  }

  const employee = employees.find((entry) => entry.id === employeeId);
  if (!employee) {
    return '—';
  }

  return language === 'ar' ? employee.name.ar : employee.name.en;
}

function EmployeeBadges({
  assignment,
  employees,
  language,
  period,
}: {
  assignment: WeeklyCellAssignment;
  employees: readonly LaundryEmployee[];
  language: 'ar' | 'en';
  period: ShiftPeriod;
}) {
  return (
    <div className="shift-schedule-employee-badges">
      {assignment[period].map((employeeId, index) => (
        <span
          className="shift-schedule-employee-badge"
          key={`${period}-${index}`}
        >
          {resolveEmployeeName(employeeId, employees, language)}
        </span>
      ))}
    </div>
  );
}

function EditableEmployeeSlots({
  assignment,
  day,
  departmentRole,
  employees,
  selectableEmployees,
  language,
  onSlotChange,
  period,
  searchPlaceholder,
  noResultsLabel,
  clearLabel,
}: {
  assignment: WeeklyCellAssignment;
  day: WeekDayId;
  departmentRole: ShiftRole;
  employees: readonly LaundryEmployee[];
  selectableEmployees: readonly LaundryEmployee[];
  language: 'ar' | 'en';
  onSlotChange: NonNullable<WeeklyShiftScheduleTableProps['onSlotChange']>;
  period: ShiftPeriod;
  searchPlaceholder: string;
  noResultsLabel: string;
  clearLabel: string;
}) {
  return (
    <div className="shift-schedule-employee-badges">
      {assignment[period].map((employeeId, index) => (
        <ShiftEmployeeCombobox
          clearLabel={clearLabel}
          employeeId={employeeId}
          employees={employees}
          key={`${day}-${departmentRole}-${period}-${index}`}
          language={language}
          noResultsLabel={noResultsLabel}
          onChange={(nextEmployeeId) =>
            onSlotChange(
              day,
              departmentRole,
              period,
              index as 0 | 1,
              nextEmployeeId,
            )
          }
          searchPlaceholder={searchPlaceholder}
          selectableEmployees={selectableEmployees}
        />
      ))}
    </div>
  );
}

function DayScheduleContent({
  day,
  editable,
  employees,
  selectableEmployees,
  language,
  onSlotChange,
  weeklySchedule,
  comboboxLabels,
}: {
  day: WeekDayId;
  editable: boolean;
  employees: readonly LaundryEmployee[];
  selectableEmployees: readonly LaundryEmployee[];
  language: 'ar' | 'en';
  onSlotChange?: WeeklyShiftScheduleTableProps['onSlotChange'];
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  comboboxLabels: {
    searchPlaceholder: string;
    noResultsLabel: string;
    clearLabel: string;
  };
}) {
  const { t } = useLanguage();

  return (
    <div className="shift-schedule-day">
      {SHIFT_ROWS.map((shiftRow) => (
        <section
          className="shift-schedule-day__shift"
          key={`${day}-${shiftRow.period}`}
        >
          <h3 className="shift-schedule-day__shift-title">
            {t(shiftRow.labelKey)}
          </h3>
          <div className="shift-schedule-day__rows">
            {WEEKLY_SCHEDULE_DEPARTMENTS.map((department) => (
              <div
                className="shift-schedule-day__row"
                key={`${day}-${shiftRow.period}-${department.role}`}
              >
                <span className="shift-schedule-day__dept">
                  {dictionaries.ar[department.labelKey]}
                </span>
                <div className="shift-schedule-day__employee">
                  {editable && onSlotChange ? (
                    <EditableEmployeeSlots
                      assignment={weeklySchedule[day][department.role]}
                      clearLabel={comboboxLabels.clearLabel}
                      day={day}
                      departmentRole={department.role}
                      employees={employees}
                      language={language}
                      noResultsLabel={comboboxLabels.noResultsLabel}
                      onSlotChange={onSlotChange}
                      period={shiftRow.period}
                      searchPlaceholder={comboboxLabels.searchPlaceholder}
                      selectableEmployees={selectableEmployees}
                    />
                  ) : (
                    <EmployeeBadges
                      assignment={weeklySchedule[day][department.role]}
                      employees={employees}
                      language={language}
                      period={shiftRow.period}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export const WeeklyShiftScheduleTable = memo(function WeeklyShiftScheduleTable({
  employees,
  selectableEmployees,
  weeklySchedule,
  editable = false,
  onSlotChange,
  onSave,
  onReset,
  isDirty = false,
  isSaving = false,
  toast = null,
}: WeeklyShiftScheduleTableProps) {
  const { language, t } = useLanguage();
  const weekDates = useMemo(() => getCairoWeekDates(), []);
  const [expandedDay, setExpandedDay] = useState<WeekDayId | null>(null);
  const assignmentEmployees = selectableEmployees ?? employees;
  const dateRangeLabel = useMemo(
    () => formatWeeklyScheduleRange(weekDates, language),
    [language, weekDates],
  );

  const comboboxLabels = useMemo(
    () => ({
      searchPlaceholder: t('admin.shifts.searchEmployee'),
      noResultsLabel: t('admin.shifts.noResults'),
      clearLabel: t('admin.shifts.clearSelection'),
    }),
    [t],
  );

  const handleExport = useCallback(() => {
    exportWeeklyScheduleToExcel(weeklySchedule, weekDates, employees, language);
  }, [employees, language, weekDates, weeklySchedule]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleToggleDay = useCallback((day: WeekDayId) => {
    setExpandedDay((current) => (current === day ? null : day));
  }, []);

  return (
    <div
      className={`shift-schedule-page${editable ? ' shift-schedule-page--editable' : ''}`}
    >
      <header className="shift-schedule-page__header">
        <div className="shift-schedule-page__titles">
          <h1 className="shift-schedule-page__title-en">
            {dictionaries.en['shifts.weeklyTable.title']}
          </h1>
          <h1 className="shift-schedule-page__title-ar">
            {dictionaries.ar['shifts.weeklyTable.title']}
          </h1>
          <p className="shift-schedule-page__week">
            <span className="shift-schedule-page__week-label">
              {language === 'ar' ? 'الأسبوع الحالي' : 'Current Week'}
            </span>
            <span>{dateRangeLabel}</span>
          </p>
        </div>

        <div className="shift-schedule-page__actions">
          {editable ? (
            <>
              <button
                className="shift-schedule-page__action shift-schedule-page__action--primary"
                disabled={isSaving || !isDirty}
                onClick={() => void onSave?.()}
                type="button"
              >
                <Save aria-hidden="true" strokeWidth={1.6} />
                <span>
                  {isSaving
                    ? t('admin.editor.saving')
                    : t('admin.shifts.saveChanges')}
                </span>
              </button>
              <button
                className="shift-schedule-page__action"
                disabled={isSaving || !isDirty}
                onClick={() => onReset?.()}
                type="button"
              >
                <RotateCcw aria-hidden="true" strokeWidth={1.6} />
                <span>{t('admin.shifts.resetChanges')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="shift-schedule-page__action"
                onClick={handleExport}
                type="button"
              >
                <FileSpreadsheet aria-hidden="true" strokeWidth={1.6} />
                <span>{t('shifts.weekly.actions.exportExcel')}</span>
              </button>
              <button
                className="shift-schedule-page__action"
                onClick={handlePrint}
                type="button"
              >
                <Printer aria-hidden="true" strokeWidth={1.6} />
                <span>{t('shifts.weekly.actions.printPdf')}</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="shift-schedule-accordion">
        {weekDays.map((day) => {
          const isOpen = expandedDay === day;

          return (
            <article
              className={`shift-schedule-accordion__item${isOpen ? ' shift-schedule-accordion__item--open' : ''}`}
              key={day}
            >
              <button
                aria-controls={`shift-schedule-panel-${day}`}
                aria-expanded={isOpen}
                className="shift-schedule-accordion__trigger"
                onClick={() => handleToggleDay(day)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className="shift-schedule-accordion__chevron"
                  strokeWidth={1.75}
                />
                <span className="shift-schedule-accordion__label">
                  <span className="shift-schedule-accordion__day-name">
                    {t(dayLabelKeys[day])}
                  </span>
                  <span className="shift-schedule-accordion__day-date">
                    {formatWeeklyScheduleDate(weekDates[day], language)}
                  </span>
                </span>
              </button>

              <motion.div
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                aria-hidden={!isOpen}
                className="shift-schedule-accordion__panel"
                id={`shift-schedule-panel-${day}`}
                initial={false}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="shift-schedule-accordion__panel-inner">
                  <DayScheduleContent
                    comboboxLabels={comboboxLabels}
                    day={day}
                    editable={editable}
                    employees={employees}
                    language={language}
                    onSlotChange={onSlotChange}
                    selectableEmployees={assignmentEmployees}
                    weeklySchedule={weeklySchedule}
                  />
                </div>
              </motion.div>
            </article>
          );
        })}
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`shift-schedule-page__toast shift-schedule-page__toast--${toast.tone}`}
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            role="status"
          >
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
