import { AnimatePresence } from 'framer-motion';
import type { InventorySnapshot } from '@/features/inventory';
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
  editableQuantities?: boolean;
  readOnly?: boolean;
  snapshotOverride?: InventorySnapshot | null;
};

export function InventoryManagementPage({
  showHeader = true,
  editableQuantities = false,
  readOnly = false,
  snapshotOverride = null,
}: InventoryManagementPageProps) {
  const { t } = useLanguage();
  const live = useInventoryManagement();
  const items = snapshotOverride?.items ?? live.items;
  const transactions = snapshotOverride?.transactions ?? live.transactions;
  const isReady = snapshotOverride ? true : live.isReady;
  const isBusy = readOnly ? true : live.isBusy;
  const error = live.error;
  const toast = readOnly ? null : live.toast;
  const receiveItems = live.receiveItems;
  const issueItems = live.issueItems;
  const updateItemQuantity = live.updateItemQuantity;

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
          <InventoryItemsTable
            editable={editableQuantities && !readOnly}
            items={items}
            onQuantityChange={updateItemQuantity}
          />

          {readOnly ? null : (
            <div className="inv-management-page__forms">
              <ReceiveItemsCard disabled={isBusy} items={items} onSubmit={receiveItems} />
              <IssueItemsCard disabled={isBusy} items={items} onSubmit={issueItems} />
            </div>
          )}

          <TransactionHistoryTable transactions={transactions} />
        </>
      )}

      <AnimatePresence>{toast ? <InventoryToast toast={toast} /> : null}</AnimatePresence>
    </section>
  );
}
