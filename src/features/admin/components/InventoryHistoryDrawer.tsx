import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';
import { listMonthlyArchiveTransactionPresence } from '@/features/inventory/monthly-archive-service';
import type { InventoryTransactionType } from '@/features/inventory/types';
import { useLanguage } from '@/hooks';

const ARCHIVE_ENTRY_TYPES: readonly InventoryTransactionType[] = [
  'issue',
  'receive',
];

type PendingDelete = {
  monthKey: string;
  transactionType: InventoryTransactionType;
  label: string;
};

type ArchivePresenceMap = Record<
  string,
  { hasIssue: boolean; hasReceive: boolean }
>;

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
      <span
        aria-hidden="true"
        className="admin-inventory-history__trigger-icon"
      >
        📒
      </span>
    </button>
  );
}

export function InventoryHistoryDrawer() {
  const { t } = useLanguage();
  const {
    archiveMonths,
    closeDrawer,
    deleteArchiveTransactions,
    drawerOpen,
    formatArchiveTypeLabel,
    formatMonthLabel,
    selectArchiveMonth,
    viewingMonth,
    viewingTransactionType,
  } = useInventoryArchive();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [presenceByMonth, setPresenceByMonth] = useState<ArchivePresenceMap>(
    {},
  );
  const [presenceRevision, setPresenceRevision] = useState(0);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    let active = true;

    const loadPresence = async () => {
      try {
        const rows = await listMonthlyArchiveTransactionPresence();
        if (!active) {
          return;
        }

        const next: ArchivePresenceMap = {};
        for (const row of rows) {
          next[row.monthKey] = {
            hasIssue: row.hasIssue,
            hasReceive: row.hasReceive,
          };
        }
        setPresenceByMonth(next);
      } catch {
        if (active) {
          setPresenceByMonth({});
        }
      }
    };

    void loadPresence();

    return () => {
      active = false;
    };
  }, [archiveMonths, drawerOpen, presenceRevision]);

  const visibleMonths = useMemo(() => {
    return archiveMonths.filter((monthKey) => {
      const presence = presenceByMonth[monthKey];
      if (!presence) {
        return true;
      }
      return presence.hasIssue || presence.hasReceive;
    });
  }, [archiveMonths, presenceByMonth]);

  const isEntryVisible = useCallback(
    (monthKey: string, transactionType: InventoryTransactionType) => {
      const presence = presenceByMonth[monthKey];
      if (!presence) {
        return true;
      }
      return transactionType === 'issue'
        ? presence.hasIssue
        : presence.hasReceive;
    },
    [presenceByMonth],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteArchiveTransactions(
        pendingDelete.monthKey,
        pendingDelete.transactionType,
      );
      setPendingDelete(null);
      setPresenceRevision((current) => current + 1);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteArchiveTransactions, pendingDelete]);

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
              <h2 className="admin-inventory-history__drawer-title">
                {t('admin.inventory.history.title')}
              </h2>
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
              {visibleMonths.length === 0 ? (
                <p className="admin-inventory-history__empty">
                  {t('admin.inventory.history.empty')}
                </p>
              ) : (
                <ul className="admin-inventory-history__list">
                  {visibleMonths.map((monthKey) => {
                    const monthLabel = formatMonthLabel(monthKey);
                    const visibleEntries = ARCHIVE_ENTRY_TYPES.filter(
                      (transactionType) =>
                        isEntryVisible(monthKey, transactionType),
                    );

                    if (visibleEntries.length === 0) {
                      return null;
                    }

                    return (
                      <li
                        className="admin-inventory-history__month-group"
                        key={monthKey}
                      >
                        <div className="admin-inventory-history__month-heading">
                          <span
                            aria-hidden="true"
                            className="admin-inventory-history__month-icon"
                          >
                            📒
                          </span>
                          <span className="admin-inventory-history__month-label">
                            {monthLabel}
                          </span>
                        </div>

                        <ul className="admin-inventory-history__entries">
                          {visibleEntries.map((transactionType) => {
                            const entryLabel = formatArchiveTypeLabel(
                              monthKey,
                              transactionType,
                            );
                            const isActive =
                              viewingMonth === monthKey &&
                              viewingTransactionType === transactionType;

                            return (
                              <li key={`${monthKey}-${transactionType}`}>
                                <div
                                  className={`admin-inventory-history__entry${isActive ? ' admin-inventory-history__entry--active' : ''}`}
                                >
                                  <button
                                    className="admin-inventory-history__entry-open"
                                    onClick={() =>
                                      void selectArchiveMonth(
                                        monthKey,
                                        transactionType,
                                      )
                                    }
                                    type="button"
                                  >
                                    <span className="admin-inventory-history__entry-label">
                                      {entryLabel}
                                    </span>
                                  </button>
                                  <button
                                    aria-label={`${t('admin.inventory.history.deleteArchive')} — ${entryLabel}`}
                                    className="admin-inventory-history__entry-delete"
                                    onClick={() =>
                                      setPendingDelete({
                                        monthKey,
                                        transactionType,
                                        label: entryLabel,
                                      })
                                    }
                                    type="button"
                                  >
                                    <Trash2
                                      aria-hidden="true"
                                      size={15}
                                      strokeWidth={1.75}
                                    />
                                    <span>
                                      {t(
                                        'admin.inventory.history.deleteArchive',
                                      )}
                                    </span>
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>

          {pendingDelete ? (
            <>
              <motion.button
                animate={{ opacity: 1 }}
                aria-label={t('admin.editor.cancel')}
                className="admin-employee-modal__backdrop"
                initial={{ opacity: 0 }}
                onClick={() => {
                  if (!isDeleting) {
                    setPendingDelete(null);
                  }
                }}
                type="button"
              />
              <div className="admin-employee-modal__viewport">
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  aria-labelledby="confirm-delete-archive-title"
                  aria-modal="true"
                  className="admin-employee-modal"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  role="dialog"
                >
                  <h3
                    className="admin-employee-modal__title"
                    id="confirm-delete-archive-title"
                  >
                    {t('admin.inventory.history.deleteConfirmTitle')}
                  </h3>
                  <p className="admin-employee-modal__body">
                    {t('admin.inventory.history.deleteConfirmMessage').replace(
                      '{archive}',
                      pendingDelete.label,
                    )}
                  </p>
                  <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
                    <button
                      className="admin-editor-btn"
                      disabled={isDeleting}
                      onClick={() => setPendingDelete(null)}
                      type="button"
                    >
                      {t('admin.editor.cancel')}
                    </button>
                    <button
                      className="admin-editor-btn admin-editor-btn--danger"
                      disabled={isDeleting}
                      onClick={() => void handleConfirmDelete()}
                      type="button"
                    >
                      {isDeleting
                        ? t('admin.editor.saving')
                        : t('admin.inventory.history.deleteArchive')}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </AnimatePresence>
  );
}
