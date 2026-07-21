import { useState, type FormEvent } from 'react';
import type { InventoryItem } from '@/features/inventory';
import { ISSUE_DEPARTMENTS } from '@/features/inventory/issue-departments';
import type { CreateUnderExecutionInput } from '@/features/inventory/under-execution-types';
import { useLanguage } from '@/hooks';

type UnderExecutionFormCardProps = {
  disabled: boolean;
  items: InventoryItem[];
  onSubmit: (input: CreateUnderExecutionInput) => Promise<void>;
};

const emptyForm = {
  supplier: '',
  department: '',
  itemId: '',
  quantity: '',
  date: '',
};

export function UnderExecutionFormCard({
  disabled,
  items,
  onSubmit,
}: UnderExecutionFormCardProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldError(null);

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

    setIsSubmitting(true);
    try {
      await onSubmit({
        supplier: form.supplier.trim(),
        department: form.department.trim(),
        itemCode: selected.code,
        itemName: selected.name,
        quantity,
        date: form.date,
      });
      setForm(emptyForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="inv-panel inv-panel--card">
      <header className="inv-panel__header">
        <h2 className="inv-panel__title-en">
          {t('inventory.underExecution.formTitle')}
        </h2>
        <h2 className="inv-panel__title-ar">
          {t('inventory.underExecution.formTitleAr')}
        </h2>
      </header>

      <form
        className="inv-form-grid"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="inv-field">
          <span>{t('inventory.stockEntry.supplier')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                supplier: event.target.value,
              }))
            }
            required
            value={form.supplier}
          />
        </label>

        <label className="inv-field">
          <span>{t('inventory.underExecution.supplierName')}</span>
          <select
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                department: event.target.value,
              }))
            }
            required
            value={form.department}
          >
            <option value="">{t('inventory.stockEntry.selectDepartment')}</option>
            {ISSUE_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label className="inv-field">
          <span>{t('inventory.v2.selectItem')}</span>
          <select
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({ ...current, itemId: event.target.value }))
            }
            required
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

        <label className="inv-field">
          <span>{t('inventory.v2.quantity')}</span>
          <input
            disabled={disabled || isSubmitting}
            inputMode="numeric"
            min={1}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                quantity: event.target.value,
              }))
            }
            required
            type="number"
            value={form.quantity}
          />
        </label>

        <label className="inv-field">
          <span>{t('inventory.v2.date')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({ ...current, date: event.target.value }))
            }
            required
            type="date"
            value={form.date}
          />
        </label>

        {fieldError ? (
          <p className="inv-error inv-field--wide">{fieldError}</p>
        ) : null}

        <div className="inv-form-actions">
          <button
            className="inv-btn inv-btn--gold"
            disabled={disabled || isSubmitting}
            type="submit"
          >
            {isSubmitting ? t('admin.editor.saving') : t('admin.editor.save')}
          </button>
        </div>
      </form>
    </section>
  );
}
