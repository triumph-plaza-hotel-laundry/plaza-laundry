import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { ConfirmClearUnderExecutionHistoryDialog } from '@/features/inventory/components/ConfirmClearUnderExecutionHistoryDialog';
import { EditUnderExecutionDialog } from '@/features/inventory/components/EditUnderExecutionDialog';
import { InventoryToast } from '@/features/inventory/components/InventoryFeedback';
import { UnderExecutionAccordionList } from '@/features/inventory/components/UnderExecutionAccordionList';
import { UnderExecutionFormCard } from '@/features/inventory/components/UnderExecutionFormCard';
import { UnderExecutionHistoryTable } from '@/features/inventory/components/UnderExecutionHistoryTable';
import type { UnderExecutionRecord } from '@/features/inventory/under-execution-types';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useInventoryManagement, useLanguage, useUnderExecution } from '@/hooks';

export function AdminUnderExecutionPage() {
  const { t } = useLanguage();
  const inventory = useInventoryManagement({ itemsScope: 'managed' });
  const underExecution = useUnderExecution();

  const [editingRecord, setEditingRecord] =
    useState<UnderExecutionRecord | null>(null);
  const [deletingRecord, setDeletingRecord] =
    useState<UnderExecutionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const items = inventory.activeItems;
  const isBusy = inventory.isBusy || underExecution.isBusy;

  const handleConfirmDelete = async () => {
    if (!deletingRecord) {
      return;
    }

    setIsDeleting(true);
    try {
      await underExecution.deleteRecord(deletingRecord.id);
      setDeletingRecord(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      await underExecution.clearHistory();
      setIsClearHistoryOpen(false);
    } finally {
      setIsClearingHistory(false);
    }
  };

  return (
    <div className="admin-under-execution inv-management-page">
      <AdminPageHeader
        subtitle={t('inventory.underExecution.subtitle')}
        titleAr="تحت التنفيذ"
        titleEn="Under Execution"
      />

      {underExecution.error ? (
        <p className="inv-error" role="alert">
          {underExecution.error}
        </p>
      ) : null}

      <UnderExecutionFormCard
        disabled={isBusy || !underExecution.isReady}
        items={items}
        onSubmit={underExecution.createRecord}
      />

      <UnderExecutionAccordionList
        disabled={isBusy}
        onDelete={setDeletingRecord}
        onEdit={setEditingRecord}
        records={underExecution.records}
      />

      <UnderExecutionHistoryTable
        disabled={isBusy}
        onClearHistory={() => setIsClearHistoryOpen(true)}
        records={underExecution.history}
      />

      <EditUnderExecutionDialog
        isOpen={Boolean(editingRecord)}
        isSaving={underExecution.isBusy}
        items={items}
        onClose={() => setEditingRecord(null)}
        onSave={underExecution.updateRecord}
        record={editingRecord}
      />

      <ConfirmClearUnderExecutionHistoryDialog
        isClearing={isClearingHistory}
        isOpen={isClearHistoryOpen}
        onClose={() => setIsClearHistoryOpen(false)}
        onConfirm={handleConfirmClearHistory}
      />

      <AnimatePresence>
        {deletingRecord ? (
          <>
            <motion.button
              aria-label={t('admin.editor.cancel')}
              className="admin-employee-modal__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingRecord(null)}
              type="button"
            />
            <div className="admin-employee-modal__viewport">
              <motion.div
                aria-labelledby="delete-under-execution-title"
                aria-modal="true"
                className="admin-employee-modal"
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                role="dialog"
              >
                <h3
                  className="admin-employee-modal__title"
                  id="delete-under-execution-title"
                >
                  {t('inventory.underExecution.deleteTitle')}
                </h3>
                <p className="admin-employee-modal__body">
                  {t('inventory.underExecution.deleteMessage')} (
                  {deletingRecord.itemName})
                </p>
                <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
                  <button
                    className="admin-editor-btn"
                    disabled={isDeleting}
                    onClick={() => setDeletingRecord(null)}
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
                      : t('admin.editor.delete')}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {underExecution.toast ? (
          <InventoryToast toast={underExecution.toast} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
