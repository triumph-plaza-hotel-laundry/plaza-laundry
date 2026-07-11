import { dictionaries } from '@/i18n/dictionaries';
import {
  ITEM_LABEL_KEYS,
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_ITEMS,
  getDepartmentItemVariants,
  type PlanDepartmentId,
  type PlanItemKey,
} from '@/features/inventory/inventory-plan-schema';
import type { TranslationKey } from '@/types/language';

export type DepartmentItemSeedRow = {
  departmentId: PlanDepartmentId;
  itemKey: PlanItemKey;
  itemName: string;
  variantKey: string;
  unit: string;
  sortOrder: number;
};

export function buildSeedDepartmentItems(): DepartmentItemSeedRow[] {
  const items: DepartmentItemSeedRow[] = [];

  for (const departmentId of PLAN_DEPARTMENTS) {
    let sortOrder = 0;

    for (const itemKey of PLAN_DEPARTMENT_ITEMS[departmentId]) {
      const variants = getDepartmentItemVariants(departmentId, itemKey);

      if (variants.length === 0) {
        const labelKey = ITEM_LABEL_KEYS[itemKey];
        items.push({
          departmentId,
          itemKey,
          itemName: dictionaries.ar[labelKey],
          variantKey: labelKey,
          unit: 'قطعة',
          sortOrder: sortOrder++,
        });
        continue;
      }

      for (const variantKey of variants) {
        items.push({
          departmentId,
          itemKey,
          itemName: dictionaries.ar[variantKey as TranslationKey],
          variantKey,
          unit: 'قطعة',
          sortOrder: sortOrder++,
        });
      }
    }
  }

  return items;
}
