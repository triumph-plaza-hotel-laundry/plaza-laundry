import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';
import { useLanguage } from '@/hooks';
import type { ReactNode } from 'react';

type ArchiveHistoryViewShellProps = {
  children: ReactNode;
  titleEn: string;
  titleAr: string;
};

export function ArchiveHistoryViewShell({
  children,
  titleEn,
  titleAr,
}: ArchiveHistoryViewShellProps) {
  const { t } = useLanguage();
  const { exitArchiveView, formatMonthLabel, viewingMonth } =
    useInventoryArchive();

  return (
    <section
      aria-label={`${titleEn} / ${titleAr}`}
      className="admin-archive-history-view"
    >
      <div className="admin-archive-history-view__toolbar">
        <button
          className="admin-editor-btn admin-archive-history-view__back"
          onClick={exitArchiveView}
          type="button"
        >
          <span>{t('common.back')}</span>
          <span aria-hidden="true">{t('common.backAr')}</span>
        </button>
        {viewingMonth ? (
          <p className="admin-archive-history-view__meta" role="status">
            {formatMonthLabel(viewingMonth)} —{' '}
            {t('admin.inventory.history.readOnly')}
          </p>
        ) : null}
      </div>

      <header className="admin-archive-history-view__header">
        <h2 className="admin-archive-history-view__title-en">{titleEn}</h2>
        <h2 className="admin-archive-history-view__title-ar">{titleAr}</h2>
      </header>

      <div className="admin-archive-history-view__body">{children}</div>
    </section>
  );
}
