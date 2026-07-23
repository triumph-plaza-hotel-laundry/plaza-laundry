import type {
  InventoryTransaction,
  InventoryTransactionType,
} from '@/features/inventory';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import { useMemo } from 'react';

type TransactionHistoryTableProps = {
  transactions: InventoryTransaction[];
  /** When set, shows only that transaction type with matching columns/title. */
  transactionType: InventoryTransactionType;
};

function formatDateTime(value: string, language: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
    }).format(date),
    time: new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
      timeStyle: 'short',
    }).format(date),
  };
}

export function TransactionHistoryTable({
  transactions,
  transactionType,
}: TransactionHistoryTableProps) {
  const { language, t } = useLanguage();

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.type === transactionType),
    [transactionType, transactions],
  );

  const isReceive = transactionType === 'receive';

  const titleEnKey: TranslationKey = isReceive
    ? 'inventory.v2.receivingHistoryTitle'
    : 'inventory.v2.issueHistoryTitle';
  const titleArKey: TranslationKey = isReceive
    ? 'inventory.v2.receivingHistoryTitleAr'
    : 'inventory.v2.issueHistoryTitleAr';
  const emptyKey: TranslationKey = isReceive
    ? 'inventory.v2.receivingHistoryEmpty'
    : 'inventory.v2.issueHistoryEmpty';
  const secondaryColumnKey: TranslationKey = isReceive
    ? 'inventory.stockEntry.supplier'
    : 'inventory.history.department';
  const tertiaryColumnKey: TranslationKey = isReceive
    ? 'inventory.v2.receiver'
    : 'inventory.v2.issueReason';

  return (
    <section
      aria-label={`${t(titleEnKey)} / ${t(titleArKey)}`}
      className={`inv-panel inv-panel--history inv-panel--history-${transactionType}`}
    >
      <header className="inv-panel__header">
        <h2 className="inv-panel__title-en">{t(titleEnKey)}</h2>
        <h2 className="inv-panel__title-ar">{t(titleArKey)}</h2>
      </header>

      {filteredTransactions.length === 0 ? (
        <div className="inv-empty">
          <p>{t(emptyKey)}</p>
        </div>
      ) : (
        <div className="inv-table-wrap inv-table-wrap--erp">
          <table className="luxury-table inv-erp-table inv-erp-table--history">
            <colgroup>
              <col className="inv-erp-col inv-erp-col--code" />
              <col className="inv-erp-col inv-erp-col--name" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--text" />
              <col className="inv-erp-col inv-erp-col--text" />
              <col className="inv-erp-col inv-erp-col--text" />
              <col className="inv-erp-col inv-erp-col--date" />
              <col className="inv-erp-col inv-erp-col--date" />
            </colgroup>
            <thead>
              <tr>
                <th className="inv-erp-table__code" scope="col">
                  {t('inventory.table.code')}
                </th>
                <th className="inv-erp-table__name" scope="col">
                  {t('inventory.table.name')}
                </th>
                <th className="inv-erp-table__num" scope="col">
                  {t('inventory.v2.quantity')}
                </th>
                <th scope="col">{t(secondaryColumnKey)}</th>
                <th scope="col">{t(tertiaryColumnKey)}</th>
                <th scope="col">{t('inventory.v2.employee')}</th>
                <th scope="col">{t('inventory.v2.date')}</th>
                <th scope="col">{t('inventory.v2.time')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const { date, time } = formatDateTime(
                  transaction.createdAt,
                  language,
                );
                return (
                  <tr key={`${transaction.type}-${transaction.id}`}>
                    <td className="inv-erp-table__code">
                      {transaction.itemCode || '—'}
                    </td>
                    <td
                      className="inv-erp-table__name"
                      title={transaction.itemName}
                    >
                      {transaction.itemName || '—'}
                    </td>
                    <td className="inv-erp-table__num">
                      {transaction.quantity}
                    </td>
                    <td>{transaction.supplier || '—'}</td>
                    <td>{transaction.receiver || '—'}</td>
                    <td>{transaction.employee || '—'}</td>
                    <td>{date}</td>
                    <td>{time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
