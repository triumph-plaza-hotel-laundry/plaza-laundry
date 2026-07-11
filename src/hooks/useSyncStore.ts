import { useSyncExternalStore } from 'react';

type SyncStore<T> = {
  getSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
};

export function useSyncStore<T>(store: SyncStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
