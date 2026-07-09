import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchInventorySnapshot,
  getCachedInventorySnapshot,
  invalidateInventoryCache,
  issueInventoryItems,
  receiveInventoryItems,
  subscribeInventoryChanges,
  updateInventoryItemQuantity,
  applyInventoryQuantityUpdate,
  type InventoryItem,
  type InventoryQuantityField,
  type InventoryTransaction,
  type IssueItemsInput,
  type ReceiveItemsInput,
} from '@/features/inventory';

export type InventoryToastState = {
  message: string;
  tone: 'success' | 'error';
} | null;

const REALTIME_REFRESH_DEBOUNCE_MS = 350;

export function useInventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<InventoryToastState>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const snapshot = await fetchInventorySnapshot(options);
    setItems(snapshot.items);
    setTransactions(snapshot.transactions);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError(null);

      const cached = getCachedInventorySnapshot();
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
          setError(caught instanceof Error ? caught.message : 'Failed to load inventory.');
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
        void refresh({ force: true }).catch(() => {});
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
  }, [refresh]);

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const receiveItems = useCallback(
    async (input: ReceiveItemsInput) => {
      setIsBusy(true);
      setError(null);
      try {
        await receiveInventoryItems(input);
        await refresh({ force: true });
        showToast('Items received successfully.', 'success');
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Receive failed.';
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
        const message = caught instanceof Error ? caught.message : 'Issue failed.';
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
        const optimisticItem = applyInventoryQuantityUpdate(currentItem, field, value);
        return current.map((item) => (item.id === itemId ? optimisticItem : item));
      });

      if (!previousItem) {
        return;
      }

      setError(null);

      try {
        const savedItem = await updateInventoryItemQuantity({ itemId, field, value });
        setItems((current) => current.map((item) => (item.id === itemId ? savedItem : item)));
      } catch (caught) {
        const rollbackItem = previousItem;
        setItems((current) => current.map((item) => (item.id === itemId ? rollbackItem : item)));
        const message = caught instanceof Error ? caught.message : 'Failed to update quantity.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      }
    },
    [showToast],
  );

  return {
    items,
    transactions,
    isReady,
    isBusy,
    error,
    toast,
    receiveItems,
    issueItems,
    updateItemQuantity,
    refresh,
  };
}
