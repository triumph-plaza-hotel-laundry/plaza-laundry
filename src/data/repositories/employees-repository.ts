import {
  laundryEmployees,
  type EmployeeTier,
  type LaundryEmployee,
} from '@/data/laundry-employees';
import { inferEmployeeTierFromPosition } from '@/lib/employee-org-hierarchy';
import { getLocalizedBirthDate } from '@/lib/birthday-utils';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';
import {
  isPermanentEmployeeId,
  resolvePermanentEmployeeId,
} from '@/lib/employee-permanent-id';
import { migrateEmployeesToPermanentIds } from '@/lib/migrate-employee-ids';

export type {
  EmployeeTier,
  EmployeeStatus,
  LaundryEmployee,
} from '@/data/laundry-employees';
export { employeeHierarchy } from '@/data/laundry-employees';

const emptyLocalized = () => ({ en: '', ar: '' });

function normalizeJobTitle(value: string) {
  return value.trim().toLowerCase();
}

function shouldRefreshSeedEmployee(
  existing: LaundryEmployee,
  seed: LaundryEmployee,
) {
  if (existing.id !== seed.id) {
    return false;
  }

  return (
    normalizeJobTitle(existing.jobTitle.en) === 'laundry supervisor' &&
    normalizeJobTitle(seed.jobTitle.en) === 'lead supervisor'
  );
}

function mergeSeedEmployee(
  existing: LaundryEmployee,
  seed: LaundryEmployee,
): LaundryEmployee {
  const normalized = normalizeEmployee(seed);

  return {
    ...normalized,
    phone: existing.phone,
    salary: existing.salary,
    hireDate: existing.hireDate,
    notes: existing.notes,
    dateOfBirth: existing.dateOfBirth,
    shift: existing.shift,
    status: existing.status,
  };
}

export function normalizeEmployee(
  raw: Partial<LaundryEmployee>,
): LaundryEmployee {
  const jobTitle = raw.jobTitle ?? emptyLocalized();
  const tier = jobTitle.en.trim()
    ? inferEmployeeTierFromPosition(jobTitle.en, raw.tier)
    : (raw.tier ?? 'laundryWorker');

  const resolvedId = resolvePermanentEmployeeId(
    String(raw.id ?? '').trim() || String(raw.employeeId ?? '').trim(),
  );
  const id =
    resolvedId ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `pending-${Date.now()}`);

  // Permanent Employee ID is the only identity — employeeId mirrors id.
  const employeeId = isPermanentEmployeeId(id)
    ? id
    : (raw.employeeId ?? '').trim() || id;

  return {
    id,
    employeeId,
    tier,
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    sortOrder: raw.sortOrder ?? 0,
    name: raw.name ?? emptyLocalized(),
    jobTitle,
    phone: raw.phone ?? '',
    dateOfBirth: getLocalizedBirthDate(raw.dateOfBirth),
    department: raw.department ?? emptyLocalized(),
    shift: raw.shift ?? emptyLocalized(),
    salary: raw.salary ?? '',
    hireDate: raw.hireDate ?? emptyLocalized(),
    notes: raw.notes ?? emptyLocalized(),
  };
}

const store = createLocalStore<LaundryEmployee[]>({
  key: STORAGE_KEYS.employees,
  seed: () => [...laundryEmployees],
  normalize(parsed, seed) {
    if (!Array.isArray(parsed)) {
      return seed;
    }

    const normalized = parsed.map((entry) =>
      normalizeEmployee(
        typeof entry === 'object' && entry
          ? (entry as Partial<LaundryEmployee>)
          : {},
      ),
    );

    return migrateEmployeesToPermanentIds(normalized).employees;
  },
});

registerRepository(STORAGE_KEYS.employees, store);

export const employeesRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  flush: store.flush,
  hydrate: store.hydrate,
  getAll: store.getSnapshot,
  getById(id: string) {
    const resolved = resolvePermanentEmployeeId(id);
    return store
      .getSnapshot()
      .find(
        (employee) =>
          employee.id === resolved ||
          employee.id === id ||
          employee.employeeId === resolved ||
          employee.employeeId === id,
      );
  },
  create(item: LaundryEmployee) {
    const current = store.getSnapshot();
    const normalized = normalizeEmployee(item);
    if (!isPermanentEmployeeId(normalized.id)) {
      throw new Error('Employee ID must be a permanent EMP-XXXX value');
    }
    if (current.some((entry) => entry.id === normalized.id)) {
      throw new Error('Record already exists');
    }

    store.replaceState([normalized, ...current]);
    return normalized;
  },
  update(id: string, next: LaundryEmployee) {
    const current = store.getSnapshot();
    const resolved = resolvePermanentEmployeeId(id);
    const index = current.findIndex(
      (entry) => entry.id === resolved || entry.id === id,
    );

    if (index === -1) {
      throw new Error('Record not found');
    }

    const existing = current[index]!;
    // Permanent Employee ID is immutable — never allow edit/replace of id.
    const locked: LaundryEmployee = {
      ...normalizeEmployee(next),
      id: existing.id,
      employeeId: existing.id,
    };

    const updated = [...current];
    updated[index] = locked;
    store.replaceState(updated);
    return locked;
  },
  remove(id: string) {
    const current = store.getSnapshot();
    const resolved = resolvePermanentEmployeeId(id);
    const next = current.filter(
      (entry) => entry.id !== resolved && entry.id !== id,
    );

    if (next.length === current.length) {
      throw new Error('Record not found');
    }

    // Delete does not renumber remaining EMP-XXXX ids.
    store.replaceState(next);
  },
  replaceAll(items: LaundryEmployee[]) {
    store.replaceState(
      migrateEmployeesToPermanentIds(items.map((item) => normalizeEmployee(item)))
        .employees,
    );
    return store.flush();
  },
};

export async function syncMissingSeedEmployees(): Promise<number> {
  await employeesRepository.hydrate();

  const current = employeesRepository.getSnapshot();
  const next = [...current];
  let changed = 0;

  for (const seed of laundryEmployees) {
    const index = next.findIndex((employee) => employee.id === seed.id);

    if (index === -1) {
      next.push(normalizeEmployee(seed));
      changed += 1;
      continue;
    }

    const existing = next[index]!;
    if (shouldRefreshSeedEmployee(existing, seed)) {
      next[index] = mergeSeedEmployee(existing, seed);
      changed += 1;
    }
  }

  if (changed === 0) {
    return 0;
  }

  await employeesRepository.replaceAll(next);
  await employeesRepository.flush();

  return changed;
}

export function getEmployeesByTier(tier: EmployeeTier): LaundryEmployee[] {
  return employeesRepository
    .getSnapshot()
    .filter((employee) => employee.tier === tier);
}

export function getEmployeeById(id: string): LaundryEmployee | undefined {
  return employeesRepository.getById(id);
}
