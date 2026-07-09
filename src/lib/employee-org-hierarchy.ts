import type { EmployeeTier, LaundryEmployee } from '@/data/laundry-employees';

export type OrgSectionId =
  | 'director'
  | 'laundryManagers'
  | 'assistantManagers'
  | 'supervisors'
  | 'leadSupervisors'
  | 'tailor'
  | 'shiftLeaders'
  | 'staff';

export type StaffDepartmentMatcher = {
  id: string;
  sortOrder: number;
  titleEn: string;
  titleAr: string;
  matches: (employee: LaundryEmployee) => boolean;
};

export type OrgSectionDefinition = {
  id: OrgSectionId;
  sortOrder: number;
  labelKey:
    | 'employees.org.directorEn'
    | 'employees.org.managersEn'
    | 'employees.org.assistantManagersEn'
    | 'employees.org.seniorSupervisorsEn'
    | 'employees.org.leadSupervisorsEn'
    | 'employees.org.tailorEn'
    | 'employees.org.shiftLeadersEn'
    | 'employees.org.staffEn';
  labelArKey:
    | 'employees.org.directorAr'
    | 'employees.org.managersAr'
    | 'employees.org.assistantManagersAr'
    | 'employees.org.seniorSupervisorsAr'
    | 'employees.org.leadSupervisorsAr'
    | 'employees.org.tailorAr'
    | 'employees.org.shiftLeadersAr'
    | 'employees.org.staffAr';
  hideWhenEmpty: boolean;
  matches: (employee: LaundryEmployee) => boolean;
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
  return title.startsWith('shift leader') || employee.tier === 'washingTeamSupervisor';
}

function isLeadSupervisor(employee: LaundryEmployee) {
  const title = jobTitleEn(employee);
  return title === 'lead supervisor' || title === 'laundry supervisor';
}

function isSupervisor(employee: LaundryEmployee) {
  const title = jobTitleEn(employee);
  return title.includes('supervisor') && !isShiftLeader(employee) && !isLeadSupervisor(employee);
}

export const ORG_SECTION_DEFINITIONS: readonly OrgSectionDefinition[] = [
  {
    id: 'director',
    sortOrder: 0,
    labelKey: 'employees.org.directorEn',
    labelArKey: 'employees.org.directorAr',
    hideWhenEmpty: false,
    matches: (employee) =>
      employee.tier === 'generalManager' || jobTitleEn(employee) === 'director manager',
  },
  {
    id: 'laundryManagers',
    sortOrder: 1,
    labelKey: 'employees.org.managersEn',
    labelArKey: 'employees.org.managersAr',
    hideWhenEmpty: true,
    matches: (employee) => jobTitleEn(employee) === 'laundry manager',
  },
  {
    id: 'assistantManagers',
    sortOrder: 2,
    labelKey: 'employees.org.assistantManagersEn',
    labelArKey: 'employees.org.assistantManagersAr',
    hideWhenEmpty: true,
    matches: (employee) => jobTitleEn(employee) === 'assistant manager',
  },
  {
    id: 'supervisors',
    sortOrder: 3,
    labelKey: 'employees.org.seniorSupervisorsEn',
    labelArKey: 'employees.org.seniorSupervisorsAr',
    hideWhenEmpty: true,
    matches: (employee) => isSupervisor(employee),
  },
  {
    id: 'leadSupervisors',
    sortOrder: 4,
    labelKey: 'employees.org.leadSupervisorsEn',
    labelArKey: 'employees.org.leadSupervisorsAr',
    hideWhenEmpty: true,
    matches: (employee) => isLeadSupervisor(employee),
  },
  {
    id: 'tailor',
    sortOrder: 5,
    labelKey: 'employees.org.tailorEn',
    labelArKey: 'employees.org.tailorAr',
    hideWhenEmpty: true,
    matches: (employee) => employee.tier === 'tailor' || jobTitleEn(employee) === 'tailor',
  },
  {
    id: 'shiftLeaders',
    sortOrder: 6,
    labelKey: 'employees.org.shiftLeadersEn',
    labelArKey: 'employees.org.shiftLeadersAr',
    hideWhenEmpty: true,
    matches: (employee) => isShiftLeader(employee),
  },
  {
    id: 'staff',
    sortOrder: 7,
    labelKey: 'employees.org.staffEn',
    labelArKey: 'employees.org.staffAr',
    hideWhenEmpty: true,
    matches: () => true,
  },
] as const;

