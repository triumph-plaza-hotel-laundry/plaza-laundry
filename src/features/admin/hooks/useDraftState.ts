import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SyncStore<T> = {
  getSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  reloadFromStorage?: () => void | Promise<void>;
};

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function useDraftState<T>(store: SyncStore<T>) {
  const [draft, setDraft] = useState(() => cloneValue(store.getSnapshot()));
  const baselineRef = useRef(JSON.stringify(store.getSnapshot()));

  useEffect(() => {
    return store.subscribe(() => {
      const next = cloneValue(store.getSnapshot());
      const serialized = JSON.stringify(next);
      if (serialized !== baselineRef.current) {
        baselineRef.current = serialized;
        setDraft(next);
      }
    });
  }, [store]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== baselineRef.current,
    [draft],
  );

  const setField = useCallback((updater: (current: T) => T) => {
    setDraft((current) => updater(cloneValue(current)));
  }, []);

  const resetDraft = useCallback(() => {
    const snapshot = cloneValue(store.getSnapshot());
    baselineRef.current = JSON.stringify(snapshot);
    setDraft(snapshot);
  }, [store]);

  const commitDraft = useCallback(
    async (commit: (value: T) => void | Promise<void>) => {
      const value = cloneValue(draft);
      await commit(value);
      if (store.reloadFromStorage) {
        await store.reloadFromStorage();
      }
      baselineRef.current = JSON.stringify(store.getSnapshot());
      setDraft(cloneValue(store.getSnapshot()));
    },
    [draft, store],
  );

  return {
    draft,
    isDirty,
    setDraft,
    setField,
    resetDraft,
    commitDraft,
  };
}
