import type { ShiftRole } from '@/data/laundry-shifts';
import {
  SHIFT_DEPARTMENTS,
  type ShiftDepartmentDefinition,
  type ShiftDepartmentId,
} from '@/lib/shift-departments';
import type { LaundryEmployee } from '@/data/laundry-employees';

export const ADMIN_SHIFT_DEPARTMENT_ORDER: readonly ShiftDepartmentId[] = [
  'laundry',
  'valet',
  'iron',
  'chest',
  'linen',
  'tailor',
] as const;

export const ADMIN_DEPARTMENT_SHIFT_ROLES: Record<
  ShiftDepartmentId,
  ShiftRole
> = {
  laundry: 'washer',
  valet: 'calendar',
  iron: 'ironing',
  chest: 'ghalya',
  linen: 'linen',
  tailor: 'annualLeave',
};

export type AdminShiftDepartmentView = ShiftDepartmentDefinition & {
  shiftRole: ShiftRole;
  employees: LaundryEmployee[];
  manager: LaundryEmployee | null;
};

export function getAdminShiftDepartments(
  employees: LaundryEmployee[],
): AdminShiftDepartmentView[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentById = new Map(
    SHIFT_DEPARTMENTS.map((department) => [department.id, department]),
  );
  const result: AdminShiftDepartmentView[] = [];

  ADMIN_SHIFT_DEPARTMENT_ORDER.forEach((departmentId) => {
    const department = departmentById.get(departmentId);
    if (!department) {
      return;
    }

    const departmentEmployees = department.employeeIds
      .map((id) => byId.get(id))
      .filter((employee): employee is LaundryEmployee => Boolean(employee));

    const manager =
      departmentEmployees.find((employee) =>
        /supervisor|manager|مشرف|مدير/i.test(
          `${employee.jobTitle.en} ${employee.jobTitle.ar}`,
        ),
      ) ??
      departmentEmployees[0] ??
      null;

    result.push({
      ...department,
      shiftRole: ADMIN_DEPARTMENT_SHIFT_ROLES[departmentId],
      employees: departmentEmployees,
      manager,
    });
  });

  return result;
}
