import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  assignEmployeesToOrgSections,
  buildStaffDepartments,
} from '@/lib/employee-org-hierarchy';

export type StaffDepartmentId = string;

export type StaffDepartmentGroup = {
  id: StaffDepartmentId;
  titleEn: string;
  titleAr: string;
  employees: LaundryEmployee[];
};

export type EmployeesOrgChart = {
  director: LaundryEmployee | null;
  manager: LaundryEmployee | null;
  assistantManagers: LaundryEmployee[];
  seniorSupervisors: LaundryEmployee[];
  leadSupervisors: LaundryEmployee[];
  tailor: LaundryEmployee | null;
  shiftLeaders: LaundryEmployee[];
  staffDepartments: StaffDepartmentGroup[];
};

export function buildEmployeesOrgChart(
  employees: LaundryEmployee[],
): EmployeesOrgChart {
  const { buckets } = assignEmployeesToOrgSections(employees);

  const laundryManagers = buckets.get('laundryManagers') ?? [];
  const tailors = buckets.get('tailor') ?? [];

  return {
    director: (buckets.get('director') ?? [])[0] ?? null,
    manager: laundryManagers[0] ?? null,
    assistantManagers: buckets.get('assistantManagers') ?? [],
    seniorSupervisors: buckets.get('supervisors') ?? [],
    leadSupervisors: buckets.get('leadSupervisors') ?? [],
    tailor: tailors[0] ?? null,
    shiftLeaders: buckets.get('shiftLeaders') ?? [],
    staffDepartments: buildStaffDepartments(buckets.get('staff') ?? []),
  };
}

export function orgChartHasMembers(chart: EmployeesOrgChart): boolean {
  return Boolean(
    chart.director ||
    chart.manager ||
    chart.assistantManagers.length > 0 ||
    chart.seniorSupervisors.length > 0 ||
    chart.leadSupervisors.length > 0 ||
    chart.tailor ||
    chart.shiftLeaders.length > 0 ||
    chart.staffDepartments.some(
      (department) => department.employees.length > 0,
    ),
  );
}

/**
 * Department groups from the Employees page org chart (staff department tree).
 * Always derive from the current employee list — never maintain a separate list.
 */
export function buildEmployeeDepartmentTargets(
  employees: readonly LaundryEmployee[],
): StaffDepartmentGroup[] {
  return buildEmployeesOrgChart([...employees]).staffDepartments.filter(
    (department) => department.employees.length > 0,
  );
}

export function getEmployeesForDepartmentTarget(
  employees: readonly LaundryEmployee[],
  departmentId: string,
): LaundryEmployee[] {
  if (!departmentId.trim()) {
    return [];
  }

  const department = buildEmployeeDepartmentTargets(employees).find(
    (entry) => entry.id === departmentId,
  );

  return department?.employees ?? [];
}
