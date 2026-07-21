/** Deno-compatible Employees page department tree (mirrors src/lib/employee-org-hierarchy). */

export type LaundryEmployee = {
  id: string;
  status: string;
  employeeId?: string;
  name: { en: string; ar: string };
  jobTitle: { en: string; ar: string };
  department: { en: string; ar: string };
  tier?: string;
};

type OrgSectionId =
  | 'director'
  | 'laundryManagers'
  | 'assistantManagers'
  | 'supervisors'
  | 'leadSupervisors'
  | 'tailor'
  | 'shiftLeaders'
  | 'staff';

type StaffDepartmentMatcher = {
  id: string;
  sortOrder: number;
  titleEn: string;
  titleAr: string;
  matches: (employee: LaundryEmployee) => boolean;
};

type StaffDepartmentGroup = {
  id: string;
  titleEn: string;
  titleAr: string;
  employees: LaundryEmployee[];
};

function normalizeJobTitle(value: string) {
  return value.trim().toLowerCase();
}

function jobTitleEn(employee: LaundryEmployee) {
  return normalizeJobTitle(employee.jobTitle.en);
}

function departmentEn(employee: LaundryEmployee) {
  return normalizeJobTitle(employee.department.en);
}

function departmentAr(employee: LaundryEmployee) {
  return normalizeJobTitle(employee.department.ar);
}

function departmentMatches(employee: LaundryEmployee, ...keywords: string[]) {
  const dept = `${departmentEn(employee)} ${departmentAr(employee)}`;
  return keywords.some((keyword) => dept.includes(keyword));
}

function isShiftLeader(employee: LaundryEmployee) {
  const title = jobTitleEn(employee);
  return (
    title.startsWith('shift leader') ||
    employee.tier === 'washingTeamSupervisor'
  );
}

function isLeadSupervisor(employee: LaundryEmployee) {
  const title = jobTitleEn(employee);
  return title === 'lead supervisor' || title === 'laundry supervisor';
}

function isSupervisor(employee: LaundryEmployee) {
  const title = jobTitleEn(employee);
  return (
    title.includes('supervisor') &&
    !isShiftLeader(employee) &&
    !isLeadSupervisor(employee)
  );
}

const ORG_SECTION_DEFINITIONS: readonly {
  id: OrgSectionId;
  sortOrder: number;
  matches: (employee: LaundryEmployee) => boolean;
}[] = [
  {
    id: 'director',
    sortOrder: 0,
    matches: (employee) =>
      employee.tier === 'generalManager' ||
      jobTitleEn(employee) === 'director manager',
  },
  {
    id: 'laundryManagers',
    sortOrder: 1,
    matches: (employee) => jobTitleEn(employee) === 'laundry manager',
  },
  {
    id: 'assistantManagers',
    sortOrder: 2,
    matches: (employee) => jobTitleEn(employee) === 'assistant manager',
  },
  {
    id: 'supervisors',
    sortOrder: 3,
    matches: (employee) => isSupervisor(employee),
  },
  {
    id: 'leadSupervisors',
    sortOrder: 4,
    matches: (employee) => isLeadSupervisor(employee),
  },
  {
    id: 'tailor',
    sortOrder: 5,
    matches: (employee) =>
      employee.tier === 'tailor' || jobTitleEn(employee) === 'tailor',
  },
  {
    id: 'shiftLeaders',
    sortOrder: 6,
    matches: (employee) => isShiftLeader(employee),
  },
  {
    id: 'staff',
    sortOrder: 7,
    matches: () => true,
  },
];

