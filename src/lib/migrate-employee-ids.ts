import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  allocateNextPermanentEmployeeId,
  bumpPermanentEmployeeIdCounter,
  formatPermanentEmployeeId,
  getHighestPermanentEmployeeNumber,
  isPermanentEmployeeId,
  resolvePermanentEmployeeId,
} from '@/lib/employee-permanent-id';

/**
 * Rewrite a laundry employee record onto a permanent EMP-XXXX id.
 * Does not allocate — use migrateEmployeesToPermanentIds for lists.
 */
export function applyPermanentIdToEmployee(
  employee: LaundryEmployee,
  permanentId: string,
): LaundryEmployee {
  return {
    ...employee,
    id: permanentId,
    employeeId: permanentId,
  };
}

/**
 * Migrate a catalog list to permanent Employee IDs.
 * - Legacy role codes → fixed EMP-0001… map
 * - Already permanent → keep (employeeId forced equal to id)
 * - Other custom ids (emp-<timestamp>, etc.) → next sequential EMP numbers
 * Never renumbers existing EMP-XXXX rows.
 */
export function migrateEmployeesToPermanentIds(
  employees: readonly LaundryEmployee[],
): { employees: LaundryEmployee[]; changed: boolean } {
  const migrated: LaundryEmployee[] = [];
  const seen = new Set<string>();
  let changed = false;
  let nextCustom =
    getHighestPermanentEmployeeNumber(employees) + 1;

  for (const raw of employees) {
    const resolvedFromLegacy = resolvePermanentEmployeeId(raw.id);
    let permanentId = resolvedFromLegacy;

    if (!isPermanentEmployeeId(permanentId)) {
      permanentId = formatPermanentEmployeeId(nextCustom);
      nextCustom += 1;
      changed = true;
    } else if (permanentId !== raw.id || raw.employeeId !== permanentId) {
      changed = true;
    }

    if (seen.has(permanentId)) {
      // Duplicate after remap — skip the later copy.
      changed = true;
      continue;
    }
    seen.add(permanentId);
    migrated.push(applyPermanentIdToEmployee(raw, permanentId));
  }

  bumpPermanentEmployeeIdCounter(
    getHighestPermanentEmployeeNumber(migrated),
  );

  return { employees: migrated, changed };
}

export function createEmployeeWithPermanentId(
  draft: Omit<LaundryEmployee, 'id' | 'employeeId'> &
    Partial<Pick<LaundryEmployee, 'id' | 'employeeId'>>,
  existing: readonly LaundryEmployee[],
): LaundryEmployee {
  const id = allocateNextPermanentEmployeeId(existing);
  return {
    ...draft,
    id,
    employeeId: id,
  } as LaundryEmployee;
}

/** Remap any string that may be a legacy or permanent employee id. */
export function remapStoredEmployeeId(value: string): string {
  return resolvePermanentEmployeeId(value);
}
