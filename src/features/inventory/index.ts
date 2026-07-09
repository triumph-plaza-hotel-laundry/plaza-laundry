export type {
  InventoryItem,
  InventoryIssue,
  InventoryQuantityField,
  InventoryReceipt,
  InventoryTransaction,
  InventoryTransactionType,
  IssueItemsInput,
  ReceiveItemsInput,
  UpdateInventoryQuantityInput,
} from '@/features/inventory/types';

export {
  applyInventoryQuantityUpdate,
  calculateRemaining,
  mapInventoryItem,
  NOT_ENOUGH_STOCK_MESSAGE,
} from '@/features/inventory/types';

export {
  fetchInventoryItems,
  fetchInventorySnapshot,
  fetchInventoryTransactions,
  getCachedInventorySnapshot,
  invalidateInventoryCache,
  issueInventoryItems,
  receiveInventoryItems,
  seedOfficialInventoryItems,
  subscribeInventoryChanges,
  updateInventoryItemQuantity,
} from '@/features/inventory/service';

export type { InventorySnapshot } from '@/features/inventory/service';
