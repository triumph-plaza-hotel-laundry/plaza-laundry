import type { EmployeeStatus, LaundryEmployee } from '@/data/laundry-employees';
import {
  isPermanentEmployeeId,
  resolvePermanentEmployeeId,
} from '@/lib/employee-permanent-id';

/** Display / search code — always the permanent Employee ID when present. */
export function getEmployeeCode(employee: LaundryEmployee): string {
  const id = employee.id.trim();
  if (isPermanentEmployeeId(id)) {
    return id;
  }
  const code = employee.employeeId.trim();
  if (isPermanentEmployeeId(code)) {
    return code;
  }
  return resolvePermanentEmployeeId(code || id) || id || '—';
}

export function getEmployeeStatus(employee: LaundryEmployee): EmployeeStatus {
  return employee.status ?? 'active';
}

export function getLocalizedDisplay(
  value: { en: string; ar: string },
  language: 'en' | 'ar',
): string {
  const primary = language === 'ar' ? value.ar : value.en;
  const fallback = language === 'ar' ? value.en : value.ar;
  return primary.trim() || fallback.trim() || '—';
}

export function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}