const STAFF_DEPARTMENT_MATCHERS: readonly StaffDepartmentMatcher[] = [
  {
    id: 'linen',
    sortOrder: 0,
    titleEn: 'Linen Room',
    titleAr: 'غرفة اللينين',
    matches: (employee) =>
      jobTitleEn(employee) === 'linen room attendant' ||
      departmentMatches(employee, 'linen', 'لينين'),
  },
  {
    id: 'laundry',
    sortOrder: 1,
    titleEn: 'Laundry',
    titleAr: 'المغسلة',
    matches: (employee) =>
      jobTitleEn(employee) === 'washer' ||
      jobTitleEn(employee) === 'valet room attendant' ||
      departmentMatches(employee, 'laundry', 'مغسلة', 'valet', 'فاليه'),
  },
  {
    id: 'iron',
    sortOrder: 2,
    titleEn: 'Iron Room',
    titleAr: 'غرفة المكواة',
    matches: (employee) =>
      jobTitleEn(employee) === 'iron room attendant' ||
      jobTitleEn(employee) === 'ironer' ||
      departmentMatches(employee, 'iron room', 'مكواة'),
  },
  {
    id: 'pressing',
    sortOrder: 3,
    titleEn: 'Pressing',
    titleAr: 'الكي',
    matches: (employee) =>
      jobTitleEn(employee) === 'presser' ||
      jobTitleEn(employee) === 'chest ironers attendant' ||
      departmentMatches(employee, 'chest ironers', 'جندرة', 'pressing', 'كي'),
  },
  {
    id: 'tailors',
    sortOrder: 4,
    titleEn: 'Tailors',
    titleAr: 'الترزية',
    matches: (employee) =>
      employee.tier === 'tailor' ||
      jobTitleEn(employee) === 'tailor' ||
      departmentMatches(employee, 'tailor', 'ترز'),
  },
  {
    id: 'dry-cleaning',
    sortOrder: 5,
    titleEn: 'Dry Cleaning',
    titleAr: 'التنظيف الجاف',
    matches: (employee) =>
      jobTitleEn(employee) === 'dry cleaner' ||
      departmentMatches(employee, 'dry clean', 'تنظيف جاف'),
  },
  {
    id: 'folding',
    sortOrder: 6,
    titleEn: 'Folding',
    titleAr: 'الطي',
    matches: (employee) =>
      jobTitleEn(employee) === 'folder' ||
      departmentMatches(employee, 'fold', 'طي'),
  },
  {
    id: 'general-worker',
    sortOrder: 7,
    titleEn: 'General Workers',
    titleAr: 'العمال',
    matches: (employee) => jobTitleEn(employee) === 'general worker',
  },
];

function getEmployeeSortCode(employee: LaundryEmployee): string {
  const code = employee.employeeId?.trim() || employee.id.trim();
  return code || employee.name.en.trim() || employee.name.ar.trim();
}

function resolveEmployeeOrgSection(employee: LaundryEmployee): OrgSectionId {
  const match = ORG_SECTION_DEFINITIONS.find(
    (section) => section.id !== 'staff' && section.matches(employee),
  );
  return match?.id ?? 'staff';
}

function sortBucketByEmployeeCode(employees: LaundryEmployee[]) {
  return [...employees].sort((left, right) =>
    getEmployeeSortCode(left).localeCompare(
      getEmployeeSortCode(right),
      undefined,
      { numeric: true, sensitivity: 'base' },
    ),
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pluralizeSectionTitle(titleEn: string) {
  const trimmed = titleEn.trim();
  if (!trimmed) {
    return 'Employees';
  }
  if (trimmed.endsWith('s')) {
    return trimmed;
  }
  if (trimmed.endsWith('y')) {
    return `${trimmed.slice(0, -1)}ies`;
  }
  if (trimmed.endsWith('Worker')) {
    return `${trimmed}s`;
  }
  return `${trimmed}s`;
}

function buildStaffDepartments(staffEmployees: LaundryEmployee[]) {
  const remaining = [...staffEmployees];
  const departments: StaffDepartmentGroup[] = [];

  for (const matcher of STAFF_DEPARTMENT_MATCHERS) {
    const matched = remaining.filter((employee) => matcher.matches(employee));
    if (matched.length === 0) {
      continue;
    }

    departments.push({
      id: matcher.id,
      titleEn: matcher.titleEn,
      titleAr: matcher.titleAr,
      employees: sortBucketByEmployeeCode(matched),
    });

    for (const employee of matched) {
      const index = remaining.findIndex((entry) => entry.id === employee.id);
      if (index !== -1) {
        remaining.splice(index, 1);
      }
    }
  }

  const groupedByTitle = new Map<string, LaundryEmployee[]>();

  for (const employee of remaining) {
    const titleEn = employee.jobTitle.en.trim() || 'Employee';
    const group = groupedByTitle.get(titleEn) ?? [];
    group.push(employee);
    groupedByTitle.set(titleEn, group);
  }

  const autoDepartments = [...groupedByTitle.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([titleEn, groupEmployees]) => ({
      id: slugify(titleEn),
      titleEn: pluralizeSectionTitle(titleEn),
      titleAr: groupEmployees[0]?.jobTitle.ar.trim() || titleEn,
      employees: sortBucketByEmployeeCode(groupEmployees),
    }));

  return [...departments, ...autoDepartments];
}

function buildEmployeeDepartmentTargets(
  employees: LaundryEmployee[],
): StaffDepartmentGroup[] {
  const staffEmployees = employees.filter(
    (employee) => resolveEmployeeOrgSection(employee) === 'staff',
  );

  return buildStaffDepartments(staffEmployees).filter(
    (department) => department.employees.length > 0,
  );
}

export function getEmployeesForDepartmentTarget(
  employees: LaundryEmployee[],
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

export function getDepartmentTargetLabel(
  employees: LaundryEmployee[],
  departmentId: string,
): string | null {
  const department = buildEmployeeDepartmentTargets(employees).find(
    (entry) => entry.id === departmentId,
  );
  return department?.titleEn ?? null;
}
