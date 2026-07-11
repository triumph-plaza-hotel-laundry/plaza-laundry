import type { ShiftPeriod } from '@/data/laundry-shifts';
import { useLanguage } from '@/hooks';

type AdminShiftsTimeCardProps = {
  morningValue: string;
  eveningValue: string;
  onUpdateHours: (period: ShiftPeriod, value: string) => void;
};

export function AdminShiftsTimeCard({
  morningValue,
  eveningValue,
  onUpdateHours,
}: AdminShiftsTimeCardProps) {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t('admin.shifts.timeCard.title')}
      className="admin-shifts-editor__time-card"
    >
      <div className="admin-shifts-editor__time-block">
        <label
          className="admin-shifts-editor__time-label"
          htmlFor="admin-shifts-morning-hours"
        >
          {t('shifts.morningShift')}
        </label>
        <input
          className="admin-shifts-editor__time-input"
          id="admin-shifts-morning-hours"
          onChange={(event) => onUpdateHours('morning', event.target.value)}
          type="text"
          value={morningValue}
        />
      </div>
      <div className="admin-shifts-editor__time-block">
        <label
          className="admin-shifts-editor__time-label"
          htmlFor="admin-shifts-evening-hours"
        >
          {t('shifts.eveningShift')}
        </label>
        <input
          className="admin-shifts-editor__time-input"
          id="admin-shifts-evening-hours"
          onChange={(event) => onUpdateHours('evening', event.target.value)}
          type="text"
          value={eveningValue}
        />
      </div>
    </section>
  );
}
