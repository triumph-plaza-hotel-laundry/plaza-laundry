import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import { notifyDepartmentItemsChange } from '@/features/inventory/department-items-service';
import { listDepartmentItemCategories } from '@/features/inventory/department-item-categories-service';
import { enumerateAllPlanRowSlots } from '@/features/inventory/inventory-plan-slots';
import type { PlanDepartmentId } from '@/features/inventory/inventory-plan-schema';

export type DepartmentInventoryAssignment = {
  id: string;
  departmentId: PlanDepartmentId;
  itemKey: string;
  inventoryItemId: string;
  inventoryCode: string;
  inventoryName: string;
  disabledAt: string | null;
  sortOrder: number;
  createdAt: string;
  variantKey: string;
};

const TABLE = 'department_inventory_assignments';
export const INVENTORY_VARIANT_PREFIX = 'inventory:';

const SELECT_COLUMNS =
  'id, department_id, item_key, inventory_item_id, sort_order, created_at';

type DbAssignmentRow = {
  id: string;
  department_id: string;
  item_key: string;
  inventory_item_id: string;
  sort_order: number;
  created_at: string;
  inventory_items: {
    id: string;
    code: string | null;
    name: string | null;
    name_ar: string | null;
    disabled_at: string | null;
    deleted_at: string | null;
  } | null;
};

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function throwServiceError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): never {
  throw toServiceError(error, fallback);
}

export function buildInventoryVariantKey(inventoryItemId: string) {
  return `${INVENTORY_VARIANT_PREFIX}${inventoryItemId}`;
}

export function parseInventoryVariantKey(itemVariant: string): string | null {
  const trimmed = itemVariant.trim();
  if (!trimmed.startsWith(INVENTORY_VARIANT_PREFIX)) {
    return null;
  }

  const id = trimmed.slice(INVENTORY_VARIANT_PREFIX.length).trim();
  return id || null;
}

function mapAssignment(
  row: DbAssignmentRow,
): DepartmentInventoryAssignment | null {
  const item = row.inventory_items;
  if (!item || item.deleted_at) {
    return null;
  }

  const name =
    item.name?.trim() || item.name_ar?.trim() || item.code?.trim() || '—';

  return {
    id: row.id,
    departmentId: row.department_id as PlanDepartmentId,
    itemKey: row.item_key,
    inventoryItemId: row.inventory_item_id,
    inventoryCode: item.code?.trim() || '',
    inventoryName: name,
    disabledAt: item.disabled_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    variantKey: buildInventoryVariantKey(row.inventory_item_id),
  };
}

export async function listDepartmentInventoryAssignments(options?: {
  includeDisabled?: boolean;
}): Promise<DepartmentInventoryAssignment[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(TABLE)
    .select(
      `${SELECT_COLUMNS}, inventory_items:inventory_item_id ( id, code, name, name_ar, disabled_at, deleted_at )`,
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error, TABLE)) {
      return [];
    }
    throwServiceError(
      error,
      'Failed to load department inventory assignments.',
    );
  }

  const includeDisabled = options?.includeDisabled ?? false;

  return ((data ?? []) as DbAssignmentRow[])
    .map(mapAssignment)
    .filter((assignment): assignment is DepartmentInventoryAssignment => {
      if (!assignment) {
        return false;
      }

      if (!includeDisabled && assignment.disabledAt) {
        return false;
      }

      return true;
    });
}

async function insertAssignmentRows(
  rows: {
    department_id: string;
    item_key: string;
    inventory_item_id: string;
    sort_order: number;
  }[],
) {
  if (rows.length === 0) {
    return;
  }

  const client = requireClient();
  const chunkSize = 500;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await client.from(TABLE).upsert(chunk, {
      onConflict: 'department_id,item_key,inventory_item_id',
      ignoreDuplicates: true,
    });

    if (error) {
      if (isMissingTableError(error, TABLE)) {
        return;
      }
      throwServiceError(
        error,
        'Failed to link inventory item to department plan rows.',
      );
    }
  }

  notifyDepartmentItemsChange();
}

export async function linkInventoryItemToAllPlanRows(
  inventoryItemId: string,
  sortOrder = 0,
): Promise<void> {
  const categories = await listDepartmentItemCategories();
  const slots = enumerateAllPlanRowSlots(categories);

  const rows = slots.map((slot) => ({
    department_id: slot.departmentId,
    item_key: slot.itemKey,
    inventory_item_id: inventoryItemId,
    sort_order: sortOrder,
  }));

  await insertAssignmentRows(rows);
}

export async function linkAllInventoryItemsToPlanRow(
  departmentId: PlanDepartmentId,
  itemKey: string,
): Promise<void> {
  const client = requireClient();
  const { data: items, error } = await client
    .from('inventory_items')
    .select('id, sort_order')
    .is('deleted_at', null);

  if (error) {
    throwServiceError(
      error,
      'Failed to load inventory items for plan linking.',
    );
  }

  const rows = (items ?? []).map((item) => ({
    department_id: departmentId,
    item_key: itemKey,
    inventory_item_id: item.id,
    sort_order: item.sort_order ?? 0,
  }));

  await insertAssignmentRows(rows);
}

type AssignmentListener = () => void;

const assignmentListeners = new Set<AssignmentListener>();
let assignmentChannel: { unsubscribe: () => Promise<unknown> } | null = null;

function emitAssignmentChange() {
  assignmentListeners.forEach((listener) => listener());
  notifyDepartmentItemsChange();
}

function ensureAssignmentChannel() {
  if (assignmentChannel) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  assignmentChannel = client
    .channel('department-inventory-assignments-v1')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      () => {
        emitAssignmentChange();
      },
    )
    .subscribe();
}

export function subscribeDepartmentInventoryAssignments(
  listener: AssignmentListener,
) {
  assignmentListeners.add(listener);
  ensureAssignmentChannel();

  return () => {
    assignmentListeners.delete(listener);

    if (assignmentListeners.size === 0 && assignmentChannel) {
      void assignmentChannel.unsubscribe();
      assignmentChannel = null;
    }
  };
}

const warehousePlanListeners = new Set<AssignmentListener>();
let warehousePlanChannel: { unsubscribe: () => Promise<unknown> } | null = null;

function emitWarehousePlanChange() {
  warehousePlanListeners.forEach((listener) => listener());
  notifyDepartmentItemsChange();
}

function ensureWarehousePlanChannel() {
  if (warehousePlanChannel) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const channel = client.channel('inventory-items-plan-catalog-v1');
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_items' },
    () => {
      emitWarehousePlanChange();
    },
  );
  channel.subscribe();
  warehousePlanChannel = channel;
}

export function subscribeWarehouseInventoryForPlans(
  listener: AssignmentListener,
) {
  warehousePlanListeners.add(listener);
  ensureWarehousePlanChannel();

  return () => {
    warehousePlanListeners.delete(listener);

    if (warehousePlanListeners.size === 0 && warehousePlanChannel) {
      void warehousePlanChannel.unsubscribe();
      warehousePlanChannel = null;
    }
  };
}
