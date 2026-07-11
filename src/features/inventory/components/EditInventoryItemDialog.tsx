import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DUPLICATE_INVENTORY_CODE_MESSAGE } from '@/features/inventory';
import type { InventoryItem } from '@/features/inventory';
import { useLanguage } from '@/hooks';

type EditInventoryItemDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (
    itemId: string,
    input: { code: string; name: string },
  ) => Promise<void>;
};

export function EditInventoryItemDialog({
  isOpen,
  isSaving,
  item,
  onClose,
  onSave,
}: EditInventoryItemDialogProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) {
      setCode('');
      setName('');
      setFieldError(null);
      return;
    }

    setCode(item.code);
    setName(item.name);
    setFieldError(null);
  }, [isOpen, item]);

  const handleSave = async () => {
    if (!item) {
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setFieldError(t('inventory.validation.codeRequired'));
      return;
    }

    if (!trimmedName) {
      setFieldError(t('inventory.validation.nameRequired'));
      return;
    }

    setFieldError(null);

    try {
      await onSave(item.id, { code: trimmedCode, name: trimmedName });
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t('inventory.edit.failed');
      if (message === DUPLICATE_INVENTORY_CODE_MESSAGE) {
        setFieldError(t('inventory.validation.codeDuplicate'));
        return;
      }
      setFieldError(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && item ? (
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
              aria-labelledby="edit-inventory-item-title"
              aria-modal="true"
              className="admin-employee-modal"
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              role="dialog"
            >
              <h3
                className="admin-employee-modal__title"
                id="edit-inventory-item-title"
              >
                {t('inventory.actions.edit')}
              </h3>
              <label className="admin-editor-field">
                <span>{t('inventory.table.code')}</span>
                <input
                  autoFocus
                  onChange={(event) => {
                    setCode(event.target.value);
                    setFieldError(null);
                  }}
                  value={code}
                />
              </label>
              <label className="admin-editor-field">
                <span>{t('inventory.table.name')}</span>
                <input
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldError(null);
                  }}
                  value={name}
                />
              </label>
              {fieldError ? <p className="inv-error">{fieldError}</p> : null}
              <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
                <button
                  className="admin-editor-btn"
                  disabled={isSaving}
                  onClick={onClose}
                  type="button"
                >
                  {t('admin.editor.cancel')}
                </button>
                <button
                  className="admin-editor-btn admin-editor-btn--primary"
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
