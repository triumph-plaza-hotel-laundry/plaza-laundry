export type LocalizedText = {
  en: string;
  ar: string;
};

export type EmployeeTier =
  | 'generalManager'
  | 'departmentManager'
  | 'tailor'
  | 'washingSupervisor'
  | 'washingTeamSupervisor'
  | 'laundryWorker';

export type EmployeeStatus = 'active' | 'inactive';

export type LaundryEmployee = {
  /** Permanent Employee ID (EMP-0001…). Immutable after creation. */
  id: string;
  /** Same as id — kept for display/search compatibility. */
  employeeId: string;
  tier: EmployeeTier;
  status: EmployeeStatus;
  name: LocalizedText;
  jobTitle: LocalizedText;
  department: LocalizedText;
  sortOrder: number;
  phone: string;
  dateOfBirth: LocalizedText;
  shift: LocalizedText;
  salary: string;
  hireDate: LocalizedText;
  notes: LocalizedText;
};

function e(
  id: string,
  tier: EmployeeTier,
  sortOrder: number,
  nameEn: string,
  nameAr: string,
  jobTitleEn: string,
  jobTitleAr: string,
  departmentEn: string,
  departmentAr: string,
): LaundryEmployee {
  return {
    id,
    employeeId: id,
    tier,
    status: 'active' as const,
    sortOrder,
    name: { en: nameEn, ar: nameAr },
    jobTitle: { en: jobTitleEn, ar: jobTitleAr },
    department: { en: departmentEn, ar: departmentAr },
    phone: '',
    dateOfBirth: { en: '', ar: '' },
    shift: { en: '', ar: '' },
    salary: '',
    hireDate: { en: '', ar: '' },
    notes: { en: '', ar: '' },
  };
}

/**
 * Seed catalog — permanent Employee IDs in locked order EMP-0001…EMP-0020.
 * Do not renumber. Future hires continue at EMP-0021+.
 */
export const laundryEmployees: readonly LaundryEmployee[] = [
  e(
    'EMP-0001',
    'generalManager',
    0,
    'Ahmed Debka',
    'أحمد دبكه',
    'Director Manager',
    'المدير المسؤول',
    '',
    '',
  ),
  e(
    'EMP-0002',
    'departmentManager',
    1,
    'Ramadan Mahmoud',
    'رمضان محمود',
    'Laundry Manager',
    'مدير المغسلة',
    '',
    '',
  ),
  e(
    'EMP-0003',
    'washingSupervisor',
    2,
    'Ahmed Shaaban',
    'أحمد شعبان',
    'Senior Laundry Supervisor',
    'مشرف أول مغسلة',
    'Laundry Department',
    'قسم المغسلة',
  ),
  e(
    'EMP-0004',
    'departmentManager',
    3,
    'Mohamed Hamed',
    'محمد حامد',
    'Senior Valet Supervisor',
    'مشرف أول فاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'EMP-0005',
    'departmentManager',
    4,
    'Mostafa Mohamed',
    'مصطفى محمد',
    'Senior Linen Supervisor',
    'مشرف أول لينين',
    'Linen Room',
    'غرفة اللينين',
  ),
  e(
    'EMP-0006',
    'washingTeamSupervisor',
    5,
    'Kamel Ahmed',
    'كامل أحمد',
    'Shift Leader Valet',
    'مشرف وردية الفاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'EMP-0007',
    'tailor',
    6,
    'Mohamed Saeed',
    'محمد سعيد',
    'Tailor',
    'ترزي',
    'Tailor',
    'الترزي',
  ),
  e(
    'EMP-0008',
    'washingTeamSupervisor',
    7,
    'Mohamed Sayed',
    'محمد سيد',
    'Shift Leader Laundry',
    'مشرف وردية المغسلة',
    'Laundry Department',
    'قسم المغسلة',
  ),
  e(
    'EMP-0009',
    'washingTeamSupervisor',
    8,
    'Ashraf El Sayed',
    'أشرف السيد',
    'Shift Leader Iron',
    'مشرف وردية المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'EMP-0010',
    'washingSupervisor',
    9,
    'Tarek Ali',
    'طارق علي',
    'Lead Supervisor',
    'مشرف رئيسي',
    'Laundry',
    'المغسلة',
  ),
  e(
    'EMP-0011',
    'laundryWorker',
    10,
    'Khaled El Sayed',
    'خالد السيد',
    'Valet Room Attendant',
    'عامل غرفة الفاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'EMP-0012',
    'laundryWorker',
    11,
    'Abdallah Ahmed',
    'عبدالله أحمد',
    'Linen Room Attendant',
    'عامل غرفة اللينين',
    'Linen Room',
    'غرفة اللينين',
  ),
  e(
    'EMP-0013',
    'laundryWorker',
    12,
    'Adel Salah',
    'عادل صلاح',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'EMP-0014',
    'laundryWorker',
    13,
    'Mohamed Abdul Nabi',
    'محمد عبد النبي',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'EMP-0015',
    'laundryWorker',
    14,
    'Mohamed Salama',
    'محمد سلامة',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'EMP-0016',
    'laundryWorker',
    15,
    'Eslam Abdulaziz',
    'إسلام عبدالعزيز',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'EMP-0017',
    'laundryWorker',
    16,
    'Mohamed Mosalam',
    'محمد مسلم',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'EMP-0018',
    'laundryWorker',
    17,
    'Ahmed Mohamed',
    'أحمد محمد',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'EMP-0019',
    'laundryWorker',
    18,
    'Ahmed Ali',
    'أحمد علي',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'EMP-0020',
    'laundryWorker',
    19,
    'Mohamed Mostafa',
    'محمد مصطفى',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
] as const;

export const employeeHierarchy: readonly {
  tier: EmployeeTier;
  gridClass: string;
}[] = [
  { tier: 'departmentManager', gridClass: 'employees-hierarchy__row--dm' },
  { tier: 'tailor', gridClass: 'employees-hierarchy__row--tailor' },
  { tier: 'washingSupervisor', gridClass: 'employees-hierarchy__row--ws' },
  { tier: 'washingTeamSupervisor', gridClass: 'employees-hierarchy__row--wts' },
  { tier: 'laundryWorker', gridClass: 'employees-hierarchy__row--workers' },
] as const;

export function getEmployeesByTier(tier: EmployeeTier): LaundryEmployee[] {
  return laundryEmployees.filter((employee) => employee.tier === tier);
}