export const STAFF_DEPARTMENT_MATCHERS: readonly StaffDepartmentMatcher[] = [
  {
    id: 'linen',
    sortOrder: 0,
    titleEn: 'Linen Room',
    titleAr: 'غرفة اللينين',
    matches: (employee) =>
      jobTitleEn(employee) === 'linen room attendant' || departmentMatches(employee, 'linen', 'لينين'),
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
      jobTitleEn(employee) === 'folder' || departmentMatches(employee, 'fold', 'طي'),
  },
  {
    id: 'general-worker',
    sortOrder: 7,
    titleEn: 'General Workers',
    titleAr: 'العمال',
    matches: (employee) => jobTitleEn(employee) === 'general worker',
  },
] as const;

const ADMIN_TABLE_SECTION_RANK: Record<OrgSectionId, number> = {
  director: 0,
  laundryManagers: 1,
  assistantManagers: 2,
  supervisors: 3,
  leadSupervisors: 4,
  shiftLeaders: 5,
  tailor: 6,
  staff: 6,
};

const UNKNOWN_STAFF_DEPARTMENT_RANK = 99;

const ADMIN_TABLE_HIERARCHY_MATCHERS: readonly {
  rank: number;
  matches: (employee: LaundryEmployee) => boolean;
}[] = [
  {
    rank: 0,
    matches: (employee) =>
      employee.tier === 'generalManager' || jobTitleEn(employee) === 'director manager',
  },
  { rank: 1, matches: (employee) => jobTitleEn(employee) === 'laundry manager' },
  { rank: 2, matches: (employee) => jobTitleEn(employee) === 'assistant manager' },
  { rank: 3, matches: (employee) => isSupervisor(employee) },
  { rank: 4, matches: (employee) => isLeadSupervisor(employee) },
  { rank: 5, matches: (employee) => isShiftLeader(employee) },
  {
    rank: 6,
    matches: (employee) => employee.tier === 'tailor' || jobTitleEn(employee) === 'tailor',
  },
  {
    rank: 7,
    matches: (employee) =>
      jobTitleEn(employee) === 'valet room attendant' ||
      departmentMatches(employee, 'valet', 'فاليه'),
  },
  {
    rank: 8,
    matches: (employee) =>
      jobTitleEn(employee) === 'linen room attendant' ||
      departmentMatches(employee, 'linen', 'لينين'),
  },
  {
    rank: 9,
    matches: (employee) =>
      jobTitleEn(employee) === 'washer' || departmentMatches(employee, 'laundry', 'مغسلة'),
  },
  {
    rank: 10,
    matches: (employee) =>
      jobTitleEn(employee) === 'iron room attendant' ||
      jobTitleEn(employee) === 'ironer' ||
      jobTitleEn(employee) === 'presser' ||
      jobTitleEn(employee) === 'chest ironers attendant' ||
      departmentMatches(employee, 'iron room', 'مكواة', 'chest ironers', 'جندرة', 'pressing', 'كي'),
  },
  {
    rank: 11,
    matches: (employee) =>
      jobTitleEn(employee) === 'general worker' ||
      jobTitleEn(employee) === 'folder' ||
      jobTitleEn(employee) === 'dry cleaner',
  },
] as const;

const UNKNOWN_ADMIN_TABLE_RANK = 99;

const ADMIN_TABLE_PINNED_NAME_KEYS: readonly string[][] = [
  ['ahmeddabaka', 'ahmeddebaka'],
  ['ramadanmahmoud'],
  ['ahmedshaaban', 'ahmedshabban'],
  ['mohamedhamed', 'mohamedhamid'],
  ['mostafamohamed', 'mustafamohamed'],
  ['tarikali'],
  ['mohamedsaid', 'mohamedsaeed'],
  ['kamelahmed'],
  ['mohamedsayed'],
  ['ashrafelsayed'],
  ['khaledelsayed'],
  ['abdallahahmed'],
] as const;

const SECTION_PRIORITY = [...ORG_SECTION_DEFINITIONS].sort((left, right) => left.sortOrder - right.sortOrder);

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

export function resolveEmployeeOrgSection(employee: LaundryEmployee): OrgSectionId {
  const match = SECTION_PRIORITY.find(
    (section) => section.id !== 'staff' && section.matches(employee),
  );

  return match?.id ?? 'staff';
}

export function inferEmployeeTierFromPosition(jobTitleEn: string, currentTier?: EmployeeTier): EmployeeTier {
  const title = normalizeJobTitle(jobTitleEn);

  if (!title) {
    return currentTier ?? 'laundryWorker';
  }

  if (title === 'director manager') {
    return 'generalManager';
  }

  if (title === 'laundry manager' || title === 'assistant manager') {
    return 'departmentManager';
  }

  if (title === 'tailor') {
    return 'tailor';
  }

  if (title.startsWith('shift leader')) {
    return 'washingTeamSupervisor';
  }

  if (title === 'senior valet supervisor' || title === 'senior linen supervisor') {
    return 'departmentManager';
  }

  if (title === 'lead supervisor' || title === 'laundry supervisor') {
    return 'washingSupervisor';
  }

  if (title.includes('supervisor')) {
    return 'washingSupervisor';
  }

  return 'laundryWorker';
}

