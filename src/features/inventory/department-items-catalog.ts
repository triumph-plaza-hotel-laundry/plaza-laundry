import type {
  DepartmentItem,
  DepartmentItemCategory,
  DropdownOption,
} from '@/features/inventory/department-items-types';

import {
  getDepartmentItemVariants,
  ITEM_LABEL_KEYS,
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_ITEMS,
  PLAN_ITEM_BLANK_OPTION_LABEL,
  buildDepartmentRows,
  type PlanDepartmentId,
  type PlanItemKey,
} from '@/features/inventory/inventory-plan-schema';

import { isCustomCategoryKey } from '@/features/inventory/department-item-categories-service';
import type { TranslationKey } from '@/types/language';

export type PlanDropdownRowDiagnostic = {
  rowId: string;
  departmentId: PlanDepartmentId;
  itemKey: string;
  categoryKey: string;
  categoryName: string | null;
  selectedValue: string;
  availableOptionsCount: number;
  departmentItemCount: number;
  isCustomCategory: boolean;
  matchingVariantKeys: string[];
  matchingDepartmentItemNames: string[];
  reason: string | null;
};

export function getCustomCategoriesForDepartment(
  categories: readonly DepartmentItemCategory[],
  departmentId: PlanDepartmentId,
  catalog: readonly DepartmentItem[] = [],
  rowDrafts?: Record<string, { itemVariant?: string }>,
) {
  const builtInKeys = new Set<string>(PLAN_DEPARTMENT_ITEMS[departmentId]);

  return categories.filter((category) => {
    if (category.departmentId !== departmentId) {
      return false;
    }

    const isCustom =
      isCustomCategoryKey(category.itemKey) ||
      !builtInKeys.has(category.itemKey);

    if (!isCustom) {
      return false;
    }

    const rowId = `${departmentId}-${category.itemKey}`;
    const hasSavedValue = Boolean(rowDrafts?.[rowId]?.itemVariant?.trim());
    const hasVariants = catalog.some(
      (item) =>
        item.departmentId === departmentId &&
        item.itemKey.trim() === category.itemKey.trim(),
    );

    return hasVariants || hasSavedValue;
  });
}

export function resolveCategoryLabel(
  itemKey: string,
  departmentId: PlanDepartmentId,
  categories: readonly DepartmentItemCategory[],
  t: (key: TranslationKey) => string,
): string {
  const override = categories.find(
    (category) =>
      category.departmentId === departmentId && category.itemKey === itemKey,
  );
  if (override) {
    return override.categoryName;
  }

  if (itemKey && itemKey in ITEM_LABEL_KEYS) {
    return t(ITEM_LABEL_KEYS[itemKey as PlanItemKey]);
  }

  return itemKey || '—';
}

function getMatchingDepartmentItems(
  catalog: readonly DepartmentItem[],
  departmentId: PlanDepartmentId,
  itemKey: string,
) {
  const normalizedItemKey = itemKey.trim();

  return catalog.filter(
    (item) =>
      item.departmentId === departmentId &&
      item.itemKey.trim() === normalizedItemKey,
  );
}

function buildDepartmentOptionsForRow(
  catalog: readonly DepartmentItem[],
  departmentId: PlanDepartmentId,
  itemKey: string,
): DropdownOption[] {
  return getMatchingDepartmentItems(catalog, departmentId, itemKey)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt.localeCompare(right.createdAt),
    )
    .map((item) => ({
      value: item.variantKey,
      label: item.itemName,
    }));
}

function resolveAvailableOptionsCount(
  catalog: readonly DepartmentItem[],
  departmentId: PlanDepartmentId,
  itemKey: string,
  t?: (key: TranslationKey) => string,
) {
  if (t) {
    return getCatalogOptionsForRow(catalog, departmentId, itemKey, t).length;
  }

  const departmentOptions = buildDepartmentOptionsForRow(
    catalog,
    departmentId,
    itemKey,
  );
  if (departmentOptions.length > 0) {
    return departmentOptions.length;
  }

  if (!(itemKey in ITEM_LABEL_KEYS)) {
    return 0;
  }

  return getDepartmentItemVariants(departmentId, itemKey as PlanItemKey).length;
}

function explainEmptyPlanRow(
  departmentId: PlanDepartmentId,
  itemKey: string,
  matchingItems: readonly DepartmentItem[],
  isCustomCategory: boolean,
) {
  if (matchingItems.length > 0) {
    return null;
  }

  if (isCustomCategory) {
    return `Custom category "${itemKey}" has no department_items variants for department "${departmentId}". Add variants in Department Items management.`;
  }

  if (itemKey in ITEM_LABEL_KEYS) {
    return `Built-in category "${itemKey}" has no department_items rows, but i18n fallback variants are available when rendering the plan.`;
  }

  return `No department_items rows match department_id="${departmentId}" and item_key="${itemKey}".`;
}

export function diagnosePlanDropdownRows(
  catalog: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  rowDrafts?: Record<string, { itemVariant?: string }>,
  t?: (key: TranslationKey) => string,
): PlanDropdownRowDiagnostic[] {
  return PLAN_DEPARTMENTS.flatMap((departmentId) => {
    const rows = buildDepartmentRows(
      departmentId,
      getCustomCategoriesForDepartment(
        categories,
        departmentId,
        catalog,
        rowDrafts,
      ),
    );

    return rows.map((row) => {
      const matchingItems = getMatchingDepartmentItems(
        catalog,
        departmentId,
        row.itemKey,
      );
      const category = categories.find(
        (entry) =>
          entry.departmentId === departmentId && entry.itemKey === row.itemKey,
      );
      const isCustomCategory = isCustomCategoryKey(row.itemKey);
      const availableOptionsCount = resolveAvailableOptionsCount(
        catalog,
        departmentId,
        row.itemKey,
        t,
      );

      return {
        rowId: row.id,
        departmentId,
        itemKey: row.itemKey,
        categoryKey: row.itemKey,
        categoryName: category?.categoryName ?? null,
        selectedValue: rowDrafts?.[row.id]?.itemVariant?.trim() ?? '',
        availableOptionsCount,
        departmentItemCount: matchingItems.length,
        isCustomCategory,
        matchingVariantKeys: matchingItems.map((item) => item.variantKey),
        matchingDepartmentItemNames: matchingItems.map((item) => item.itemName),
        reason:
          availableOptionsCount === 0
            ? explainEmptyPlanRow(
                departmentId,
                row.itemKey,
                matchingItems,
                isCustomCategory,
              )
            : null,
      };
    });
  });
}

