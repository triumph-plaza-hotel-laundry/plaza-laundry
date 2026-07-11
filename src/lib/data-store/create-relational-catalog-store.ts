import { getSupabaseClient } from '@/lib/supabase/client';
import type { LocalStore } from '@/lib/data-store';

type CreateRelationalCatalogStoreOptions<T> = {
  key: string;
  seed: () => T[];
  fetchAll: () => Promise<T[]>;
  replaceAll: (items: T[]) => Promise<void>;
  realtimeTables: readonly string[];
};

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export function createRelationalCatalogStore<T>(
  options: CreateRelationalCatalogStoreOptions<T>,
): LocalStore<T[]> {
  const listeners = new Set<() => void>();
  let snapshot = options.seed();
  let hydrated = false;
  let hydratePromise: Promise<void> | null = null;
  let persistQueue = Promise.resolve();
  let realtimeCleanup: (() => void) | null = null;
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  function emit() {
    listeners.forEach((listener) => listener());
  }

  async function fetchRemote(): Promise<T[]> {
    const items = await options.fetchAll();
    if (items.length === 0) {
      const seed = options.seed();
      if (seed.length > 0) {
        await options.replaceAll(seed);
        return seed;
      }
    }
    return items;
  }

  function bindRealtime() {
    if (realtimeCleanup) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    const channel = client.channel(`relational-catalog-${options.key}`);

    options.realtimeTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          if (reloadTimer) {
            clearTimeout(reloadTimer);
          }
          reloadTimer = setTimeout(() => {
            void reloadFromStorage();
          }, 200);
        },
      );
    });

    channel.subscribe();
    realtimeCleanup = () => {
      if (reloadTimer) {
        clearTimeout(reloadTimer);
        reloadTimer = null;
      }
      void client.removeChannel(channel);
      realtimeCleanup = null;
    };
  }

  async function reloadFromStorage() {
    try {
      const next = await options.fetchAll();
      if (JSON.stringify(next) === JSON.stringify(snapshot)) {
        return;
      }
      snapshot = next;
      emit();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(
          `Failed to reload relational store ${options.key}:`,
          error,
        );
      }
    }
  }

  async function hydrate() {
    if (hydrated) {
      return;
    }

    if (!hydratePromise) {
      hydratePromise = (async () => {
        snapshot = await fetchRemote();
        hydrated = true;
        bindRealtime();
        emit();
      })().catch((error) => {
        if (import.meta.env.DEV) {
          console.error(
            `Failed to hydrate relational store ${options.key}:`,
            error,
          );
        }
        snapshot = options.seed();
        hydrated = true;
        bindRealtime();
        emit();
      });
    }

    await hydratePromise;
  }

  async function persistRemote(next: T[]) {
    await options.replaceAll(next);
  }

  return {
    key: options.key,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      void hydrate();
      return () => listeners.delete(listener);
    },
    replaceState(next) {
      snapshot = next;
      emit();
      persistQueue = persistQueue
        .then(() => persistRemote(next))
        .catch(async (error) => {
          await reloadFromStorage();
          throw error instanceof Error
            ? error
            : new Error('Failed to save data to Supabase');
        });
    },
    updateState(updater) {
      const next = updater(snapshot);
      snapshot = next;
      emit();
      persistQueue = persistQueue
        .then(() => persistRemote(next))
        .catch(async (error) => {
          await reloadFromStorage();
          throw error instanceof Error
            ? error
            : new Error('Failed to save data to Supabase');
        });
    },
    reloadFromStorage,
    async resetToSeed() {
      const seed = options.seed();
      snapshot = seed;
      emit();
      persistQueue = persistQueue.then(() => persistRemote(seed));
      await persistQueue;
    },
    flush() {
      return persistQueue;
    },
    hydrate,
  };
}

export { requireSupabase };
