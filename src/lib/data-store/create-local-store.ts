import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';

export type LocalStore<T> = {
  key: string;
  getSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  replaceState: (next: T) => void;
  updateState: (updater: (current: T) => T) => void;
  reloadFromStorage: () => Promise<void>;
  resetToSeed: () => Promise<void>;
  flush: () => Promise<void>;
  hydrate: () => Promise<void>;
};

type CreateLocalStoreOptions<T> = {
  key: string;
  seed: () => T;
  normalize?: (parsed: unknown, seed: T) => T;
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

export function createLocalStore<T>(
  options: CreateLocalStoreOptions<T>,
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let snapshot = options.seed();
  let hydrated = false;
  let hydratePromise: Promise<void> | null = null;
  let persistQueue = Promise.resolve();
  let realtimeCleanup: (() => void) | null = null;

  function emit() {
    listeners.forEach((listener) => listener());
  }

  async function fetchRemote(): Promise<T> {
    const client = requireSupabase();
    const seed = options.seed();
    const { data, error } = await client
      .from('app_data_documents')
      .select('data')
      .eq('document_key', options.key)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.data) {
      await persistRemote(seed);
      return seed;
    }

    return options.normalize
      ? options.normalize(data.data, seed)
      : (data.data as T);
  }

  async function persistRemote(next: T) {
    const client = requireSupabase();
    const { error } = await client.from('app_data_documents').upsert(
      {
        document_key: options.key,
        data: next as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'document_key' },
    );

    if (error) {
      throw error;
    }
  }

  function bindRealtime() {
    if (realtimeCleanup) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    const channel = client
      .channel(`app-data-${options.key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_data_documents',
          filter: `document_key=eq.${options.key}`,
        },
        () => {
          void reloadFromStorage();
        },
      )
      .subscribe();

    realtimeCleanup = () => {
      void client.removeChannel(channel);
      realtimeCleanup = null;
    };
  }

  async function reloadFromStorage() {
    const next = await fetchRemote();
    if (JSON.stringify(next) === JSON.stringify(snapshot)) {
      return;
    }

    snapshot = next;
    emit();
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
          console.error(`Failed to hydrate store ${options.key}:`, error);
        }
        snapshot = options.seed();
        hydrated = true;
        bindRealtime();
        emit();
      });
    }

    await hydratePromise;
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
        .catch(async () => {
          await reloadFromStorage();
          throw new Error('Failed to save data to Supabase');
        });
    },
    updateState(updater) {
      const next = updater(snapshot);
      snapshot = next;
      emit();
      persistQueue = persistQueue
        .then(() => persistRemote(next))
        .catch(async () => {
          await reloadFromStorage();
          throw new Error('Failed to save data to Supabase');
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
