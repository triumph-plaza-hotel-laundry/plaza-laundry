export type {
  InventoryItem,
  InventoryIssue,
  InventoryReceipt,
  InventoryTransaction,
  InventoryTransactionType,
  IssueItemsInput,
  ReceiveItemsInput,
} from '@/features/inventory/types';

export {
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
} from '@/features/inventory/service';

export type { InventorySnapshot } from '@/features/inventory/service';
