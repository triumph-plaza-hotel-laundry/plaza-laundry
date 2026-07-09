import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';
import { useLanguage } from '@/hooks';

export function InventoryHistoryButton() {
  const { t } = useLanguage();
  const { openDrawer } = useInventoryArchive();

  return (
    <button
      aria-label={t('admin.inventory.history.open')}
      className="admin-inventory-history__trigger"
      onClick={openDrawer}
      type="button"
    >
      <span aria-hidden="true" className="admin-inventory-history__trigger-icon">
        📒
      </span>
    </button>
  );
}

export function InventoryHistoryDrawer() {
  const { t } = useLanguage();
  const { archiveMonths, closeDrawer, drawerOpen, formatMonthLabel, selectArchiveMonth } =
    useInventoryArchive();

  return (
    <AnimatePresence>
      {drawerOpen ? (
        <>
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={t('admin.inventory.history.close')}
            className="admin-inventory-history__backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={closeDrawer}
            type="button"
          />
          <motion.aside
            animate={{ x: 0 }}
            aria-label={t('admin.inventory.history.title')}
            className="admin-inventory-history__drawer"
            exit={{ x: '-100%' }}
            initial={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="admin-inventory-history__drawer-header">
              <h2 className="admin-inventory-history__drawer-title">{t('admin.inventory.history.title')}</h2>
              <button
                aria-label={t('admin.inventory.history.close')}
                className="admin-inventory-history__close"
                onClick={closeDrawer}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="admin-inventory-history__drawer-body">
              {archiveMonths.length === 0 ? (
                <p className="admin-inventory-history__empty">{t('admin.inventory.history.empty')}</p>
              ) : (
                <ul className="admin-inventory-history__list">
                  {archiveMonths.map((monthKey) => (
                    <li key={monthKey}>
                      <button
                        className="admin-inventory-history__month"
                        onClick={() => void selectArchiveMonth(monthKey)}
                        type="button"
                      >
                        <span aria-hidden="true" className="admin-inventory-history__month-icon">
                          📒
                        </span>
                        <span className="admin-inventory-history__month-label">
                          {formatMonthLabel(monthKey)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function InventoryArchiveBanner() {
  const { t } = useLanguage();
  const { exitArchiveView, formatMonthLabel, isArchiveView, viewingMonth } = useInventoryArchive();

  if (!isArchiveView || !viewingMonth) {
    return null;
  }

  return (
    <div className="admin-inventory-history__banner" role="status">
      <p className="admin-inventory-history__banner-text">
        {formatMonthLabel(viewingMonth)} — {t('admin.inventory.history.readOnly')}
      </p>
      <button className="admin-inventory-history__banner-exit" onClick={exitArchiveView} type="button">
        {t('admin.inventory.history.exit')}
      </button>
    </div>
  );
}
