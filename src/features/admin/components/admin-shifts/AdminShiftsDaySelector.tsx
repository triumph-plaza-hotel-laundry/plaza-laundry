import { useEffect, useRef } from 'react';
import { weekDays, type WeekDayId } from '@/data/laundry-shifts';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type AdminShiftsDaySelectorProps = {
  selectedDay: WeekDayId;
  onSelectDay: (day: WeekDayId) => void;
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

export function AdminShiftsDaySelector({
  selectedDay,
  onSelectDay,
}: AdminShiftsDaySelectorProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<WeekDayId, HTMLButtonElement>>>({});
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const activeButton = buttonRefs.current[selectedDay];
    if (!activeButton) {
      return;
    }

    activeButton.scrollIntoView({
      behavior: hasScrolledRef.current ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    });
    hasScrolledRef.current = true;
  }, [selectedDay]);

  return (
    <div
      aria-label={t('admin.shifts.daySelector')}
      className="admin-shifts-editor__day-scroll"
      ref={scrollRef}
    >
      <div className="admin-shifts-editor__day-row" role="tablist">
        {weekDays.map((day) => (
          <button
            aria-selected={selectedDay === day}
            className={`admin-shifts-editor__day-btn${selectedDay === day ? 'admin-shifts-editor__day-btn--active' : ''}`}
            key={day}
            onClick={() => onSelectDay(day)}
            ref={(element) => {
              if (element) {
                buttonRefs.current[day] = element;
              }
            }}
            role="tab"
            type="button"
          >
            {t(dayLabelKeys[day])}
          </button>
        ))}
      </div>
    </div>
  );
}
