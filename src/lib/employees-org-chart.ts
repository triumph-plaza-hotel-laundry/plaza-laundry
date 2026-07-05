import type { LaundryEmployee } from '@/data/laundry-employees';
import { isManagerEmployee } from '@/lib/employee-roles';

export type StaffDepartmentId = 'linen' | 'iron' | 'valet' | 'chest';

export type StaffDepartmentGroup = {
  id: StaffDepartmentId;
  titleEn: string;
  titleAr: string;
  employees: LaundryEmployee[];
};

export type EmployeesOrgChart = {
  director: LaundryEmployee | null;
  manager: LaundryEmployee | null;
  seniorSupervisors: LaundryEmployee[];
  tailor: LaundryEmployee | null;
  shiftLeaders: LaundryEmployee[];
  staffDepartments: StaffDepartmentGroup[];
};

const MANAGER_ID = 'dm-01';
const SENIOR_SUPERVISOR_IDS = ['dm-02', 'ws-01', 'dm-03'] as const;
const SHIFT_LEADER_IDS = ['wts-01', 'wts-02', 'wts-03'] as const;
const TAILOR_ID = 'tl-01';

const STAFF_DEPARTMENT_DEFINITIONS: readonly {
  id: StaffDepartmentId;
  titleEn: string;
  titleAr: string;
  jobTitleEn: string;
}[] = [
  { id: 'linen', titleEn: 'Linen Room', titleAr: 'غرفة اللينين', jobTitleEn: 'Linen Room Attendant' },
  { id: 'iron', titleEn: 'Iron Room', titleAr: 'غرفة المكواة', jobTitleEn: 'Iron Room Attendant' },
  { id: 'valet', titleEn: 'Valet Room', titleAr: 'غرفة الفاليه', jobTitleEn: 'Valet Room Attendant' },
  {
    id: 'chest',
    titleEn: 'Chest Ironers',
    titleAr: 'الجندرة',
    jobTitleEn: 'Chest Ironers Attendant',
  },
];

function pickByIds(employees: LaundryEmployee[], ids: readonly string[]): LaundryEmployee[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  return ids.map((id) => byId.get(id)).filter((employee): employee is LaundryEmployee => Boolean(employee));
}

export function buildEmployeesOrgChart(employees: LaundryEmployee[]): EmployeesOrgChart {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));

  return {
    director: employees.find((employee) => employee.tier === 'generalManager') ?? null,
    manager: byId.get(MANAGER_ID) ?? null,
    seniorSupervisors: pickByIds(employees, SENIOR_SUPERVISOR_IDS),
    tailor: byId.get(TAILOR_ID) ?? employees.find((employee) => employee.tier === 'tailor') ?? null,
    shiftLeaders: pickByIds(employees, SHIFT_LEADER_IDS),
    staffDepartments: STAFF_DEPARTMENT_DEFINITIONS.map((department) => ({
      id: department.id,
      titleEn: department.titleEn,
      titleAr: department.titleAr,
      employees: employees.filter(
        (employee) =>
          !isManagerEmployee(employee) && employee.jobTitle.en === department.jobTitleEn,
      ),
    })),
  };
}

export function orgChartHasMembers(chart: EmployeesOrgChart): boolean {
  return Boolean(
    chart.director ||
      chart.manager ||
      chart.seniorSupervisors.length > 0 ||
      chart.tailor ||
      chart.shiftLeaders.length > 0 ||
      chart.staffDepartments.some((department) => department.employees.length > 0),
  );
}
