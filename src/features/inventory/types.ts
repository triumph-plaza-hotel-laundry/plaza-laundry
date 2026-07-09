export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  totalQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceipt = {
  id: string;
  itemId: string;
  supplier: string;
  receiver: string;
  employee: string;
  quantity: number;
  notes: string;
  createdAt: string;
};

export type InventoryIssue = {
  id: string;
  itemId: string;
  employee: string;
  quantity: number;
  reason: string;
  createdAt: string;
};

export type InventoryTransactionType = 'receive' | 'issue';

export type InventoryTransaction = {
  id: string;
  type: InventoryTransactionType;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  supplier: string;
  receiver: string;
  employee: string;
  createdAt: string;
};

export type ReceiveItemsInput = {
  itemId: string;
  supplier: string;
  receiver: string;
  employee: string;
  quantity: number;
  notes: string;
};

export type IssueItemsInput = {
  itemId: string;
  employee: string;
  quantity: number;
  reason: string;
};

export const NOT_ENOUGH_STOCK_MESSAGE = 'There is not enough stock available.';

export type InventoryQuantityField = 'totalQuantity' | 'issuedQuantity' | 'remainingQuantity';

export type UpdateInventoryQuantityInput = {
  itemId: string;
  field: InventoryQuantityField;
  value: number;
};

export function calculateRemaining(totalQuantity: number, issuedQuantity: number) {
  return Math.max(totalQuantity - issuedQuantity, 0);
}

export function applyInventoryQuantityUpdate(
  item: InventoryItem,
  field: InventoryQuantityField,
  value: number,
): InventoryItem {
  const quantity = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

  if (field === 'totalQuantity') {
    const totalQuantity = quantity;
    const issuedQuantity = Math.min(item.issuedQuantity, totalQuantity);
    const remainingQuantity = calculateRemaining(totalQuantity, issuedQuantity);

    return {
      ...item,
      totalQuantity,
      issuedQuantity,
      remainingQuantity,
      updatedAt: new Date().toISOString(),
    };
  }

  if (field === 'issuedQuantity') {
    const issuedQuantity = Math.min(quantity, item.totalQuantity);
    const remainingQuantity = calculateRemaining(item.totalQuantity, issuedQuantity);

    return {
      ...item,
      issuedQuantity,
      remainingQuantity,
      updatedAt: new Date().toISOString(),
    };
  }

  const remainingQuantity = quantity;
  const totalQuantity = remainingQuantity + item.issuedQuantity;

  return {
    ...item,
    totalQuantity,
    remainingQuantity,
    updatedAt: new Date().toISOString(),
  };
}

export function mapInventoryItem(row: {
  id: string;
  code: string;
  name?: string | null;
  name_ar?: string | null;
  total_quantity?: number | null;
  incoming_quantity?: number | null;
  quantity?: number | null;
  issued_quantity?: number | null;
  remaining_quantity?: number | null;
  created_at: string;
  updated_at?: string | null;
  last_updated_at?: string | null;
}): InventoryItem {
  const totalQuantity = row.total_quantity ?? row.incoming_quantity ?? row.quantity ?? 0;
  const issuedQuantity = row.issued_quantity ?? 0;
  const remainingQuantity = calculateRemaining(totalQuantity, issuedQuantity);

  return {
    id: row.id,
    code: row.code ?? '',
    name: row.name?.trim() || row.name_ar?.trim() || row.code || '—',
    totalQuantity,
    issuedQuantity,
    remainingQuantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.last_updated_at ?? row.created_at,
  };
}
