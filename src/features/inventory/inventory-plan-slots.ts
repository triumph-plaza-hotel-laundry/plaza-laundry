import type { DepartmentItemCategory } from '@/features/inventory/department-items-types';
import {
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_ITEMS,
  type PlanDepartmentId,
} from '@/features/inventory/inventory-plan-schema';

export type PlanRowSlot = {
  departmentId: PlanDepartmentId;
  itemKey: string;
};

export function enumerateAllPlanRowSlots(
  categories: readonly DepartmentItemCategory[] = [],
): PlanRowSlot[] {
  const seen = new Set<string>();
  const slots: PlanRowSlot[] = [];

  const add = (departmentId: PlanDepartmentId, itemKey: string) => {
    const trimmed = itemKey.trim();
    if (!trimmed) {
      return;
    }

    const key = `${departmentId}:${trimmed}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    slots.push({ departmentId, itemKey: trimmed });
  };

  for (const departmentId of PLAN_DEPARTMENTS) {
    for (const itemKey of PLAN_DEPARTMENT_ITEMS[departmentId]) {
      add(departmentId, itemKey);
    }
  }

  for (const category of categories) {
    add(category.departmentId, category.itemKey);
  }

  return slots;
}