export function summarizePlanDropdownOptions(
  catalog: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  rowDrafts?: Record<string, { itemVariant?: string }>,
  t?: (key: TranslationKey) => string,
) {
  return diagnosePlanDropdownRows(catalog, categories, rowDrafts, t).map(
    (row) => ({
      rowId: row.rowId,
      departmentId: row.departmentId,
      itemKey: row.itemKey,
      categoryKey: row.categoryKey,
      categoryName: row.categoryName,
      selectedValue: row.selectedValue,
      optionCount: row.availableOptionsCount,
      departmentItemCount: row.departmentItemCount,
      isCustomCategory: row.isCustomCategory,
      reason: row.reason,
    }),
  );
}

function mergeDropdownOptions(
  ...groups: readonly DropdownOption[][]
): DropdownOption[] {
  const seen = new Set<string>();
  const merged: DropdownOption[] = [];

  for (const group of groups) {
    for (const option of group) {
      if (seen.has(option.value)) {
        continue;
      }

      seen.add(option.value);
      merged.push(option);
    }
  }

  return merged;
}

export function getCatalogOptionsForRow(
  catalog: readonly DepartmentItem[],
  departmentId: PlanDepartmentId,
  itemKey: string,
  t: (key: TranslationKey) => string,
): DropdownOption[] {
  const departmentOptions = buildDepartmentOptionsForRow(
    catalog,
    departmentId,
    itemKey,
  );

  if (departmentOptions.length > 0) {
    if (import.meta.env.DEV) {
      console.debug('[department-items] getCatalogOptionsForRow', {
        departmentId,
        itemKey,
        departmentItemMatches: departmentOptions.length,
        source: 'department_items',
      });
    }

    return departmentOptions;
  }

  if (!(itemKey in ITEM_LABEL_KEYS)) {
    return departmentOptions;
  }

  const i18nOptions = getDepartmentItemVariants(
    departmentId,
    itemKey as PlanItemKey,
  ).map((variantKey) => ({
    value: variantKey,
    label: t(variantKey),
  }));

  return mergeDropdownOptions(departmentOptions, i18nOptions);
}

export function resolveVariantLabel(
  itemVariant: string,
  catalog: readonly DepartmentItem[],
  t: (key: TranslationKey) => string,
): string {
  const trimmed = itemVariant.trim();
  if (!trimmed) {
    return PLAN_ITEM_BLANK_OPTION_LABEL;
  }

  const catalogMatch = catalog.find((item) => item.variantKey === trimmed);
  if (catalogMatch) {
    return catalogMatch.itemName;
  }

  if (trimmed.startsWith('admin.inventory.plan.')) {
    return t(trimmed as TranslationKey);
  }

  return trimmed;
}

export function withPersistedVariantOption(
  options: readonly DropdownOption[],
  itemVariant: string,
  catalog: readonly DepartmentItem[],
  t: (key: TranslationKey) => string,
): DropdownOption[] {
  const trimmed = itemVariant.trim();
  if (!trimmed || options.some((option) => option.value === trimmed)) {
    return [...options];
  }

  return [
    ...options,
    {
      value: trimmed,
      label: resolveVariantLabel(trimmed, catalog, t),
    },
  ];
}

export function mergePlanRowDraftsWithCatalog(
  saved:
    | Record<
        string,
        {
          day: string;
          month: string;
          year: string;
          quantity: string;
          itemVariant: string;
        }
      >
    | undefined,
  categories: readonly DepartmentItemCategory[],
  createInitial: () => Record<
    string,
    {
      day: string;
      month: string;
      year: string;
      quantity: string;
      itemVariant: string;
    }
  >,
) {
  const initial = createInitial();
  const emptyDraft = {
    day: '',
    month: '',
    year: '',
    quantity: '',
    itemVariant: '',
  };

  for (const category of categories) {
    if (!isCustomCategoryKey(category.itemKey)) {
      continue;
    }

    const rowId = `${category.departmentId}-${category.itemKey}`;
    if (!initial[rowId]) {
      initial[rowId] = { ...emptyDraft };
    }
  }

  if (!saved) {
    return initial;
  }

  return { ...initial, ...saved };
}

export function logEmptyPlanDropdownRows(
  catalog: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  rowDrafts?: Record<string, { itemVariant?: string }>,
  t?: (key: TranslationKey) => string,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  const diagnostics = diagnosePlanDropdownRows(
    catalog,
    categories,
    rowDrafts,
    t,
  );
  const rowsWithoutOptions = diagnostics.filter(
    (row) => row.availableOptionsCount === 0,
  );

  if (rowsWithoutOptions.length === 0) {
    return;
  }

  console.warn(
    `[department-items] ${rowsWithoutOptions.length} plan rows have no dropdown options`,
  );

  for (const row of rowsWithoutOptions) {
    console.warn('[department-items] empty plan row diagnostic:', row);
  }
}
