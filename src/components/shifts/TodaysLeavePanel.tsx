import { useMemo } from 'react';
import { CalendarOff } from 'lucide-react';
import {
  getTodaysApprovedLeaves,
  toDateKey,
  type LeaveEntry,
  type LeaveStatus,
} from '@/data/laundry-leaves';
import { useCairoToday, useLanguage, useLeaveStorage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

const statusKeys: Record<LeaveStatus, TranslationKey> = {
  pending: 'shifts.leaves.status.pending',
  approved: 'shifts.leaves.status.approved',
  rejected: 'shifts.leaves.status.rejected',
};

const leaveTypeKeys: Record<LeaveEntry['leaveType'], TranslationKey> = {
  annual: 'shifts.leaves.types.annual',
  sick: 'shifts.leaves.types.sick',
  emergency: 'shifts.leaves.types.emergency',
  unpaid: 'shifts.leaves.types.unpaid',
  other: 'shifts.leaves.types.other',
};

function formatDate(value: string, language: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

export function TodaysLeavePanel() {
  const { language, t } = useLanguage();
  const today = useCairoToday();
  const { slots } = useLeaveStorage();

  const todayKey = useMemo(
    () => toDateKey(today.year, today.month, today.day),
    [today.day, today.month, today.year],
  );

  const todaysLeaves = useMemo(
    () => getTodaysApprovedLeaves(slots, todayKey),
    [slots, todayKey],
  );

  return (
    <section aria-label={t('shifts.todaysLeave.title')} className="leave-panel leave-panel--readonly">
      <header className="leave-panel__header">
        <div className="leave-panel__title-wrap">
          <CalendarOff aria-hidden="true" className="leave-panel__icon" size={20} strokeWidth={1.5} />
          <div>
            <h2 className="leave-panel__title-en">{t('shifts.todaysLeave.title')}</h2>
            <p className="leave-panel__subtitle">{t('shifts.todaysLeave.subtitle')}</p>
          </div>
        </div>
      </header>

      {todaysLeaves.length === 0 ? (
        <p className="leave-panel__empty">{t('shifts.todaysLeave.empty')}</p>
      ) : (
        <div className="leave-panel__grid">
          {todaysLeaves.map((entry) => (
            <article className={`leave-card leave-card--${entry.status}`} key={entry.id}>
              <div className="leave-card__top">
                <span className={`leave-card__status leave-card__status--${entry.status}`}>
                  {t(statusKeys[entry.status])}
                </span>
              </div>

              <dl className="leave-card__details">
                <div className="leave-card__wide">
                  <dt>{t('shifts.leaves.employeeName')}</dt>
                  <dd>{entry.employeeName}</dd>
                </div>
                <div>
                  <dt>{t('shifts.leaves.leaveType')}</dt>
                  <dd>{t(leaveTypeKeys[entry.leaveType])}</dd>
                </div>
                <div>
                  <dt>{t('shifts.leaves.startDate')}</dt>
                  <dd>{formatDate(entry.startDate, language)}</dd>
                </div>
                <div>
                  <dt>{t('shifts.leaves.endDate')}</dt>
                  <dd>{formatDate(entry.endDate, language)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