export function getEmployeeSortCode(employee: LaundryEmployee): string {
  const code = employee.employeeId.trim() || employee.id.trim();
  return code || employee.name.en.trim() || employee.name.ar.trim();
}

function normalizeAdminTablePinnedNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function getAdminTablePinnedRank(employee: LaundryEmployee): number | null {
  const nameKey = normalizeAdminTablePinnedNameKey(employee.name.en);

  for (let index = 0; index < ADMIN_TABLE_PINNED_NAME_KEYS.length; index += 1) {
    if (ADMIN_TABLE_PINNED_NAME_KEYS[index].some((alias) => alias === nameKey)) {
      return index;
    }
  }

  return null;
}

export function getAdminTableHierarchyRank(employee: LaundryEmployee): number {
  const match = ADMIN_TABLE_HIERARCHY_MATCHERS.find((entry) => entry.matches(employee));
  return match?.rank ?? UNKNOWN_ADMIN_TABLE_RANK;
}

export function compareEmployeesForAdminTable(
  left: LaundryEmployee,
  right: LaundryEmployee,
): number {
  const leftPinned = getAdminTablePinnedRank(left);
  const rightPinned = getAdminTablePinnedRank(right);

  if (leftPinned !== null || rightPinned !== null) {
    if (leftPinned === null) {
      return 1;
    }

    if (rightPinned === null) {
      return -1;
    }

    if (leftPinned !== rightPinned) {
      return leftPinned - rightPinned;
    }
  }

  const leftRank = getAdminTableHierarchyRank(left);
  const rightRank = getAdminTableHierarchyRank(right);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return getEmployeeSortCode(left).localeCompare(getEmployeeSortCode(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortEmployeesForAdminTable(
  employees: readonly LaundryEmployee[],
): LaundryEmployee[] {
  return [...employees].sort(compareEmployeesForAdminTable);
}

export function getAdminTableSectionRank(employee: LaundryEmployee): number {
  const section = resolveEmployeeOrgSection(employee);
  return ADMIN_TABLE_SECTION_RANK[section];
}

export function resolveStaffDepartmentSortRank(employee: LaundryEmployee): number {
  const section = resolveEmployeeOrgSection(employee);
  if (section !== 'staff' && section !== 'tailor') {
    return -1;
  }

  const matcher = STAFF_DEPARTMENT_MATCHERS.find((entry) => entry.matches(employee));
  return matcher?.sortOrder ?? UNKNOWN_STAFF_DEPARTMENT_RANK;
}

export function compareEmployeesByHierarchy(
  left: LaundryEmployee,
  right: LaundryEmployee,
): number {
  const leftSection = getAdminTableSectionRank(left);
  const rightSection = getAdminTableSectionRank(right);
  if (leftSection !== rightSection) {
    return leftSection - rightSection;
  }

  const leftStaffRank = resolveStaffDepartmentSortRank(left);
  const rightStaffRank = resolveStaffDepartmentSortRank(right);
  if (leftStaffRank !== rightStaffRank) {
    return leftStaffRank - rightStaffRank;
  }

  return getEmployeeSortCode(left).localeCompare(getEmployeeSortCode(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortEmployeesByHierarchy(employees: readonly LaundryEmployee[]): LaundryEmployee[] {
  return [...employees].sort(compareEmployeesByHierarchy);
}

export function assignEmployeesToOrgSections(employees: LaundryEmployee[]) {
  const buckets = new Map<OrgSectionId, LaundryEmployee[]>(
    SECTION_PRIORITY.map((section) => [section.id, []]),
  );

  for (const employee of sortEmployeesByHierarchy(employees)) {
    const sectionId = resolveEmployeeOrgSection(employee);
    buckets.get(sectionId)?.push(employee);
  }

  return {
    buckets,
  };
}

function sortBucketByEmployeeCode(employees: LaundryEmployee[]) {
  return [...employees].sort((left, right) =>
    getEmployeeSortCode(left).localeCompare(getEmployeeSortCode(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

export function buildStaffDepartments(staffEmployees: LaundryEmployee[]) {
  const remaining = sortEmployeesByHierarchy(staffEmployees);
  const departments: {
    id: string;
    titleEn: string;
    titleAr: string;
    employees: LaundryEmployee[];
  }[] = [];

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
