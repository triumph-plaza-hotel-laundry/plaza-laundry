import { useCallback, useEffect, useState } from 'react';

import {
  ensureDepartmentItemsSeeded,
  listDepartmentItems,
  subscribeDepartmentItems,
} from '@/features/inventory/department-items-service';

import {
  listDepartmentItemCategories,
  subscribeDepartmentItemCategories,
} from '@/features/inventory/department-item-categories-service';

import { diagnosePlanDropdownRows } from '@/features/inventory/department-items-catalog';

import { getErrorMessage } from '@/lib/supabase/errors';

import type {
  DepartmentItem,
  DepartmentItemCategory,
} from '@/features/inventory/department-items-types';

import type { PlanDepartmentId } from '@/features/inventory/inventory-plan-schema';

function logDepartmentItemsCatalogDiagnostics(
  items: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
) {
  if (!import.meta.env.DEV) {
    return;
  }

  const diagnostics = diagnosePlanDropdownRows(
    items,
    categories,
    undefined,
    undefined,
  );
  const totalOptions = diagnostics.reduce(
    (total, row) => total + row.availableOptionsCount,
    0,
  );
  const rowsWithoutOptions = diagnostics.filter(
    (row) => row.availableOptionsCount === 0,
  );

  console.info(
    `[department-items] catalog ready: ${items.length} department_items, ${categories.length} categories, ${totalOptions} total dropdown options`,
  );

  if (rowsWithoutOptions.length > 0) {
    console.warn(
      `[department-items] ${rowsWithoutOptions.length} plan rows have no dropdown options`,
    );

    for (const row of rowsWithoutOptions) {
      console.warn('[department-items] empty plan row diagnostic:', row);
    }
  }

  if (items.length === 0) {
    console.warn(
      '[department-items] catalog is empty — Inventory Plan dropdowns will have no variants',
    );
  }
}

export function useDepartmentItemsCatalog() {
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<DepartmentItemCategory[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const seededCount = await ensureDepartmentItemsSeeded();

      const [nextItems, nextCategories] = await Promise.all([
        listDepartmentItems(),
        listDepartmentItemCategories(),
      ]);

      setItems(nextItems);
      setCategories(nextCategories);
      setError(null);

      if (import.meta.env.DEV) {
        console.info('[department-items] useDepartmentItemsCatalog refreshed', {
          seededCount,
          departmentItems: nextItems.length,
          categories: nextCategories.length,
        });
        logDepartmentItemsCatalogDiagnostics(nextItems, nextCategories);
      }
    } catch (caught) {
      setItems([]);
      setCategories([]);
      setError(getErrorMessage(caught, 'Failed to load department items.'));

      if (import.meta.env.DEV) {
        console.error(
          '[department-items] useDepartmentItemsCatalog failed',
          caught,
        );
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const scheduleRefresh = () => {
      void refresh();
    };

    const unsubscribeItems = subscribeDepartmentItems(scheduleRefresh);
    const unsubscribeCategories =
      subscribeDepartmentItemCategories(scheduleRefresh);

    return () => {
      unsubscribeItems();
      unsubscribeCategories();
    };
  }, [refresh]);

  return { items, categories, isReady, error, refresh };
}

export function useDepartmentItems(departmentId: PlanDepartmentId | '') {
  const catalog = useDepartmentItemsCatalog();

  const items = departmentId
    ? catalog.items.filter((item) => item.departmentId === departmentId)
    : catalog.items;

  const categories = departmentId
    ? catalog.categories.filter(
        (category) => category.departmentId === departmentId,
      )
    : catalog.categories;

  return {
    ...catalog,
    items,
    categories,
  };
}
