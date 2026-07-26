/**
 * Permanent laundry Employee IDs (EMP-0001…).
 * Immutable after assignment — never renumber on edit/delete.
 */

export const EMPLOYEE_ID_PREFIX = 'EMP-';
export const EMPLOYEE_ID_PATTERN = /^EMP-(\d{4,})$/;

/** Legacy role-prefixed catalog ids → permanent Employee IDs (exact order). */
export const LEGACY_EMPLOYEE_ID_MAP: Readonly<Record<string, string>> = {
  'gm-01': 'EMP-0001', // Ahmed Debka
  'dm-01': 'EMP-0002', // Ramadan Mahmoud
  'ws-01': 'EMP-0003', // Ahmed Shaaban
  'dm-02': 'EMP-0004', // Mohamed Hamed
  'dm-03': 'EMP-0005', // Mostafa Mohamed
  'wts-01': 'EMP-0006', // Kamel Ahmed
  'tl-01': 'EMP-0007', // Mohamed Saeed
  'wts-02': 'EMP-0008', // Mohamed Sayed
  'wts-03': 'EMP-0009', // Ashraf El Sayed
  'ws-02': 'EMP-0010', // Tarek Ali
  'lw-06': 'EMP-0011', // Khaled El Sayed
  // Remaining seed staff — sequential after the reserved block
  'lw-01': 'EMP-0012', // Abdallah Ahmed
  'lw-02': 'EMP-0013', // Adel Salah
  'lw-03': 'EMP-0014', // Mohamed Abdul Nabi
  'lw-04': 'EMP-0015', // Mohamed Salama
  'lw-05': 'EMP-0016', // Eslam Abdulaziz
  'lw-07': 'EMP-0017', // Mohamed Mosalam
  'lw-08': 'EMP-0018', // Ahmed Mohamed
  'lw-09': 'EMP-0019', // Ahmed Ali
  'lw-10': 'EMP-0020', // Mohamed Mostafa
};

/** Managers by permanent Employee ID. */
export const MANAGER_PERMANENT_EMPLOYEE_IDS = [
  'EMP-0001',
  'EMP-0002',
] as const;

const SEQ_STORAGE_KEY = 'tpl-laundry-employee-id-next';

export function isPermanentEmployeeId(value: string | null | undefined): boolean {
  return EMPLOYEE_ID_PATTERN.test((value ?? '').trim());
}

export function parsePermanentEmployeeNumber(
  value: string | null | undefined,
): number | null {
  const match = EMPLOYEE_ID_PATTERN.exec((value ?? '').trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatPermanentEmployeeId(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('Employee ID number must be a positive integer');
  }
  return `${EMPLOYEE_ID_PREFIX}${String(n).padStart(4, '0')}`;
}

export function resolvePermanentEmployeeId(
  value: string | null | undefined,
): string {
  const raw = (value ?? '').trim();
  if (!raw) return raw;
  if (isPermanentEmployeeId(raw)) return raw;
  return LEGACY_EMPLOYEE_ID_MAP[raw] ?? raw;
}

export function remapEmployeeIdInText(value: string): string {
  const resolved = resolvePermanentEmployeeId(value);
  return resolved;
}

function readStoredSeq(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(SEQ_STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeStoredSeq(n: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SEQ_STORAGE_KEY, String(n));
  } catch {
    /* ignore quota */
  }
}

/** Highest EMP number already issued (employees + persisted counter). */
export function getHighestPermanentEmployeeNumber(
  employees: readonly { id: string; employeeId?: string }[],
): number {
  let max = 0;
  for (const employee of employees) {
    const a = parsePermanentEmployeeNumber(employee.id);
    const b = parsePermanentEmployeeNumber(employee.employeeId);
    if (a != null && a > max) max = a;
    if (b != null && b > max) max = b;
  }
  // Include legacy-mapped ceiling so counter never falls below seed block.
  for (const permanent of Object.values(LEGACY_EMPLOYEE_ID_MAP)) {
    const n = parsePermanentEmployeeNumber(permanent);
    if (n != null && n > max) max = n;
  }
  return Math.max(max, readStoredSeq());
}

/**
 * Allocate the next permanent Employee ID.
 * Never reuses a number (counter only increases; deletes do not renumber).
 */
export function allocateNextPermanentEmployeeId(
  employees: readonly { id: string; employeeId?: string }[],
): string {
  const next = getHighestPermanentEmployeeNumber(employees) + 1;
  writeStoredSeq(next);
  return formatPermanentEmployeeId(next);
}

/** Ensure counter is at least `n` (used after migrations). */
export function bumpPermanentEmployeeIdCounter(atLeast: number): void {
  const current = readStoredSeq();
  if (atLeast > current) {
    writeStoredSeq(atLeast);
  }
}
