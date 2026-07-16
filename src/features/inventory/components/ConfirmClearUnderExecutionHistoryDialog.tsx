import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks';

type ConfirmClearUnderExecutionHistoryDialogProps = {
  isOpen: boolean;
  isClearing: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmClearUnderExecutionHistoryDialog({
  isOpen,
  isClearing,
  onClose,
  onConfirm,
}: ConfirmClearUnderExecutionHistoryDialogProps) {
  const { t } = useLanguage();
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
    }
  }, [isOpen]);

  const canConfirm = confirmationText.trim() === 'DELETE';

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            aria-label={t('admin.editor.cancel')}
            className="admin-employee-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <div className="admin-employee-modal__viewport">
            <motion.div
              aria-labelledby="clear-under-execution-history-title"
              aria-modal="true"
              className="admin-employee-modal"
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              role="dialog"
            >
              <h3
                className="admin-employee-modal__title"
                id="clear-under-execution-history-title"
              >
                {t('inventory.underExecution.clearHistoryTitle')}
              </h3>
              <p className="admin-employee-modal__body">
                {t('inventory.underExecution.clearHistoryMessage')}
              </p>
              <label className="admin-editor-field">
                <span>{t('inventory.underExecution.clearHistoryTypeDelete')}</span>
                <input
                  autoFocus
                  autoComplete="off"
                  disabled={isClearing}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder="DELETE"
                  spellCheck={false}
                  value={confirmationText}
                />
              </label>
              <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
                <button
                  className="admin-editor-btn"
                  disabled={isClearing}
                  onClick={onClose}
                  type="button"
                >
                  {t('admin.editor.cancel')}
                </button>
                <button
                  className="admin-editor-btn admin-editor-btn--danger"
                  disabled={isClearing || !canConfirm}
                  onClick={() => void onConfirm()}
                  type="button"
                >
                  {isClearing
                    ? t('admin.editor.saving')
                    : t('inventory.underExecution.clearHistory')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
