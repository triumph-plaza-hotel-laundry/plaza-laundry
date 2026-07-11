import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import { buildSeedDepartmentItems } from '@/features/inventory/department-items-seed';
import type {
  DepartmentItem,
  DepartmentItemInput,
  DepartmentItemUpdate,
} from '@/features/inventory/department-items-types';
import type { PlanDepartmentId } from '@/features/inventory/inventory-plan-schema';

type DbDepartmentItemRow = {
  id: string;
  department_id: string;
  item_key: string;
  item_name: string;
  variant_key: string;
  unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

function mapDepartmentItem(row: DbDepartmentItemRow): DepartmentItem {
  return {
    id: row.id,
    departmentId: row.department_id as PlanDepartmentId,
    itemKey: row.item_key,
    itemName: row.item_name,
    variantKey: row.variant_key,
    unit: row.unit,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS =
  'id, department_id, item_key, item_name, variant_key, unit, sort_order, created_at, updated_at';

const DEPARTMENT_ITEMS_TABLE = 'department_items';

function throwServiceError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): never {
  throw toServiceError(error, fallback);
}

function buildVariantKey(id: string) {
  return `department-item:${id}`;
}

export async function listDepartmentItems(
  departmentId?: PlanDepartmentId,
): Promise<DepartmentItem[]> {
  const client = requireClient();
  const pageSize = 1000;
  const allRows: DbDepartmentItemRow[] = [];
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('department_items')
      .select(SELECT_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (error) {
      throwServiceError(error, 'Failed to load department items.');
    }

    const rows = (data ?? []) as DbDepartmentItemRow[];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    page += 1;
  }

  if (import.meta.env.DEV) {
    console.info(
      `[department-items] listDepartmentItems loaded ${allRows.length} rows`,
      {
        departmentId: departmentId ?? 'all',
      },
    );
  }

  return allRows.map(mapDepartmentItem);
}

export async function createDepartmentItem(
  input: DepartmentItemInput,
): Promise<DepartmentItem> {
  const client = requireClient();
  const existing = await listDepartmentItems(input.departmentId);
  const sortOrder =
    existing.length > 0
      ? Math.max(...existing.map((item) => item.sortOrder)) + 1
      : 0;
  const provisionalId = crypto.randomUUID();

  const { data, error } = await client
    .from('department_items')
    .insert({
      id: provisionalId,
      department_id: input.departmentId,
      item_key: input.itemKey,
      item_name: input.itemName.trim(),
      variant_key: buildVariantKey(provisionalId),
      unit: input.unit.trim() || 'piece',
      sort_order: sortOrder,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throwServiceError(error, 'Failed to create department item.');
  }

  const item = mapDepartmentItem(data as DbDepartmentItemRow);
  emitDepartmentItemsChange();
  return item;
}

export async function updateDepartmentItem(
  id: string,
  input: DepartmentItemUpdate,
): Promise<DepartmentItem> {
  const client = requireClient();
  const { data, error } = await client
    .from('department_items')
    .update({
      item_key: input.itemKey,
      item_name: input.itemName.trim(),
      unit: input.unit.trim() || 'piece',
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throwServiceError(error, 'Failed to update department item.');
  }

  const item = mapDepartmentItem(data as DbDepartmentItemRow);
  emitDepartmentItemsChange();
  return item;
}

export async function deleteDepartmentItem(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('department_items').delete().eq('id', id);

  if (error) {
    throwServiceError(error, 'Failed to delete department item.');
  }

  emitDepartmentItemsChange();
}

export async function ensureDepartmentItemsSeeded(): Promise<number> {
  const client = requireClient();
  const { data: existingRows, error: probeError } = await client
    .from(DEPARTMENT_ITEMS_TABLE)
    .select('id')
    .limit(1);

  if (probeError) {
    if (isMissingTableError(probeError, DEPARTMENT_ITEMS_TABLE)) {
      throw new Error(
        'department_items table is missing. Run npm run setup:supabase to apply migrations and seed data.',
      );
    }

    throwServiceError(probeError, 'Failed to check department items.');
  }

  if ((existingRows ?? []).length > 0) {
    const { count, error: countError } = await client
      .from(DEPARTMENT_ITEMS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throwServiceError(countError, 'Failed to count department items.');
    }

    return count ?? existingRows.length;
  }

  const seedRows = buildSeedDepartmentItems();
  const { error: insertError } = await client
    .from(DEPARTMENT_ITEMS_TABLE)
    .insert(
      seedRows.map((row) => ({
        department_id: row.departmentId,
        item_key: row.itemKey,
        item_name: row.itemName,
        variant_key: row.variantKey,
        unit: row.unit,
        sort_order: row.sortOrder,
      })),
    );

  if (insertError) {
    throwServiceError(insertError, 'Failed to seed department items.');
  }

  emitDepartmentItemsChange();
  return seedRows.length;
}

type DepartmentItemsListener = () => void;

const departmentItemsListeners = new Set<DepartmentItemsListener>();
let departmentItemsChannel: { unsubscribe: () => Promise<unknown> } | null =
  null;

function emitDepartmentItemsChange() {
  departmentItemsListeners.forEach((listener) => listener());
}

export function notifyDepartmentItemsChange() {
  emitDepartmentItemsChange();
}

function ensureDepartmentItemsChannel() {
  if (departmentItemsChannel) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  departmentItemsChannel = client
    .channel('department-items-v1')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'department_items',
      },
      () => {
        emitDepartmentItemsChange();
      },
    )
    .subscribe();
}

export function subscribeDepartmentItems(listener: DepartmentItemsListener) {
  departmentItemsListeners.add(listener);
  ensureDepartmentItemsChannel();

  return () => {
    departmentItemsListeners.delete(listener);

    if (departmentItemsListeners.size === 0 && departmentItemsChannel) {
      void departmentItemsChannel.unsubscribe();
      departmentItemsChannel = null;
    }
  };
}
