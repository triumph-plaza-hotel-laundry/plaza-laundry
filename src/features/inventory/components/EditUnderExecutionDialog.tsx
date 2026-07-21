import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { InventoryItem } from '@/features/inventory';
import { ISSUE_DEPARTMENTS } from '@/features/inventory/issue-departments';
import type {
  UnderExecutionRecord,
  UpdateUnderExecutionInput,
} from '@/features/inventory/under-execution-types';
import { useLanguage } from '@/hooks';

type EditUnderExecutionDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  items: InventoryItem[];
  record: UnderExecutionRecord | null;
  onClose: () => void;
  onSave: (id: string, input: UpdateUnderExecutionInput) => Promise<void>;
};

type EditFormState = {
  supplier: string;
  department: string;
  itemId: string;
  quantity: string;
  date: string;
};

function resolveItemId(
  items: InventoryItem[],
  record: UnderExecutionRecord | null,
) {
  if (!record) {
    return '';
  }

  const byCodeAndName = items.find(
    (item) => item.code === record.itemCode && item.name === record.itemName,
  );
  if (byCodeAndName) {
    return byCodeAndName.id;
  }

  const byCode = items.find((item) => item.code === record.itemCode);
  if (byCode) {
    return byCode.id;
  }

  return items.find((item) => item.name === record.itemName)?.id ?? '';
}

export function EditUnderExecutionDialog({
  isOpen,
  isSaving,
  items,
  record,
  onClose,
  onSave,
}: EditUnderExecutionDialogProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<EditFormState>({
    supplier: '',
    department: '',
    itemId: '',
    quantity: '',
    date: '',
  });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const departmentOptions = useMemo(() => {
    const current = form.department.trim();
    if (
      current &&
      !(ISSUE_DEPARTMENTS as readonly string[]).includes(current)
    ) {
      return [current, ...ISSUE_DEPARTMENTS];
    }
    return [...ISSUE_DEPARTMENTS];
  }, [form.department]);

  useEffect(() => {
    if (!isOpen || !record) {
      setForm({
        supplier: '',
        department: '',
        itemId: '',
        quantity: '',
        date: '',
      });
      setFieldError(null);
      return;
    }

    setForm({
      supplier: record.supplier,
      department: record.department,
      itemId: resolveItemId(items, record),
      quantity: String(record.quantity),
      date: record.date,
    });
    setFieldError(null);
  }, [isOpen, items, record]);

  const handleSave = async () => {
    if (!record) {
      return;
    }

    const selected = items.find((item) => item.id === form.itemId);
    const quantity = Number(form.quantity);

    if (!form.supplier.trim()) {
      setFieldError(t('inventory.underExecution.validation.supplier'));
      return;
    }
    if (!form.department.trim()) {
      setFieldError(t('inventory.underExecution.validation.supplierName'));
      return;
    }
    if (!selected) {
      setFieldError(t('inventory.underExecution.validation.item'));
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      setFieldError(t('inventory.underExecution.validation.quantity'));
      return;
    }
    if (!form.date) {
      setFieldError(t('inventory.underExecution.validation.date'));
      return;
    }

    setFieldError(null);

    try {
      await onSave(record.id, {
        supplier: form.supplier.trim(),
        department: form.department.trim(),
        itemCode: selected.code,
        itemName: selected.name,
        quantity,
        date: form.date,
      });
      onClose();
    } catch (caught) {
      setFieldError(
        caught instanceof Error
          ? caught.message
          : t('inventory.underExecution.updateFailed'),
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && record ? (
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
              aria-labelledby="edit-under-execution-title"
              aria-modal="true"
              className="admin-employee-modal"
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              role="dialog"
            >
              <h3
                className="admin-employee-modal__title"
                id="edit-under-execution-title"
              >
                {t('inventory.underExecution.editTitle')}
              </h3>

              <label className="admin-editor-field">
                <span>{t('inventory.stockEntry.supplier')}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplier: event.target.value,
                    }))
                  }
                  value={form.supplier}
                />
              </label>

              <label className="admin-editor-field">
                <span>{t('inventory.underExecution.supplierName')}</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                  value={form.department}
                >
                  <option value="">
                    {t('inventory.stockEntry.selectDepartment')}
                  </option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-editor-field">
                <span>{t('inventory.v2.selectItem')}</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      itemId: event.target.value,
                    }))
                  }
                  value={form.itemId}
                >
                  <option value="">{t('inventory.v2.selectItem')}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} — ` : ''}
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-editor-field">
                <span>{t('inventory.v2.quantity')}</span>
                <input
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  type="number"
                  value={form.quantity}
                />
              </label>

              <label className="admin-editor-field">
                <span>{t('inventory.v2.date')}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.date}
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
