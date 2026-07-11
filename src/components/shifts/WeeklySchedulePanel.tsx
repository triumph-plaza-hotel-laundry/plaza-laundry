import { AnimatePresence, motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';
import { useEffect } from 'react';
import { employeesRepository } from '@/data/repositories';
import {
  shiftRoles,
  weekDays,
  type ShiftRole,
  type WeekDayId,
  type WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type WeeklySchedulePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: WeekDayId;
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

const roleLabelKeys: Record<ShiftRole, TranslationKey> = {
  washer: 'shifts.weekly.departments.washing',
  ghalya: 'shifts.weekly.departments.ghalya',
  ironing: 'shifts.weekly.departments.ironing',
  linen: 'shifts.weekly.departments.linen',
  calendar: 'shifts.weekly.departments.calendar',
  weeklyLeave: 'shifts.weekly.departments.weeklyLeave',
  annualLeave: 'shifts.weekly.departments.annualLeave',
};

function getEmployeeName(id: string, language: 'en' | 'ar'): string {
  const employee = employeesRepository.getById(id);
  if (!employee) {
    return '—';
  }

  return language === 'ar' ? employee.name.ar : employee.name.en;
}

function ScheduleCell({
  assignment,
  language,
}: {
  assignment: WeeklyCellAssignment;
  language: 'en' | 'ar';
}) {
  const { t } = useLanguage();

  return (
    <div className="weekly-schedule__cell">
      <div className="weekly-schedule__shift-block">
        <p className="weekly-schedule__shift-label">{t('shifts.morning')}</p>
        <p className="weekly-schedule__employee">
          {getEmployeeName(assignment.morning[0], language)}
        </p>
        <p className="weekly-schedule__employee">
          {getEmployeeName(assignment.morning[1], language)}
        </p>
      </div>
      <div className="weekly-schedule__cell-divider" aria-hidden="true" />
      <div className="weekly-schedule__shift-block">
        <p className="weekly-schedule__shift-label">{t('shifts.evening')}</p>
        <p className="weekly-schedule__employee">
          {getEmployeeName(assignment.evening[0], language)}
        </p>
        <p className="weekly-schedule__employee">
          {getEmployeeName(assignment.evening[1], language)}
        </p>
      </div>
    </div>
  );
}

export function WeeklySchedulePanel({
  isOpen,
  onClose,
  selectedDay,
  weeklySchedule,
}: WeeklySchedulePanelProps) {
  const { language, t } = useLanguage();
  const printSchedule = () => {
    window.print();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            aria-label={t('shifts.closeSchedule')}
            className="weekly-schedule__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.22 }}
            type="button"
          />

          <motion.div
            aria-labelledby="weekly-schedule-title"
            aria-modal="true"
            className="weekly-schedule"
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            role="dialog"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="weekly-schedule__header">
              <div className="weekly-schedule__title-block">
                <h2
                  className="weekly-schedule__title-en"
                  id="weekly-schedule-title"
                >
                  Weekly Schedule
                </h2>
                <h2 className="weekly-schedule__title-ar">الجدول الأسبوعي</h2>
                <p className="weekly-schedule__subtitle">
                  {t('shifts.weeklySubtitle')}
                </p>
              </div>
              <div className="weekly-schedule__actions">
                <button
                  className="weekly-schedule__print"
                  onClick={printSchedule}
                  type="button"
                >
                  <Printer aria-hidden="true" strokeWidth={1.7} />
                  <span>{t('shifts.printSchedule')}</span>
                </button>
                <button
                  aria-label={t('shifts.closeSchedule')}
                  className="weekly-schedule__close"
                  onClick={onClose}
                  type="button"
                >
                  <X aria-hidden="true" strokeWidth={1.75} />
                </button>
              </div>
            </header>

            <div className="weekly-schedule__scroll">
              <table className="weekly-schedule__table">
                <thead>
                  <tr>
                    <th className="weekly-schedule__corner" scope="col" />
                    {shiftRoles.map((role) => (
                      <th
                        className="weekly-schedule__day-head weekly-schedule__day-head--sticky"
                        key={role}
                        scope="col"
                      >
                        {t(roleLabelKeys[role])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((day) => (
                    <tr key={day}>
                      <th
                        className={`weekly-schedule__role-head${day === selectedDay ? 'weekly-schedule__role-head--today' : ''}`}
                        scope="row"
                      >
                        {t(dayLabelKeys[day])}
                      </th>
                      {shiftRoles.map((role) => (
                        <td
                          className="weekly-schedule__data"
                          data-label={t(roleLabelKeys[role])}
                          key={`${day}-${role}`}
                        >
                          <ScheduleCell
                            assignment={weeklySchedule[day][role]}
                            language={language}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
