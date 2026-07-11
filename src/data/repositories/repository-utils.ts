import { createLocalStore, type LocalStore } from '@/lib/data-store';

type CatalogEntity = { id: string | number };

export function createCatalogRepository<T extends CatalogEntity>(config: {
  key: string;
  seed: () => readonly T[];
  store?: LocalStore<T[]>;
}) {
  const store =
    config.store ??
    createLocalStore<T[]>({
      key: config.key,
      seed: () => [...config.seed()],
      normalize(parsed, seed) {
        if (!Array.isArray(parsed)) {
          return seed;
        }

        return parsed as T[];
      },
    });

  const getById = (id: T['id']) =>
    store.getSnapshot().find((item) => item.id === id);

  return {
    store,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    reloadFromStorage: store.reloadFromStorage,
    flush: store.flush,
    hydrate: store.hydrate,
    getAll: store.getSnapshot,
    getById,
    create(item: T) {
      const current = store.getSnapshot();
      if (current.some((entry) => entry.id === item.id)) {
        throw new Error('Record already exists');
      }

      store.replaceState([item, ...current]);
      return item;
    },
    update(id: T['id'], next: T) {
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
    remove(id: T['id']) {
      const current = store.getSnapshot();
      const next = current.filter((entry) => entry.id !== id);

      if (next.length === current.length) {
        throw new Error('Record not found');
      }

      store.replaceState(next);
    },
    replaceAll(items: T[]) {
      store.replaceState([...items]);
      return store.flush();
    },
  };
}

const repositoryRegistry: Array<{
  key: string;
  reload: () => Promise<void>;
  hydrate: () => Promise<void>;
}> = [];

export function registerRepository(
  key: string,
  store: Pick<LocalStore<unknown>, 'reloadFromStorage' | 'hydrate'>,
) {
  if (!repositoryRegistry.some((entry) => entry.key === key)) {
    repositoryRegistry.push({
      key,
      reload: () => store.reloadFromStorage(),
      hydrate: () => store.hydrate(),
    });
  }
}

export function reloadRepositoryByKey(key: string) {
  const entry = repositoryRegistry.find((item) => item.key === key);
  return entry?.reload();
}

export async function initAllRepositories() {
  await Promise.all(repositoryRegistry.map((entry) => entry.hydrate()));
}

export async function persistRepositoryDraft<T>(
  repository: {
    replaceAll: (value: T) => Promise<void> | void;
    reloadFromStorage: () => Promise<void> | void;
  },
  value: T,
) {
  await repository.replaceAll(value);
  await repository.reloadFromStorage();
}
