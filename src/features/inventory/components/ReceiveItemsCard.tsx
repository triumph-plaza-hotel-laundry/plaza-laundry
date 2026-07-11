import { useState, type FormEvent } from 'react';
import type { InventoryItem } from '@/features/inventory';
import { useLanguage } from '@/hooks';

type ReceiveItemsCardProps = {
  disabled: boolean;
  items: InventoryItem[];
  onSubmit: (input: {
    itemId: string;
    supplier: string;
    receiver: string;
    employee: string;
    quantity: number;
    notes: string;
  }) => Promise<void>;
};

const emptyForm = {
  itemId: '',
  supplier: '',
  receiver: '',
  employee: '',
  quantity: '',
  notes: '',
};

export function ReceiveItemsCard({
  disabled,
  items,
  onSubmit,
}: ReceiveItemsCardProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        itemId: form.itemId,
        supplier: form.supplier,
        receiver: form.receiver,
        employee: form.employee,
        quantity: Number(form.quantity),
        notes: form.notes,
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
          {t('inventory.v2.receiveTitle')}
        </h2>
        <h2 className="inv-panel__title-ar">
          {t('inventory.v2.receiveTitleAr')}
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
          <span>{t('inventory.v2.receiver')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                receiver: event.target.value,
              }))
            }
            required
            value={form.receiver}
          />
        </label>
        <label className="inv-field">
          <span>{t('inventory.v2.employee')}</span>
          <input
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                employee: event.target.value,
              }))
            }
            required
            value={form.employee}
          />
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
        <label className="inv-field inv-field--wide">
          <span>{t('inventory.v2.notes')}</span>
          <textarea
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={3}
            value={form.notes}
          />
        </label>
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
