import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createInventoryItem,
  fetchInventorySnapshot,
  getCachedInventorySnapshot,
  invalidateInventoryCache,
  issueInventoryItems,
  permanentlyDeleteInventoryItem,
  receiveInventoryItems,
  setInventoryItemEnabled,
  subscribeInventoryChanges,
  updateInventoryItem,
  updateInventoryItemQuantity,
  applyInventoryQuantityUpdate,
  type CreateInventoryItemInput,
  type InventoryItem,
  type InventoryItemsScope,
  type InventoryQuantityField,
  type InventoryTransaction,
  type IssueItemsInput,
  type ReceiveItemsInput,
  type UpdateInventoryItemInput,
} from '@/features/inventory';

export type InventoryToastState = {
  message: string;
  tone: 'success' | 'error';
} | null;

const REALTIME_REFRESH_DEBOUNCE_MS = 350;

type UseInventoryManagementOptions = {
  itemsScope?: InventoryItemsScope;
};

export function useInventoryManagement(
  options?: UseInventoryManagementOptions,
) {
  const itemsScope = options?.itemsScope ?? 'active';
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<InventoryToastState>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const activeItems = useMemo(
    () => items.filter((item) => !item.disabledAt),
    [items],
  );

  const refresh = useCallback(
    async (refreshOptions?: { force?: boolean }) => {
      const snapshot = await fetchInventorySnapshot({
        ...refreshOptions,
        itemsScope,
      });
      setItems(snapshot.items);
      setTransactions(snapshot.transactions);
    },
    [itemsScope],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError(null);

      const cached = getCachedInventorySnapshot(itemsScope);
      if (cached && active) {
        setItems(cached.items);
        setTransactions(cached.transactions);
        setIsReady(true);
      }

      try {
        await refresh({ force: Boolean(cached) });
        if (active && !cached) {
          setIsReady(true);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Failed to load inventory.',
          );
          setIsReady(true);
        }
      }
    };

    void load();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        invalidateInventoryCache();
        void refresh({ force: true }).catch((caught) => {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Failed to refresh inventory.',
          );
        });
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeInventoryChanges(scheduleRefresh);

    return () => {
      active = false;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      unsubscribe();
    };
  }, [itemsScope, refresh]);

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error') => {
      setToast({ message, tone });
      window.setTimeout(() => setToast(null), 3200);
    },
    [],
  );

  const requireActor = useCallback(() => {
    if (!user) {
      throw new Error('You must be signed in to manage inventory.');
    }
    return user;
  }, [user]);

  const receiveItems = useCallback(
    async (input: ReceiveItemsInput) => {
      setIsBusy(true);
      setError(null);
      try {
        await receiveInventoryItems(input);
        await refresh({ force: true });
        showToast('Items received successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Receive failed.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, showToast],
  );

  const issueItems = useCallback(
    async (input: IssueItemsInput) => {
      setIsBusy(true);
      setError(null);
      try {
        await issueInventoryItems(input);
        await refresh({ force: true });
        showToast('Items issued successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Issue failed.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, showToast],
  );

  const updateItemQuantity = useCallback(
    async (itemId: string, field: InventoryQuantityField, value: number) => {
      let previousItem: InventoryItem | undefined;

      setItems((current) => {
        const currentItem = current.find((item) => item.id === itemId);
        if (!currentItem) {
          return current;
        }

        previousItem = currentItem;
        const optimisticItem = applyInventoryQuantityUpdate(
          currentItem,
          field,
          value,
        );
        return current.map((item) =>
          item.id === itemId ? optimisticItem : item,
        );
      });

      if (!previousItem) {
        return;
      }

      setError(null);

      try {
        const savedItem = await updateInventoryItemQuantity({
          itemId,
          field,
          value,
        });
        setItems((current) =>
          current.map((item) => (item.id === itemId ? savedItem : item)),
        );
      } catch (caught) {
        const rollbackItem = previousItem;
        setItems((current) =>
          current.map((item) => (item.id === itemId ? rollbackItem : item)),
        );
        const message =
          caught instanceof Error
            ? caught.message
            : 'Failed to update quantity.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      }
    },
    [showToast],
  );

  const createItem = useCallback(
    async (input: CreateInventoryItemInput) => {
      const actor = requireActor();
      setIsBusy(true);
      setError(null);
      try {
        await createInventoryItem(actor.id, input, actor);
        await refresh({ force: true });
        showToast('Item added successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Failed to add item.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, requireActor, showToast],
  );

  const updateItem = useCallback(
    async (itemId: string, input: UpdateInventoryItemInput) => {
      const actor = requireActor();
      setIsBusy(true);
      setError(null);
      try {
        await updateInventoryItem(actor.id, itemId, input, actor);
        await refresh({ force: true });
        showToast('Item updated successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Failed to update item.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, requireActor, showToast],
  );

  const setItemEnabled = useCallback(
    async (itemId: string, enabled: boolean) => {
      const actor = requireActor();
      setIsBusy(true);
      setError(null);
      try {
        await setInventoryItemEnabled(actor.id, itemId, enabled, actor);
        await refresh({ force: true });
        showToast(
          enabled
            ? 'Item enabled successfully.'
            : 'Item disabled successfully.',
          'success',
        );
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'Failed to update item status.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, requireActor, showToast],
  );

  const deleteItemPermanently = useCallback(
    async (itemId: string) => {
      const actor = requireActor();
      setIsBusy(true);
      setError(null);
      try {
        await permanentlyDeleteInventoryItem(actor.id, itemId, actor);
        await refresh({ force: true });
        showToast('Item permanently deleted.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Failed to delete item.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, requireActor, showToast],
  );

  return {
    items,
    activeItems,
    transactions,
    isReady,
    isBusy,
    error,
    toast,
    receiveItems,
    issueItems,
    updateItemQuantity,
    createItem,
    updateItem,
    setItemEnabled,
    deleteItemPermanently,
    refresh,
  };
}
