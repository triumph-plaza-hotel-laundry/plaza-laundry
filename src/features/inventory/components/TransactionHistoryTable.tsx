import type { InventoryTransaction } from '@/features/inventory';
import { useLanguage } from '@/hooks';

type TransactionHistoryTableProps = {
  transactions: InventoryTransaction[];
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

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  const { language, t } = useLanguage();

  return (
    <section className="inv-panel">
      <header className="inv-panel__header">
        <h2 className="inv-panel__title-en">{t('inventory.v2.historyTitle')}</h2>
        <h2 className="inv-panel__title-ar">{t('inventory.v2.historyTitleAr')}</h2>
      </header>

      {transactions.length === 0 ? (
        <div className="inv-empty">
          <p>{t('inventory.v2.historyEmpty')}</p>
        </div>
      ) : (
        <div className="inv-table-wrap inv-table-wrap--erp">
          <table className="luxury-table inv-erp-table inv-erp-table--history">
            <colgroup>
              <col className="inv-erp-col inv-erp-col--type" />
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
                <th scope="col">{t('inventory.v2.transactionType')}</th>
                <th className="inv-erp-table__code" scope="col">
                  {t('inventory.table.code')}
                </th>
                <th className="inv-erp-table__name" scope="col">
                  {t('inventory.table.name')}
                </th>
                <th className="inv-erp-table__num" scope="col">
                  {t('inventory.v2.quantity')}
                </th>
                <th scope="col">{t('inventory.stockEntry.supplier')}</th>
                <th scope="col">{t('inventory.v2.receiver')}</th>
                <th scope="col">{t('inventory.v2.employee')}</th>
                <th scope="col">{t('inventory.v2.date')}</th>
                <th scope="col">{t('inventory.v2.time')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const { date, time } = formatDateTime(transaction.createdAt, language);
                return (
                  <tr key={`${transaction.type}-${transaction.id}`}>
                    <td>
                      <span className={`inv-transaction-badge inv-transaction-badge--${transaction.type}`}>
                        {transaction.type === 'receive'
                          ? t('inventory.v2.typeReceive')
                          : t('inventory.v2.typeIssue')}
                      </span>
                    </td>
                    <td className="inv-erp-table__code">{transaction.itemCode || '—'}</td>
                    <td className="inv-erp-table__name" title={transaction.itemName}>
                      {transaction.itemName}
                    </td>
                    <td className="inv-erp-table__num">{transaction.quantity}</td>
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
