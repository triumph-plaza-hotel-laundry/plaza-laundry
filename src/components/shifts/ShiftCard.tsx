import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { employeesRepository } from '@/data/repositories';
import { SHIFT_HOURS, type ShiftPeriod } from '@/data/laundry-shifts';
import { useLanguage, useSyncStore } from '@/hooks';
import { ShiftEmployeeMiniCard } from '@/components/shifts/ShiftEmployeeMiniCard';

type ShiftCardProps = {
  period: ShiftPeriod;
  employeeIds: readonly string[];
  hours?: string;
};

const periodIcons = {
  morning: Sun,
  evening: Moon,
} as const;

export function ShiftCard({
  period,
  employeeIds,
  hours: hoursOverride,
}: ShiftCardProps) {
  const { language, t } = useLanguage();
  const employees = useSyncStore(employeesRepository);
  const Icon = periodIcons[period];
  const titleKey =
    period === 'morning' ? 'shifts.morningShift' : 'shifts.eveningShift';
  const hours =
    hoursOverride ?? SHIFT_HOURS[period][language === 'ar' ? 'ar' : 'en'];

  const employeesOnShift = employeeIds
    .map((id) => employees.find((employee) => employee.id === id))
    .filter((employee): employee is NonNullable<typeof employee> =>
      Boolean(employee),
    );

  return (
    <motion.section
      className={`shift-card shift-card--${period}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <header className="shift-card__header">
        <div className="shift-card__icon-wrap" aria-hidden="true">
          <Icon className="shift-card__icon" strokeWidth={1.5} />
        </div>
        <div className="shift-card__title-block">
          <h2 className="shift-card__title">{t(titleKey)}</h2>
          <p className="shift-card__hours">
            <span className="shift-card__hours-label">
              {t('shifts.workingHours')}
            </span>
            <span className="shift-card__hours-value">{hours}</span>
          </p>
        </div>
      </header>

      <div className="shift-card__divider" aria-hidden="true" />

      <div className="shift-card__grid">
        {employeesOnShift.map((employee, index) => (
          <ShiftEmployeeMiniCard
            employee={employee}
            index={index}
            key={employee.id}
          />
        ))}
      </div>
    </motion.section>
  );
}
