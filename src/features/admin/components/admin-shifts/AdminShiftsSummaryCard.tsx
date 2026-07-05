import { useMemo } from 'react';
import type { WeekDayId, WeeklyCellAssignment } from '@/data/laundry-shifts';
import { shiftRoles } from '@/data/laundry-shifts';
import { employeesRepository } from '@/data/repositories/employees-repository';
import { getShiftEligibleEmployees } from '@/lib/employee-roles';
import {
  countEveningAssignments,
  countMorningAssignments,
  countOffAssignments,
} from '@/lib/admin-shift-validation';
import { useCairoToday, useLanguage, useSyncStore } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type AdminShiftsSummaryCardProps = {
  selectedDay: WeekDayId;
  daySchedule: Record<(typeof shiftRoles)[number], WeeklyCellAssignment>;
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

export function AdminShiftsSummaryCard({ selectedDay, daySchedule }: AdminShiftsSummaryCardProps) {
  const { language, t } = useLanguage();
  const today = useCairoToday();
  const employees = useSyncStore(employeesRepository);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
        timeZone: 'Africa/Cairo',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(today.year, today.month - 1, today.day)),
    [language, today.day, today.month, today.year],
  );

  const totalEmployees = getShiftEligibleEmployees(employees).length;
  const morningCount = countMorningAssignments(daySchedule);
  const eveningCount = countEveningAssignments(daySchedule);
  const offCount = countOffAssignments(daySchedule);

  return (
    <section aria-label={t('admin.shifts.summary.title')} className="admin-shifts-editor__summary">
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.currentDay')}</span>
        <span className="admin-shifts-editor__summary-value admin-shifts-editor__summary-value--highlight">
          {t(dayLabelKeys[selectedDay])}
        </span>
      </div>
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.currentDate')}</span>
        <span className="admin-shifts-editor__summary-value">{formattedDate}</span>
      </div>
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.totalEmployees')}</span>
        <span className="admin-shifts-editor__summary-value">{totalEmployees}</span>
      </div>
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.morningCount')}</span>
        <span className="admin-shifts-editor__summary-value">{morningCount}</span>
      </div>
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.eveningCount')}</span>
        <span className="admin-shifts-editor__summary-value">{eveningCount}</span>
      </div>
      <div className="admin-shifts-editor__summary-item">
        <span className="admin-shifts-editor__summary-label">{t('admin.shifts.summary.offCount')}</span>
        <span className="admin-shifts-editor__summary-value">{offCount}</span>
      </div>
    </section>
  );
}
