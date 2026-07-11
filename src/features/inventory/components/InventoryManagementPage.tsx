import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  getInventoryItemReferenceCounts,
  INVENTORY_ITEM_HAS_REFERENCES_MESSAGE,
} from '@/features/inventory';
import type { InventoryItem, InventorySnapshot } from '@/features/inventory';
import { AddInventoryItemDialog } from '@/features/inventory/components/AddInventoryItemDialog';
import {
  ConfirmInventoryItemDialog,
  type InventoryItemConfirmAction,
} from '@/features/inventory/components/ConfirmInventoryItemDialog';
import { EditInventoryItemDialog } from '@/features/inventory/components/EditInventoryItemDialog';
import {
  InventoryTableSkeleton,
  InventoryToast,
} from '@/features/inventory/components/InventoryFeedback';
import { InventoryItemsTable } from '@/features/inventory/components/InventoryItemsTable';
import { IssueItemsCard } from '@/features/inventory/components/IssueItemsCard';
import { ReceiveItemsCard } from '@/features/inventory/components/ReceiveItemsCard';
import { TransactionHistoryTable } from '@/features/inventory/components/TransactionHistoryTable';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import { useLanguage } from '@/hooks';
import '@/features/inventory/inventory-management.css';

type InventoryManagementPageProps = {
  showHeader?: boolean;
  editableQuantities?: boolean;
  readOnly?: boolean;
  showAddItem?: boolean;
  managedItems?: boolean;
  snapshotOverride?: InventorySnapshot | null;
};

export function InventoryManagementPage({
  showHeader = true,
  editableQuantities = false,
  readOnly = false,
  showAddItem = false,
  managedItems = false,
  snapshotOverride = null,
}: InventoryManagementPageProps) {
  const { t } = useLanguage();
  const permissions = useInventoryPermissions();
  const live = useInventoryManagement({
    itemsScope: managedItems ? 'managed' : 'active',
  });
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [confirmState, setConfirmState] = useState<{
    action: InventoryItemConfirmAction;
    item: InventoryItem;
    blockedMessage?: string | null;
  } | null>(null);

  const items = snapshotOverride?.items ?? live.items;
  const selectorItems = snapshotOverride?.items ?? live.activeItems;
  const transactions = snapshotOverride?.transactions ?? live.transactions;
  const isReady = snapshotOverride ? true : live.isReady;
  const isBusy = readOnly ? true : live.isBusy;
  const error = live.error;
  const toast = readOnly ? null : live.toast;
  const receiveItems = live.receiveItems;
  const issueItems = live.issueItems;
  const updateItemQuantity = live.updateItemQuantity;
  const createItem = live.createItem;
  const updateItem = live.updateItem;
  const setItemEnabled = live.setItemEnabled;
  const deleteItemPermanently = live.deleteItemPermanently;

  const canManageItems = showAddItem && !readOnly && !snapshotOverride;
  const canAddItem = canManageItems && permissions.canAdd;
  const canShowRowActions = canManageItems;

  const handleEditItem = useCallback((item: InventoryItem) => {
    setEditItem(item);
  }, []);

  const handleToggleItemEnabled = useCallback((item: InventoryItem) => {
    setConfirmState({
      action: item.disabledAt ? 'enable' : 'disable',
      item,
    });
  }, []);

  const handleDeleteItem = useCallback(async (item: InventoryItem) => {
    try {
      const references = await getInventoryItemReferenceCounts(item.id);
      setConfirmState({
        action: 'delete',
        item,
        blockedMessage:
          references.total > 0 ? INVENTORY_ITEM_HAS_REFERENCES_MESSAGE : null,
      });
    } catch {
      setConfirmState({
        action: 'delete',
        item,
      });
    }
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmState) {
      return;
    }

    if (confirmState.action === 'delete') {
      if (confirmState.blockedMessage) {
        setConfirmState(null);
        return;
      }
      await deleteItemPermanently(confirmState.item.id);
    } else if (confirmState.action === 'disable') {
      await setItemEnabled(confirmState.item.id, false);
    } else {
      await setItemEnabled(confirmState.item.id, true);
    }

    setConfirmState(null);
  }, [confirmState, deleteItemPermanently, setItemEnabled]);

  return (
    <section
      aria-label={t('inventory.contentRegion')}
      className="inv-management-page mx-auto"
    >
      <div aria-hidden="true" className="inv-management-page__marble" />

      {showHeader ? (
        <header className="inv-management-page__header">
          <div className="inv-management-page__title-block">
            <span aria-hidden="true" className="inv-management-page__emoji">
              ✦
            </span>
            <h1 className="inv-management-page__title-en">
              {t('inventory.title')}
            </h1>
            <h1 className="inv-management-page__title-ar">
              {t('inventory.titleAr')}
            </h1>
            <p className="inv-management-page__subtitle-en">
              {t('inventory.subtitle')}
            </p>
            <p className="inv-management-page__subtitle-ar">
              {t('inventory.subtitleAr')}
            </p>
          </div>
        </header>
      ) : null}

      {error ? (
        <p className="inv-error" role="alert">
          {error}
        </p>
      ) : null}

      {!isReady ? (
        <InventoryTableSkeleton />
      ) : (
        <>
          <InventoryItemsTable
            canDelete={permissions.canDelete}
            canEdit={permissions.canEdit}
            canEnableDisable={permissions.canEnableDisable}
            editable={editableQuantities && !readOnly}
            items={items}
            onDeleteItem={handleDeleteItem}
            onEditItem={handleEditItem}
            onQuantityChange={updateItemQuantity}
            onToggleItemEnabled={handleToggleItemEnabled}
            showActions={canShowRowActions}
            toolbarAction={
              canAddItem ? (
                <button
                  className="admin-editor-btn admin-editor-btn--primary"
                  onClick={() => setAddItemOpen(true)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
                  <span>{t('inventory.actions.create')}</span>
                </button>
              ) : null
            }
          />

          {canAddItem ? (
            <AddInventoryItemDialog
              isOpen={addItemOpen}
              isSaving={isBusy}
              onClose={() => setAddItemOpen(false)}
              onSave={createItem}
            />
          ) : null}

          {canShowRowActions ? (
            <>
              <EditInventoryItemDialog
                isOpen={Boolean(editItem)}
                isSaving={isBusy}
                item={editItem}
                onClose={() => setEditItem(null)}
                onSave={updateItem}
              />
              <ConfirmInventoryItemDialog
                action={confirmState?.action ?? null}
                blockedMessage={confirmState?.blockedMessage}
                isOpen={Boolean(confirmState)}
                isSaving={isBusy}
                item={confirmState?.item ?? null}
                onClose={() => setConfirmState(null)}
                onConfirm={handleConfirmAction}
              />
            </>
          ) : null}

          {readOnly ? null : (
            <div className="inv-management-page__forms">
              <ReceiveItemsCard
                disabled={isBusy}
                items={selectorItems}
                onSubmit={receiveItems}
              />
              <IssueItemsCard
                disabled={isBusy}
                items={selectorItems}
                onSubmit={issueItems}
              />
            </div>
          )}

          <TransactionHistoryTable transactions={transactions} />
        </>
      )}

      <AnimatePresence>
        {toast ? <InventoryToast toast={toast} /> : null}
      </AnimatePresence>
    </section>
  );
}
