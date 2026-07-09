import { laundryEmployees, type EmployeeTier, type LaundryEmployee } from '@/data/laundry-employees';
import { inferEmployeeTierFromPosition } from '@/lib/employee-org-hierarchy';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type { EmployeeTier, EmployeeStatus, LaundryEmployee } from '@/data/laundry-employees';
export { employeeHierarchy } from '@/data/laundry-employees';

const emptyLocalized = () => ({ en: '', ar: '' });

function normalizeJobTitle(value: string) {
  return value.trim().toLowerCase();
}

function shouldRefreshSeedEmployee(existing: LaundryEmployee, seed: LaundryEmployee) {
  if (existing.id !== seed.id) {
    return false;
  }

  return (
    normalizeJobTitle(existing.jobTitle.en) === 'laundry supervisor' &&
    normalizeJobTitle(seed.jobTitle.en) === 'lead supervisor'
  );
}

function mergeSeedEmployee(existing: LaundryEmployee, seed: LaundryEmployee): LaundryEmployee {
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

export function normalizeEmployee(raw: Partial<LaundryEmployee>): LaundryEmployee {
  const jobTitle = raw.jobTitle ?? emptyLocalized();
  const tier = jobTitle.en.trim()
    ? inferEmployeeTierFromPosition(jobTitle.en, raw.tier)
    : (raw.tier ?? 'laundryWorker');

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    employeeId: (raw.employeeId ?? '').trim() || String(raw.id ?? '').trim(),
    tier,
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    sortOrder: raw.sortOrder ?? 0,
    name: raw.name ?? emptyLocalized(),
    jobTitle,
    phone: raw.phone ?? '',
    dateOfBirth: raw.dateOfBirth ?? emptyLocalized(),
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

    return parsed.map((entry) =>
      normalizeEmployee(typeof entry === 'object' && entry ? (entry as Partial<LaundryEmployee>) : {}),
    );
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
    return store.getSnapshot().find((employee) => employee.id === id);
  },
  create(item: LaundryEmployee) {
    const current = store.getSnapshot();
    if (current.some((entry) => entry.id === item.id)) {
      throw new Error('Record already exists');
    }

    store.replaceState([item, ...current]);
    return item;
  },
  update(id: string, next: LaundryEmployee) {
    const current = store.getSnapshot();
    const index = current.findIndex((entry) => entry.id === id);

    if (index === -1) {
      throw new Error('Record not found');
    }

    const updated = [...current];
    updated[index] = next;
    store.replaceState(updated);
    return next;
  },
  remove(id: string) {
    const current = store.getSnapshot();
    const next = current.filter((entry) => entry.id !== id);

    if (next.length === current.length) {
      throw new Error('Record not found');
    }

    store.replaceState(next);
  },
  replaceAll(items: LaundryEmployee[]) {
    store.replaceState([...items]);
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

    const existing = next[index];
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
  return employeesRepository.getSnapshot().filter((employee) => employee.tier === tier);
}

export function getEmployeeById(id: string): LaundryEmployee | undefined {
  return employeesRepository.getById(id);
}
