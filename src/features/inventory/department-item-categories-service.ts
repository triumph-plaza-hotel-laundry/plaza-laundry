import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import { notifyDepartmentItemsChange } from '@/features/inventory/department-items-service';
import type { DepartmentItemCategory } from '@/features/inventory/department-items-types';
import {
  PLAN_DEPARTMENT_ITEMS,
  type PlanDepartmentId,
} from '@/features/inventory/inventory-plan-schema';

type DbCategoryRow = {
  id: string;
  department_id: string;
  item_key: string;
  category_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const TABLE = 'department_item_categories';
const SELECT_COLUMNS =
  'id, department_id, item_key, category_name, sort_order, created_at, updated_at';

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

function mapCategory(row: DbCategoryRow): DepartmentItemCategory {
  return {
    id: row.id,
    departmentId: row.department_id as PlanDepartmentId,
    itemKey: row.item_key,
    categoryName: row.category_name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isCustomCategoryKey(itemKey: string) {
  return itemKey.startsWith('cat-');
}

export function isBuiltinCategoryKey(
  departmentId: PlanDepartmentId,
  itemKey: string,
) {
  return PLAN_DEPARTMENT_ITEMS[departmentId].includes(itemKey as never);
}

export async function listDepartmentItemCategories(
  departmentId?: PlanDepartmentId,
): Promise<DepartmentItemCategory[]> {
  const client = requireClient();
  let query = client
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, TABLE)) {
      return [];
    }
    throwServiceError(error, 'Failed to load department item categories.');
  }

  return ((data ?? []) as DbCategoryRow[]).map(mapCategory);
}

export async function createDepartmentItemCategory(
  departmentId: PlanDepartmentId,
  categoryName: string,
): Promise<DepartmentItemCategory> {
  const client = requireClient();
  const existing = await listDepartmentItemCategories(departmentId);
  const sortOrder =
    existing.length > 0
      ? Math.max(...existing.map((category) => category.sortOrder)) + 1
      : 0;
  const itemKey = `cat-${crypto.randomUUID()}`;

  const { data, error } = await client
    .from(TABLE)
    .insert({
      department_id: departmentId,
      item_key: itemKey,
      category_name: categoryName.trim(),
      sort_order: sortOrder,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throwServiceError(error, 'Failed to create item category.');
  }

  const category = mapCategory(data as DbCategoryRow);
  emitDepartmentItemCategoriesChange();
  return category;
}

export async function renameDepartmentItemCategory(
  departmentId: PlanDepartmentId,
  itemKey: string,
  categoryName: string,
): Promise<DepartmentItemCategory> {
  const client = requireClient();
  const trimmed = categoryName.trim();
  const existing = (await listDepartmentItemCategories(departmentId)).find(
    (category) => category.itemKey === itemKey,
  );

  if (existing) {
    const { data, error } = await client
      .from(TABLE)
      .update({ category_name: trimmed })
      .eq('id', existing.id)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throwServiceError(error, 'Failed to rename item category.');
    }

    const category = mapCategory(data as DbCategoryRow);
    emitDepartmentItemCategoriesChange();
    return category;
  }

  const { data, error } = await client
    .from(TABLE)
    .insert({
      department_id: departmentId,
      item_key: itemKey,
      category_name: trimmed,
      sort_order: 0,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throwServiceError(error, 'Failed to rename item category.');
  }

  const category = mapCategory(data as DbCategoryRow);
  emitDepartmentItemCategoriesChange();
  return category;
}

export async function deleteDepartmentItemCategory(
  departmentId: PlanDepartmentId,
  itemKey: string,
): Promise<void> {
  const client = requireClient();

  const { error: variantError } = await client
    .from('department_items')
    .delete()
    .eq('department_id', departmentId)
    .eq('item_key', itemKey);

  if (variantError) {
    throwServiceError(variantError, 'Failed to delete category variants.');
  }

  if (isCustomCategoryKey(itemKey)) {
    const { error: categoryError } = await client
      .from(TABLE)
      .delete()
      .eq('department_id', departmentId)
      .eq('item_key', itemKey);

    if (categoryError && !isMissingTableError(categoryError, TABLE)) {
      throwServiceError(categoryError, 'Failed to delete item category.');
    }
  }

  emitDepartmentItemCategoriesChange();
  notifyDepartmentItemsChange();
}

type CategoryListener = () => void;

const categoryListeners = new Set<CategoryListener>();
let categoryChannel: { unsubscribe: () => Promise<unknown> } | null = null;

function emitDepartmentItemCategoriesChange() {
  categoryListeners.forEach((listener) => listener());
}
function ensureCategoryChannel() {
  if (categoryChannel) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  categoryChannel = client
    .channel('department-item-categories-v1')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      () => emitDepartmentItemCategoriesChange(),
    )
    .subscribe();
}

export function subscribeDepartmentItemCategories(listener: CategoryListener) {
  categoryListeners.add(listener);
  ensureCategoryChannel();

  return () => {
    categoryListeners.delete(listener);
    if (categoryListeners.size === 0 && categoryChannel) {
      void categoryChannel.unsubscribe();
      categoryChannel = null;
    }
  };
}
