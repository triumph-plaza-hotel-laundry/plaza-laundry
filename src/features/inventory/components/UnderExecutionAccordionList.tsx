import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { UnderExecutionRecord } from '@/features/inventory/under-execution-types';
import { useLanguage } from '@/hooks';

type UnderExecutionAccordionListProps = {
  disabled: boolean;
  records: UnderExecutionRecord[];
  onEdit: (record: UnderExecutionRecord) => void;
  onDelete: (record: UnderExecutionRecord) => void;
};

function UnderExecutionAccordionRow({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`org-accordion__section${isOpen ? ' org-accordion__section--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="org-accordion__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="org-accordion__chevron"
          strokeWidth={1.75}
        />
        <span className="org-accordion__trigger-text">
          <span className="org-accordion__trigger-ar">{title}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="org-accordion__panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="org-accordion__panel-inner">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function UnderExecutionAccordionList({
  disabled,
  records,
  onEdit,
  onDelete,
}: UnderExecutionAccordionListProps) {
  const { t } = useLanguage();

  return (
    <section className="inv-panel">
      <header className="inv-panel__header">
        <h2 className="inv-panel__title-en">
          {t('inventory.underExecution.listTitle')}
        </h2>
        <h2 className="inv-panel__title-ar">
          {t('inventory.underExecution.listTitleAr')}
        </h2>
      </header>

      {records.length === 0 ? (
        <div className="inv-empty">
          <p>{t('inventory.underExecution.listEmpty')}</p>
        </div>
      ) : (
        <div className="admin-inventory-plan__accordion-list">
          {records.map((record) => (
            <UnderExecutionAccordionRow
              key={record.id}
              title={record.itemName}
            >
              <dl className="admin-under-execution__details">
                <div>
                  <dt>{t('inventory.table.code')}</dt>
                  <dd>{record.itemCode || '—'}</dd>
                </div>
                <div>
                  <dt>{t('inventory.stockEntry.supplier')}</dt>
                  <dd>{record.supplier}</dd>
                </div>
                <div>
                  <dt>{t('inventory.underExecution.supplierName')}</dt>
                  <dd>{record.supplierName}</dd>
                </div>
                <div>
                  <dt>{t('inventory.v2.quantity')}</dt>
                  <dd>{record.quantity}</dd>
                </div>
                <div>
                  <dt>{t('inventory.v2.date')}</dt>
                  <dd>{record.date}</dd>
                </div>
              </dl>

              <div className="admin-under-execution__actions">
                <button
                  className="admin-editor-btn admin-editor-btn--primary"
                  disabled={disabled}
                  onClick={() => onEdit(record)}
                  type="button"
                >
                  {t('admin.editor.edit')}
                </button>
                <button
                  className="admin-editor-btn admin-editor-btn--danger"
                  disabled={disabled}
                  onClick={() => onDelete(record)}
                  type="button"
                >
                  {t('admin.editor.delete')}
                </button>
              </div>
            </UnderExecutionAccordionRow>
          ))}
        </div>
      )}
    </section>
  );
}
