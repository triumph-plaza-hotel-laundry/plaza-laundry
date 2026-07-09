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
  id: string;
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

export const laundryEmployees: readonly LaundryEmployee[] = [
  e(
    'gm-01',
    'generalManager',
    0,
    'Ahmed Debaka',
    'أحمد دبكه',
    'Director Manager',
    'المدير المسؤول',
    '',
    '',
  ),
  e(
    'dm-01',
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
    'dm-02',
    'departmentManager',
    2,
    'Mohamed Hamid',
    'محمد حامد',
    'Senior Valet Supervisor',
    'مشرف أول فاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'wts-01',
    'washingTeamSupervisor',
    3,
    'Kamel Ahmed',
    'كامل أحمد',
    'Shift Leader Valet',
    'مشرف وردية الفاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'lw-06',
    'laundryWorker',
    4,
    'Khaled El Sayed',
    'خالد السيد',
    'Valet Room Attendant',
    'عامل غرفة الفاليه',
    'Valet Department',
    'قسم الفاليه',
  ),
  e(
    'ws-01',
    'washingSupervisor',
    5,
    'Ahmed Shabban',
    'أحمد شعبان',
    'Senior Laundry Supervisor',
    'مشرف أول مغسلة',
    'Laundry Department',
    'قسم المغسلة',
  ),
  e(
    'ws-02',
    'washingSupervisor',
    6,
    'Tarik Ali',
    'طارق علي',
    'Lead Supervisor',
    'مشرف رئيسي',
    'Laundry',
    'المغسلة',
  ),
  e(
    'wts-02',
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
    'dm-03',
    'departmentManager',
    8,
    'Mustafa Mohamed',
    'مصطفى محمد',
    'Senior Linen Supervisor',
    'مشرف أول لينين',
    'Linen Room',
    'غرفة اللينين',
  ),
  e(
    'lw-01',
    'laundryWorker',
    9,
    'Abdallah Ahmed',
    'عبدالله أحمد',
    'Linen Room Attendant',
    'عامل غرفة اللينين',
    'Linen Room',
    'غرفة اللينين',
  ),
  e(
    'wts-03',
    'washingTeamSupervisor',
    10,
    'Ashraf ElSayed',
    'أشرف السيد',
    'Shift Leader Iron',
    'مشرف وردية المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'lw-02',
    'laundryWorker',
    11,
    'Adel Salah',
    'عادل صلاح',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'lw-03',
    'laundryWorker',
    12,
    'Mohamed Abdul Nabi',
    'محمد عبد النبي',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'lw-04',
    'laundryWorker',
    13,
    'Mohamed Salama',
    'محمد سلامة',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'lw-05',
    'laundryWorker',
    14,
    'Eslam Abdulaziz',
    'إسلام عبدالعزيز',
    'Iron Room Attendant',
    'عامل غرفة المكواة',
    'Iron Room',
    'غرفة المكواة',
  ),
  e(
    'lw-07',
    'laundryWorker',
    15,
    'Mohamed Mosalam',
    'محمد مسلم',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'lw-08',
    'laundryWorker',
    16,
    'Ahmed Mohamed',
    'أحمد محمد',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'lw-09',
    'laundryWorker',
    17,
    'Ahmed Ali',
    'أحمد علي',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e(
    'lw-10',
    'laundryWorker',
    18,
    'Mohamed Mostafa',
    'محمد مصطفى',
    'Chest Ironers Attendant',
    'عامل جندرة',
    'Chest Ironers',
    'الجندرة',
  ),
  e('tl-01', 'tailor', 19, 'Mohamed Saeed', 'محمد سعيد', 'Tailor', 'ترزي', 'Tailor', 'الترزي'),
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
