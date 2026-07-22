import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { displayAssetItemName } from '@/features/hotel-employee-assets/display-labels';
import type { AssetReceipt } from '@/features/hotel-employee-assets/types';
import type { TranslationKey } from '@/types/language';

type ReceiptHistorySectionProps = {
  receipts: AssetReceipt[];
  language: string;
  t: (key: TranslationKey) => string;
  canManage?: boolean;
  isSaving?: boolean;
  onEdit?: (receipt: AssetReceipt) => void;
  onDelete?: (receipt: AssetReceipt) => void;
};

export function ReceiptHistorySection({
  receipts,
  language,
  t,
  canManage = false,
  isSaving = false,
  onEdit,
  onDelete,
}: ReceiptHistorySectionProps) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...receipts]
      .filter((receipt) => {
        if (dateFrom && receipt.receiptDate < dateFrom) {
          return false;
        }
        if (dateTo && receipt.receiptDate > dateTo) {
          return false;
        }
        if (!query) {
          return true;
        }

        const dateLabel = formatReceiptDate(receipt.receiptDate, language)
          .toLowerCase();
        const notes = (receipt.notes ?? '').toLowerCase();
        const itemsMatch = receipt.items.some((item) => {
          const arName = displayAssetItemName(item.itemName, 'ar').toLowerCase();
          const enName = displayAssetItemName(item.itemName, 'en').toLowerCase();
          const qty = String(item.quantity);
          return (
            arName.includes(query) ||
            enName.includes(query) ||
            item.itemName.toLowerCase().includes(query) ||
            qty.includes(query)
          );
        });

        return dateLabel.includes(query) || notes.includes(query) || itemsMatch;
      })
      .sort((a, b) => {
        if (a.receiptDate !== b.receiptDate) {
          return a.receiptDate < b.receiptDate ? 1 : -1;
        }
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [dateFrom, dateTo, language, receipts, search]);

  useEffect(() => {
    if (
      openReceiptId &&
      !filteredReceipts.some((receipt) => receipt.id === openReceiptId)
    ) {
      setOpenReceiptId(null);
    }
  }, [filteredReceipts, openReceiptId]);

  const toggleReceipt = (receiptId: string) => {
    setOpenReceiptId((current) => (current === receiptId ? null : receiptId));
  };

  return (
    <div className="hotel-assets__history">
      <h3 className="hotel-assets__panel-title">{t('hotelAssets.receiptHistory')}</h3>

      {receipts.length === 0 ? (
        <p className="hotel-assets__empty">
          <span aria-hidden="true" className="hotel-assets__empty-icon">
            📦
          </span>
          {t('hotelAssets.noReceipts')}
        </p>
      ) : (
        <>
          <div className="hotel-assets__history-toolbar">
            <label className="hotel-assets__history-search">
              <span className="sr-only">{t('hotelAssets.searchReceipts')}</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('hotelAssets.searchReceiptsPlaceholder')}
                type="search"
                value={search}
              />
            </label>

            <div className="hotel-assets__history-dates">
              <label className="hotel-assets__history-date">
                <span>{t('hotelAssets.filterDateFrom')}</span>
                <input
                  onChange={(event) => setDateFrom(event.target.value)}
                  type="date"
                  value={dateFrom}
                />
              </label>
              <label className="hotel-assets__history-date">
                <span>{t('hotelAssets.filterDateTo')}</span>
                <input
                  onChange={(event) => setDateTo(event.target.value)}
                  type="date"
                  value={dateTo}
                />
              </label>
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <p className="hotel-assets__empty hotel-assets__empty--compact">
              {t('hotelAssets.noReceiptMatches')}
            </p>
          ) : (
            <div className="hotel-assets__history-scroll">
              <div className="hotel-assets__receipt-accordion">
                {filteredReceipts.map((receipt) => {
                  const isOpen = openReceiptId === receipt.id;
                  const itemCount = receipt.items.length;

                  return (
                    <article
                      className={
                        isOpen
                          ? 'hotel-assets__receipt is-open'
                          : 'hotel-assets__receipt'
                      }
                      key={receipt.id}
                    >
                      <button
                        aria-expanded={isOpen}
                        className="hotel-assets__receipt-trigger"
                        onClick={() => toggleReceipt(receipt.id)}
                        type="button"
                      >
                        <span className="hotel-assets__receipt-date">
                          <span aria-hidden="true">📅</span>
                          {formatReceiptDate(receipt.receiptDate, language)}
                        </span>
                        <span
                          className="hotel-assets__receipt-badge"
                          title={t('hotelAssets.receiptItemsCount').replace(
                            '{count}',
                            String(itemCount),
                          )}
                        >
                          <span aria-hidden="true">📦</span>
                          <span className="hotel-assets__receipt-badge-count">
                            {itemCount}
                          </span>
                          <span className="sr-only">
                            {t('hotelAssets.receiptItemsCount').replace(
                              '{count}',
                              String(itemCount),
                            )}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="hotel-assets__chevron"
                          size={14}
                          strokeWidth={1.75}
                        />
                      </button>

                      <div
                        aria-hidden={!isOpen}
                        className="hotel-assets__receipt-panel"
                      >
                        <div className="hotel-assets__receipt-divider" />
                        <ul className="hotel-assets__receipt-items">
                          {receipt.items.map((item) => (
                            <li key={item.id}>
                              {displayAssetItemName(item.itemName, language)}{' '}
                              ×{item.quantity}
                            </li>
                          ))}
                        </ul>

                        {receipt.notes ? (
                          <p className="hotel-assets__receipt-notes">
                            {receipt.notes}
                          </p>
                        ) : null}

                        {canManage && onEdit && onDelete ? (
                          <div className="hotel-assets__receipt-actions">
                            <button
                              className="hotel-assets__btn hotel-assets__btn--ghost"
                              onClick={() => onEdit(receipt)}
                              tabIndex={isOpen ? 0 : -1}
                              type="button"
                            >
                              {t('hotelAssets.editReceipt')}
                            </button>
                            <button
                              className="hotel-assets__btn hotel-assets__btn--danger"
                              disabled={isSaving}
                              onClick={() => onDelete(receipt)}
                              tabIndex={isOpen ? 0 : -1}
                              type="button"
                            >
                              {t('hotelAssets.deleteReceipt')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatReceiptDate(value: string, language: string) {
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}
