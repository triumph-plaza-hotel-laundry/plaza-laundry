export type {
  InventoryItem,
  InventoryIssue,
  InventoryQuantityField,
  InventoryReceipt,
  InventoryTransaction,
  InventoryTransactionType,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  IssueItemsInput,
  ReceiveItemsInput,
  UpdateInventoryQuantityInput,
} from '@/features/inventory/types';

export {
  applyInventoryQuantityUpdate,
  calculateRemaining,
  DUPLICATE_INVENTORY_CODE_MESSAGE,
  INVENTORY_ITEM_DISABLED_MESSAGE,
  INVENTORY_ITEM_HAS_REFERENCES_MESSAGE,
  mapInventoryItem,
  NOT_ENOUGH_STOCK_MESSAGE,
} from '@/features/inventory/types';

export {
  createInventoryItem,
  fetchInventoryItems,
  fetchInventorySnapshot,
  fetchInventoryTransactions,
  getCachedInventorySnapshot,
  getInventoryItemReferenceCounts,
  invalidateInventoryCache,
  issueInventoryItems,
  permanentlyDeleteInventoryItem,
  receiveInventoryItems,
  seedOfficialInventoryItems,
  setInventoryItemEnabled,
  subscribeInventoryChanges,
  updateInventoryItem,
  updateInventoryItemQuantity,
} from '@/features/inventory/service';

export type {
  InventoryItemReferenceCounts,
  InventoryItemsScope,
  InventorySnapshot,
} from '@/features/inventory/service';

export {
  allInventoryPermissions,
  grantInventoryPermissions,
  INVENTORY_PERMISSION_DENIED,
  INVENTORY_DELETE_SOLE_HOLDER,
  listInventoryPermissions,
  revokeInventoryPermissions,
  setInventoryPermissions,
  subscribeInventoryPermissionChanges,
  type InventoryPermission,
} from '@/features/inventory/inventory-permissions-service';
