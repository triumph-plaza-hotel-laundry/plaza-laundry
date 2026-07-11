import type { PlanDepartmentId } from '@/features/inventory/inventory-plan-schema';

export type DepartmentItem = {
  id: string;

  departmentId: PlanDepartmentId;

  itemKey: string;

  itemName: string;

  variantKey: string;

  unit: string;

  sortOrder: number;

  createdAt: string;

  updatedAt: string;
};

export type DepartmentItemCategory = {
  id: string;

  departmentId: PlanDepartmentId;

  itemKey: string;

  categoryName: string;

  sortOrder: number;

  createdAt: string;

  updatedAt: string;
};

export type DepartmentItemInput = {
  departmentId: PlanDepartmentId;

  itemKey: string;

  itemName: string;

  unit: string;
};

export type DepartmentItemUpdate = {
  itemKey: string;

  itemName: string;

  unit: string;
};

export type PlanDepartmentRow = {
  id: `${PlanDepartmentId}-${string}`;

  itemKey: string;
};

export type DropdownOption = {
  value: string;

  label: string;
};
