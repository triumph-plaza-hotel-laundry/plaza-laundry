import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  weekDays,
  type ShiftPeriod,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { employeesRepository } from '@/data/repositories';
import { useLanguage, useSyncStore } from '@/hooks';
import {
  groupEmployeesByShiftDepartment,
  type ShiftDepartmentGroup,
} from '@/lib/shift-departments';
import {
  findEmployeeShiftSlots,
  formatEmployeeDaySummary,
} from '@/lib/shift-schedule-utils';
import type { TranslationKey } from '@/types/language';

type ShiftDepartmentScheduleProps = {
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  selectedDay: WeekDayId;
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

function ShiftPeriodAccordion({
  employeeId,
  period,
  weeklySchedule,
  roleLabels,
  selectedDay,
}: {
  employeeId: string;
  period: ShiftPeriod;
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  roleLabels: Record<ShiftRole, string>;
  selectedDay: WeekDayId;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const periodLabel =
    period === 'morning' ? t('shifts.morning') : t('shifts.evening');

  return (
    <div
      className={`shift-employee-row__period${isOpen ? 'shift-employee-row__period--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="shift-employee-row__period-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{periodLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="shift-employee-row__period-chevron"
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="shift-employee-row__period-panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <ul className="shift-employee-row__day-list">
              {weekDays.map((day) => {
                const summary = formatEmployeeDaySummary(
                  findEmployeeShiftSlots(employeeId, weeklySchedule[day]),
                  roleLabels,
                );
                const value =
                  period === 'morning' ? summary.morning : summary.evening;

                return (
                  <li
                    className={`shift-employee-row__day${day === selectedDay ? 'shift-employee-row__day--today' : ''}`}
                    key={day}
                  >
                    <span className="shift-employee-row__day-label">
                      {t(dayLabelKeys[day])}
                    </span>
                    <span className="shift-employee-row__day-value">
                      {value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ShiftEmployeeRow({
  employee,
  weeklySchedule,
  roleLabels,
  selectedDay,
}: {
  employee: LaundryEmployee;
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  roleLabels: Record<ShiftRole, string>;
  selectedDay: WeekDayId;
}) {
  const { language } = useLanguage();
  const primaryName = language === 'ar' ? employee.name.ar : employee.name.en;
  const secondaryName = language === 'ar' ? employee.name.en : employee.name.ar;

  return (
    <div className="shift-employee-row">
      <p className="shift-employee-row__name">{primaryName}</p>
      {secondaryName ? (
        <p className="shift-employee-row__name-alt">{secondaryName}</p>
      ) : null}

      <ShiftPeriodAccordion
        employeeId={employee.id}
        period="morning"
        roleLabels={roleLabels}
        selectedDay={selectedDay}
        weeklySchedule={weeklySchedule}
      />
      <ShiftPeriodAccordion
        employeeId={employee.id}
        period="evening"
        roleLabels={roleLabels}
        selectedDay={selectedDay}
        weeklySchedule={weeklySchedule}
      />
    </div>
  );
}

function ShiftDepartmentCard({
  department,
  weeklySchedule,
  roleLabels,
  selectedDay,
  defaultOpen = false,
}: {
  department: ShiftDepartmentGroup;
  weeklySchedule: Record<WeekDayId, Record<ShiftRole, WeeklyCellAssignment>>;
  roleLabels: Record<ShiftRole, string>;
  selectedDay: WeekDayId;
  defaultOpen?: boolean;
}) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const title = language === 'ar' ? department.titleAr : department.titleEn;
  const altTitle = language === 'ar' ? department.titleEn : department.titleAr;

  return (
    <section
      className={`shift-dept-card${isOpen ? 'shift-dept-card--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="shift-dept-card__header"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="shift-dept-card__chevron"
          strokeWidth={1.75}
        />
        <span aria-hidden="true" className="shift-dept-card__icon">
          {department.icon}
        </span>
        <span className="shift-dept-card__titles">
          <span className="shift-dept-card__title-primary">
            {title} ({department.employees.length})
          </span>
          <span className="shift-dept-card__title-secondary">{altTitle}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="shift-dept-card__panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="shift-dept-card__employees">
              {department.employees.map((employee) => (
                <ShiftEmployeeRow
                  employee={employee}
                  key={employee.id}
                  roleLabels={roleLabels}
                  selectedDay={selectedDay}
                  weeklySchedule={weeklySchedule}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function ShiftDepartmentSchedule({
  weeklySchedule,
  selectedDay,
}: ShiftDepartmentScheduleProps) {
  const { t } = useLanguage();
  const employees = useSyncStore(employeesRepository);

  const roleLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(roleLabelKeys) as ShiftRole[]).map((role) => [
          role,
          t(roleLabelKeys[role]),
        ]),
      ) as Record<ShiftRole, string>,
    [t],
  );

  const departments = useMemo(
    () => groupEmployeesByShiftDepartment(employees),
    [employees],
  );

  return (
    <div
      aria-label={t('shifts.weeklySubtitle')}
      className="shift-dept-schedule"
    >
      {departments.map((department, index) => (
        <ShiftDepartmentCard
          defaultOpen={index === 0}
          department={department}
          key={department.id}
          roleLabels={roleLabels}
          selectedDay={selectedDay}
          weeklySchedule={weeklySchedule}
        />
      ))}
    </div>
  );
}
