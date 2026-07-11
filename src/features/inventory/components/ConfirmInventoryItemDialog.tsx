import { AnimatePresence, motion } from 'framer-motion';
import { INVENTORY_ITEM_HAS_REFERENCES_MESSAGE } from '@/features/inventory';
import type { InventoryItem } from '@/features/inventory';
import { useLanguage } from '@/hooks';

export type InventoryItemConfirmAction = 'enable' | 'disable' | 'delete';

type ConfirmInventoryItemDialogProps = {
  action: InventoryItemConfirmAction | null;
  blockedMessage?: string | null;
  isOpen: boolean;
  isSaving: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmInventoryItemDialog({
  action,
  blockedMessage,
  isOpen,
  isSaving,
  item,
  onClose,
  onConfirm,
}: ConfirmInventoryItemDialogProps) {
  const { t } = useLanguage();

  if (!isOpen || !item || !action) {
    return null;
  }

  const isBlockedDelete =
    action === 'delete' &&
    blockedMessage === INVENTORY_ITEM_HAS_REFERENCES_MESSAGE;

  const title =
    action === 'delete'
      ? t('inventory.confirm.delete.title')
      : action === 'disable'
        ? t('inventory.confirm.disable.title')
        : t('inventory.confirm.enable.title');

  const message =
    action === 'delete'
      ? isBlockedDelete
        ? t('inventory.confirm.delete.blocked')
        : `${t('inventory.confirm.delete.message')} (${item.code} — ${item.name})`
      : action === 'disable'
        ? `${t('inventory.confirm.disable.message')} (${item.name})`
        : `${t('inventory.confirm.enable.message')} (${item.name})`;

  return (
    <AnimatePresence>
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
            aria-labelledby="confirm-inventory-item-title"
            aria-modal="true"
            className="admin-employee-modal"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            role="dialog"
          >
            <h3
              className="admin-employee-modal__title"
              id="confirm-inventory-item-title"
            >
              {title}
            </h3>
            <p className="admin-employee-modal__body">{message}</p>
            <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
              <button
                className="admin-editor-btn"
                disabled={isSaving}
                onClick={onClose}
                type="button"
              >
                {isBlockedDelete
                  ? t('admin.editor.cancel')
                  : t('admin.editor.cancel')}
              </button>
              {!isBlockedDelete ? (
                <button
                  className={`admin-editor-btn${action === 'delete' ? 'admin-editor-btn--danger' : 'admin-editor-btn--primary'}`}
                  disabled={isSaving}
                  onClick={() => void onConfirm()}
                  type="button"
                >
                  {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
                </button>
              ) : null}
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
