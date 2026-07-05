import { useState, type FormEvent } from 'react';
import type { InventoryItem } from '@/features/inventory';
import { NOT_ENOUGH_STOCK_MESSAGE } from '@/features/inventory';
import { useLanguage } from '@/hooks';

type IssueItemsCardProps = {
  disabled: boolean;
  items: InventoryItem[];
  onSubmit: (input: {
    itemId: string;
    employee: string;
    quantity: number;
    reason: string;
  }) => Promise<void>;
};

const emptyForm = {
  itemId: '',
  employee: '',
  quantity: '',
  reason: '',
};

export function IssueItemsCard({ disabled, items, onSubmit }: IssueItemsCardProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedItem = items.find((item) => item.id === form.itemId);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    const quantity = Number(form.quantity);

    if (selectedItem && quantity > selectedItem.remainingQuantity) {
      setLocalError(NOT_ENOUGH_STOCK_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        itemId: form.itemId,
        employee: form.employee,
        quantity,
        reason: form.reason,
      });
      setForm(emptyForm);
    } catch (caught) {
      if (caught instanceof Error) {
        setLocalError(caught.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="inv-panel inv-panel--card">
      <header className="inv-panel__header">
        <h2 className="inv-panel__title-en">{t('inventory.v2.issueTitle')}</h2>
        <h2 className="inv-panel__title-ar">{t('inventory.v2.issueTitleAr')}</h2>
      </header>

      {localError ? <p className="inv-error">{localError}</p> : null}

      <form className="inv-form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label className="inv-field">
          <span>{t('inventory.v2.selectItem')}</span>
          <select
            disabled={disabled || isSubmitting}
            onChange={(event) => setForm((current) => ({ ...current, itemId: event.target.value }))}
            required
            value={form.itemId}
          >
            <option value="">{t('inventory.v2.selectItem')}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code ? `${item.code} — ` : ''}
                {item.name} ({item.remainingQuantity})
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
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            required
            type="number"
            value={form.quantity}
          />
        </label>
        <label className="inv-field">
          <span>{t('inventory.v2.employee')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) => setForm((current) => ({ ...current, employee: event.target.value }))}
            required
            value={form.employee}
          />
        </label>
        <label className="inv-field inv-field--wide">
          <span>{t('inventory.v2.issueReason')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            required
            value={form.reason}
          />
        </label>
        <div className="inv-form-actions">
          <button className="inv-btn inv-btn--gold" disabled={disabled || isSubmitting} type="submit">
            {isSubmitting ? t('admin.editor.saving') : t('inventory.v2.issueButton')}
          </button>
        </div>
      </form>
    </section>
  );
}
