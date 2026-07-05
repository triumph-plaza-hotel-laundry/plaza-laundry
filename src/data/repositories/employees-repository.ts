import { laundryEmployees, type EmployeeTier, type LaundryEmployee } from '@/data/laundry-employees';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type { EmployeeTier, LaundryEmployee } from '@/data/laundry-employees';
export { employeeHierarchy } from '@/data/laundry-employees';

const emptyLocalized = () => ({ en: '', ar: '' });

export function normalizeEmployee(raw: Partial<LaundryEmployee>): LaundryEmployee {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    employeeId: raw.employeeId ?? '',
    tier: raw.tier ?? 'laundryWorker',
    sortOrder: raw.sortOrder ?? 0,
    name: raw.name ?? emptyLocalized(),
    jobTitle: raw.jobTitle ?? emptyLocalized(),
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

export function getEmployeesByTier(tier: EmployeeTier): LaundryEmployee[] {
  return employeesRepository.getSnapshot().filter((employee) => employee.tier === tier);
}

export function getEmployeeById(id: string): LaundryEmployee | undefined {
  return employeesRepository.getById(id);
}
