import type { UnderExecutionRecord } from '@/features/inventory/under-execution-types';
import { useLanguage } from '@/hooks';

type UnderExecutionHistoryTableProps = {
  disabled?: boolean;
  records: UnderExecutionRecord[];
  onClearHistory?: () => void;
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

export function UnderExecutionHistoryTable({
  disabled = false,
  records,
  onClearHistory,
}: UnderExecutionHistoryTableProps) {
  const { language, t } = useLanguage();

  return (
    <section className="inv-panel">
      <header className="inv-panel__header admin-under-execution__history-header">
        <div className="admin-under-execution__history-titles">
          <h2 className="inv-panel__title-en">
            {t('inventory.underExecution.historyTitle')}
          </h2>
          <h2 className="inv-panel__title-ar">
            {t('inventory.underExecution.historyTitleAr')}
          </h2>
        </div>
        {onClearHistory ? (
          <button
            className="admin-editor-btn admin-editor-btn--danger"
            disabled={disabled || records.length === 0}
            onClick={onClearHistory}
            type="button"
          >
            {t('inventory.underExecution.clearHistory')}
          </button>
        ) : null}
      </header>

      {records.length === 0 ? (
        <div className="inv-empty">
          <p>{t('inventory.underExecution.historyEmpty')}</p>
        </div>
      ) : (
        <div className="inv-table-wrap inv-table-wrap--erp">
          <table className="luxury-table inv-erp-table inv-erp-table--history">
            <colgroup>
              <col className="inv-erp-col inv-erp-col--code" />
              <col className="inv-erp-col inv-erp-col--name" />
              <col className="inv-erp-col inv-erp-col--text" />
              <col className="inv-erp-col inv-erp-col--text" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--date" />
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
                <th scope="col">{t('inventory.stockEntry.supplier')}</th>
                <th scope="col">{t('inventory.underExecution.supplierName')}</th>
                <th className="inv-erp-table__num" scope="col">
                  {t('inventory.v2.quantity')}
                </th>
                <th scope="col">{t('inventory.v2.date')}</th>
                <th scope="col">{t('inventory.underExecution.recordedDate')}</th>
                <th scope="col">{t('inventory.v2.time')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const { date, time } = formatDateTime(
                  record.createdAt,
                  language,
                );
                return (
                  <tr key={record.id}>
                    <td className="inv-erp-table__code">
                      {record.itemCode || '—'}
                    </td>
                    <td
                      className="inv-erp-table__name"
                      title={record.itemName}
                    >
                      {record.itemName || '—'}
                    </td>
                    <td>{record.supplier}</td>
                    <td>{record.department || '—'}</td>
                    <td className="inv-erp-table__num">{record.quantity}</td>
                    <td>{record.date}</td>
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
