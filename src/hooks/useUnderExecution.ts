import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearUnderExecutionHistory,
  createUnderExecutionRecord,
  deleteUnderExecutionRecord,
  listUnderExecutionHistory,
  listUnderExecutionRecords,
  subscribeUnderExecutionChanges,
  updateUnderExecutionRecord,
} from '@/features/inventory/under-execution-service';
import type {
  CreateUnderExecutionInput,
  UnderExecutionRecord,
  UpdateUnderExecutionInput,
} from '@/features/inventory/under-execution-types';
import { useAuth } from '@/hooks/useAuth';
import type { InventoryToastState } from '@/hooks/useInventoryManagement';

const REALTIME_REFRESH_DEBOUNCE_MS = 350;

export function useUnderExecution() {
  const { user } = useAuth();
  const [records, setRecords] = useState<UnderExecutionRecord[]>([]);
  const [history, setHistory] = useState<UnderExecutionRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<InventoryToastState>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error') => {
      setToast({ message, tone });
      window.setTimeout(() => setToast(null), 3200);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const [nextRecords, nextHistory] = await Promise.all([
      listUnderExecutionRecords(),
      listUnderExecutionHistory(),
    ]);
    setRecords(nextRecords);
    setHistory(nextHistory);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError(null);
      try {
        await refresh();
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Failed to load under execution records.',
          );
        }
      } finally {
        if (active) {
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
        void refresh().catch((caught) => {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Failed to refresh under execution records.',
          );
        });
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeUnderExecutionChanges(scheduleRefresh);

    return () => {
      active = false;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      unsubscribe();
    };
  }, [refresh]);

  const createRecord = useCallback(
    async (input: CreateUnderExecutionInput) => {
      setIsBusy(true);
      setError(null);
      try {
        await createUnderExecutionRecord(input);
        await refresh();
        showToast('Saved successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Save failed.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, showToast],
  );

  const updateRecord = useCallback(
    async (id: string, input: UpdateUnderExecutionInput) => {
      setIsBusy(true);
      setError(null);
      try {
        await updateUnderExecutionRecord(id, input);
        await refresh();
        showToast('Updated successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Update failed.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, showToast],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      setIsBusy(true);
      setError(null);
      try {
        await deleteUnderExecutionRecord(id);
        await refresh();
        showToast('Deleted successfully.', 'success');
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Delete failed.';
        setError(message);
        showToast(message, 'error');
        throw caught;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh, showToast],
  );

  const clearHistory = useCallback(async () => {
    if (!user) {
      throw new Error('Permission denied');
    }

    setIsBusy(true);
    setError(null);
    try {
      await clearUnderExecutionHistory(user);
      await refresh();
      showToast('History cleared successfully.', 'success');
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Clear history failed.';
      setError(message);
      showToast(message, 'error');
      throw caught;
    } finally {
      setIsBusy(false);
    }
  }, [refresh, showToast, user]);

  return {
    records,
    history,
    isReady,
    isBusy,
    error,
    toast,
    createRecord,
    updateRecord,
    deleteRecord,
    clearHistory,
    refresh,
  };
}
