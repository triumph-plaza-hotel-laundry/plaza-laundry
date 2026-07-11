import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  ShiftPeriod,
  ShiftRole,
  WeeklyCellAssignment,
} from '@/data/laundry-shifts';
import type { AdminShiftDepartmentView } from '@/lib/admin-shift-departments';
import { isDepartmentDirtyForDay } from '@/lib/admin-shift-validation';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type SlotKey = 'morning0' | 'morning1' | 'evening0' | 'evening1';

const slotRows: readonly {
  key: SlotKey;
  period: ShiftPeriod;
  index: 0 | 1;
  labelKey: TranslationKey;
}[] = [
  {
    key: 'morning0',
    period: 'morning',
    index: 0,
    labelKey: 'admin.shifts.slots.morning1',
  },
  {
    key: 'morning1',
    period: 'morning',
    index: 1,
    labelKey: 'admin.shifts.slots.morning2',
  },
  {
    key: 'evening0',
    period: 'evening',
    index: 0,
    labelKey: 'admin.shifts.slots.evening1',
  },
  {
    key: 'evening1',
    period: 'evening',
    index: 1,
    labelKey: 'admin.shifts.slots.evening2',
  },
];

type AdminShiftsDepartmentAccordionProps = {
  department: AdminShiftDepartmentView;
  isOpen: boolean;
  isSaving: boolean;
  currentDaySchedule: Record<ShiftRole, WeeklyCellAssignment>;
  baselineDaySchedule: Record<ShiftRole, WeeklyCellAssignment>;
  onToggle: () => void;
  onUpdateSlot: (role: ShiftRole, slot: SlotKey, employeeId: string) => void;
  onSaveDepartment: () => void;
  onResetDepartment: () => void;
};

export function AdminShiftsDepartmentAccordion({
  department,
  isOpen,
  isSaving,
  currentDaySchedule,
  baselineDaySchedule,
  onToggle,
  onUpdateSlot,
  onSaveDepartment,
  onResetDepartment,
}: AdminShiftsDepartmentAccordionProps) {
  const { language, t } = useLanguage();
  const title = language === 'ar' ? department.titleAr : department.titleEn;
  const altTitle = language === 'ar' ? department.titleEn : department.titleAr;
  const role = department.shiftRole;
  const cell = currentDaySchedule[role];
  const isDepartmentDirty = isDepartmentDirtyForDay(
    currentDaySchedule,
    baselineDaySchedule,
    role,
  );

  const managerLabel = department.manager
    ? language === 'ar'
      ? `${department.manager.name.ar} — ${department.manager.jobTitle.ar}`
      : `${department.manager.name.en} — ${department.manager.jobTitle.en}`
    : null;

  return (
    <section
      className={`admin-shifts-dept${isOpen ? 'admin-shifts-dept--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="admin-shifts-dept__trigger"
        onClick={onToggle}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="admin-shifts-dept__chevron"
          strokeWidth={1.75}
        />
        <span aria-hidden="true" className="admin-shifts-dept__icon">
          {department.icon}
        </span>
        <span className="admin-shifts-dept__titles">
          <span className="admin-shifts-dept__title-primary">{title}</span>
          <span className="admin-shifts-dept__title-secondary">{altTitle}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="admin-shifts-dept__panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="admin-shifts-dept__panel-inner">
              {managerLabel ? (
                <p className="admin-shifts-dept__manager">
                  {t('admin.shifts.manager')}:{' '}
                  <span className="admin-shifts-dept__manager-name">
                    {managerLabel}
                  </span>
                </p>
              ) : null}

              <div className="admin-shifts-dept__table-wrap">
                <table className="admin-shifts-dept__table">
                  <thead>
                    <tr>
                      <th scope="col">{t('admin.editor.shiftRole')}</th>
                      <th scope="col">{t('admin.shifts.employee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotRows.map((slot) => (
                      <tr key={slot.key}>
                        <td className="admin-shifts-dept__slot-label">
                          {t(slot.labelKey)}
                        </td>
                        <td>
                          <select
                            className="admin-shifts-dept__select"
                            onChange={(event) =>
                              onUpdateSlot(role, slot.key, event.target.value)
                            }
                            value={cell[slot.period][slot.index]}
                          >
                            <option value="">—</option>
                            {department.employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {language === 'ar'
                                  ? `${employee.name.ar} — ${employee.jobTitle.ar}`
                                  : `${employee.name.en} — ${employee.jobTitle.en}`}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-shifts-dept__actions">
                <button
                  className="admin-shifts-dept__btn admin-shifts-dept__btn--primary"
                  disabled={isSaving || !isDepartmentDirty}
                  onClick={onSaveDepartment}
                  type="button"
                >
                  {t('admin.shifts.saveDepartment')}
                </button>
                <button
                  className="admin-shifts-dept__btn"
                  disabled={isSaving || !isDepartmentDirty}
                  onClick={onResetDepartment}
                  type="button"
                >
                  {t('admin.shifts.resetDepartment')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
