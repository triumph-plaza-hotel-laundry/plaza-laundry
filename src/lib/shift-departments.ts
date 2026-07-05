import type { LaundryEmployee } from '@/data/laundry-employees';

export type ShiftDepartmentId = 'laundry' | 'valet' | 'linen' | 'iron' | 'chest' | 'tailor';

export type ShiftDepartmentDefinition = {
  id: ShiftDepartmentId;
  icon: string;
  titleEn: string;
  titleAr: string;
  employeeIds: readonly string[];
};

export const SHIFT_DEPARTMENTS: readonly ShiftDepartmentDefinition[] = [
  {
    id: 'valet',
    icon: '🛎',
    titleEn: 'Valet Department',
    titleAr: 'قسم الفاليه',
    employeeIds: ['dm-02', 'wts-01', 'lw-06'],
  },
  {
    id: 'laundry',
    icon: '🧺',
    titleEn: 'Laundry Department',
    titleAr: 'قسم المغسلة',
    employeeIds: ['ws-01', 'ws-02', 'wts-02'],
  },
  {
    id: 'linen',
    icon: '📦',
    titleEn: 'Linen Room',
    titleAr: 'غرفة اللينين',
    employeeIds: ['dm-03', 'lw-01'],
  },
  {
    id: 'iron',
    icon: '🔥',
    titleEn: 'Iron Room',
    titleAr: 'غرفة المكواة',
    employeeIds: ['wts-03', 'lw-02', 'lw-03', 'lw-04', 'lw-05'],
  },
  {
    id: 'chest',
    icon: '🧵',
    titleEn: 'Chest Ironers',
    titleAr: 'الجندرة',
    employeeIds: ['lw-07', 'lw-08', 'lw-09', 'lw-10'],
  },
  {
    id: 'tailor',
    icon: '✂',
    titleEn: 'Tailor',
    titleAr: 'الترزي',
    employeeIds: ['tl-01'],
  },
] as const;

export type ShiftDepartmentGroup = ShiftDepartmentDefinition & {
  employees: LaundryEmployee[];
};

export function groupEmployeesByShiftDepartment(
  employees: LaundryEmployee[],
): ShiftDepartmentGroup[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));

  return SHIFT_DEPARTMENTS.map((department) => ({
    ...department,
    employees: department.employeeIds
      .map((id) => byId.get(id))
      .filter((employee): employee is LaundryEmployee => Boolean(employee))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  })).filter((department) => department.employees.length > 0);
}
