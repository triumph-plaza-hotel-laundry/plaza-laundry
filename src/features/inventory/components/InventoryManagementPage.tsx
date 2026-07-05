import { AnimatePresence } from 'framer-motion';
import { InventoryTableSkeleton, InventoryToast } from '@/features/inventory/components/InventoryFeedback';
import { InventoryItemsTable } from '@/features/inventory/components/InventoryItemsTable';
import { IssueItemsCard } from '@/features/inventory/components/IssueItemsCard';
import { ReceiveItemsCard } from '@/features/inventory/components/ReceiveItemsCard';
import { TransactionHistoryTable } from '@/features/inventory/components/TransactionHistoryTable';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { useLanguage } from '@/hooks';
import '@/features/inventory/inventory-management.css';

type InventoryManagementPageProps = {
  showHeader?: boolean;
};

export function InventoryManagementPage({ showHeader = true }: InventoryManagementPageProps) {
  const { t } = useLanguage();
  const { items, transactions, isReady, isBusy, error, toast, receiveItems, issueItems } =
    useInventoryManagement();

  return (
    <section aria-label={t('inventory.contentRegion')} className="inv-management-page mx-auto">
      <div aria-hidden="true" className="inv-management-page__marble" />

      {showHeader ? (
        <header className="inv-management-page__header">
          <div className="inv-management-page__title-block">
            <span aria-hidden="true" className="inv-management-page__emoji">
              ✦
            </span>
            <h1 className="inv-management-page__title-en">{t('inventory.title')}</h1>
            <h1 className="inv-management-page__title-ar">{t('inventory.titleAr')}</h1>
            <p className="inv-management-page__subtitle-en">{t('inventory.subtitle')}</p>
            <p className="inv-management-page__subtitle-ar">{t('inventory.subtitleAr')}</p>
          </div>
        </header>
      ) : null}

      {error ? <p className="inv-error">{error}</p> : null}

      {!isReady ? (
        <InventoryTableSkeleton />
      ) : (
        <>
          <InventoryItemsTable items={items} />

          <div className="inv-management-page__forms">
            <ReceiveItemsCard disabled={isBusy} items={items} onSubmit={receiveItems} />
            <IssueItemsCard disabled={isBusy} items={items} onSubmit={issueItems} />
          </div>

          <TransactionHistoryTable transactions={transactions} />
        </>
      )}

      <AnimatePresence>{toast ? <InventoryToast toast={toast} /> : null}</AnimatePresence>
    </section>
  );
}
