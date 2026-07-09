import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { TodaysScheduleCard } from '@/components/shifts/TodaysScheduleCard';
import { TodaysLeavePanel } from '@/components/shifts/TodaysLeavePanel';
import { WeeklyShiftReadOnlyTable } from '@/components/shifts/WeeklyShiftReadOnlyTable';
import type { WeekDayId } from '@/data/laundry-shifts';
import { employeesRepository } from '@/data/repositories';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { getShiftEligibleEmployees } from '@/lib/employee-roles';
import { useCairoToday, useCairoWeekDay, useLanguage, useSyncStore } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/shifts/shifts-page.css';

const dayLabelKeys: Record<WeekDayId, TranslationKey> = {
  saturday: 'shifts.days.saturday',
  sunday: 'shifts.days.sunday',
  monday: 'shifts.days.monday',
  tuesday: 'shifts.days.tuesday',
  wednesday: 'shifts.days.wednesday',
  thursday: 'shifts.days.thursday',
  friday: 'shifts.days.friday',
};

export function ShiftsPage() {
  const { language, t } = useLanguage();
  const today = useCairoToday();
  const selectedDay = useCairoWeekDay();
  const shifts = useSyncStore(shiftsRepository);
  const employees = useSyncStore(employeesRepository);
  const shiftEmployees = useMemo(() => getShiftEligibleEmployees(employees), [employees]);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
        timeZone: 'Africa/Cairo',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(today.year, today.month - 1, today.day)),
    [language, today.day, today.month, today.year],
  );

  const daySchedule = shifts.weeklySchedule[selectedDay];

  return (
    <section className="shifts-page shifts-roster-page mx-auto">
      <header className="shifts-page__header">
        <div className="shifts-page__title-row">
          <div className="shifts-page__title-block">
            <span aria-hidden="true" className="shifts-page__emoji">
              ✦
            </span>
            <h1 className="shifts-page__title-en">{t('nav.shifts')}</h1>
          </div>

          <button
            className="luxury-print-btn shifts-page__print"
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" className="luxury-print-btn__icon" strokeWidth={1.75} />
            {t('shifts.printSchedule')}
          </button>
        </div>
      </header>

      <TodaysScheduleCard
        dayLabelKey={dayLabelKeys[selectedDay]}
        daySchedule={daySchedule}
        employees={shiftEmployees}
        formattedDate={formattedDate}
        selectedDay={selectedDay}
      />

      <WeeklyShiftReadOnlyTable employees={shiftEmployees} weeklySchedule={shifts.weeklySchedule} />

      <TodaysLeavePanel />
    </section>
  );
}
