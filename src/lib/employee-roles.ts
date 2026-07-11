import type { LaundryEmployee } from '@/data/laundry-employees';

export const MANAGER_EMPLOYEE_IDS = ['gm-01', 'dm-01'] as const;

export type ManagerEmployeeId = (typeof MANAGER_EMPLOYEE_IDS)[number];

export function isManagerEmployee(
  employee: Pick<LaundryEmployee, 'id' | 'tier'>,
): boolean {
  return (
    employee.tier === 'generalManager' ||
    MANAGER_EMPLOYEE_IDS.includes(employee.id as ManagerEmployeeId)
  );
}

export function getShiftEligibleEmployees(
  employees: readonly LaundryEmployee[],
): LaundryEmployee[] {
  return employees.filter((employee) => !isManagerEmployee(employee));
}

export function sortEmployeesForDisplay(
  employees: readonly LaundryEmployee[],
): LaundryEmployee[] {
  const managerOrder = new Map(
    MANAGER_EMPLOYEE_IDS.map((id, index) => [id, index]),
  );

  return [...employees].sort((left, right) => {
    const leftIsManager = isManagerEmployee(left);
    const rightIsManager = isManagerEmployee(right);

    if (leftIsManager !== rightIsManager) {
      return leftIsManager ? -1 : 1;
    }

    if (leftIsManager && rightIsManager) {
      return (
        (managerOrder.get(left.id as ManagerEmployeeId) ?? 99) -
        (managerOrder.get(right.id as ManagerEmployeeId) ?? 99)
      );
    }

    return left.sortOrder - right.sortOrder;
  });
}
