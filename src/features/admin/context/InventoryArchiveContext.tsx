import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { InventoryPlanDocument } from '@/features/inventory/monthly-archive-types';
import type { InventoryTransactionType } from '@/features/inventory/types';
import {
  InventoryArchiveContext,
  type InventoryArchiveContextValue,
} from '@/features/admin/context/inventory-archive-context';
import {
  clearMonthlyArchiveTransactions,
  formatArchiveEntryLabel,
  formatArchiveMonthLabel,
  getMonthlyArchive,
  syncMonthlyArchiveTransition,
} from '@/features/inventory/monthly-archive-service';
import { savePlanDocument } from '@/features/inventory/plan-document-service';
import { invalidateInventoryCache } from '@/features/inventory';
import { useLanguage } from '@/hooks';

export function InventoryArchiveProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiveMonths, setArchiveMonths] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [planDocument, setPlanDocument] =
    useState<InventoryPlanDocument | null>(null);
  const [viewingMonth, setViewingMonth] = useState<string | null>(null);
  const [viewingTransactionType, setViewingTransactionType] =
    useState<InventoryTransactionType | null>(null);
  const [viewingArchive, setViewingArchive] =
    useState<InventoryArchiveContextValue['viewingArchive']>(null);
  const [isReady, setIsReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [liveDataRevision, setLiveDataRevision] = useState(0);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setSyncError(null);

      try {
        const result = await syncMonthlyArchiveTransition();
        if (!active) {
          return;
        }

        setArchiveMonths(result.archiveMonths);
        setCurrentMonth(result.currentMonth);
        setPlanDocument(result.planDocument);
      } catch (error) {
        if (active) {
          setSyncError(
            error instanceof Error
              ? error.message
              : 'Failed to sync monthly archives.',
          );
        }
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const formatMonthLabel = useCallback(
    (monthKey: string) => formatArchiveMonthLabel(monthKey, language),
    [language],
  );

  const formatArchiveTypeLabel = useCallback(
    (monthKey: string, transactionType: InventoryTransactionType) =>
      formatArchiveEntryLabel(
        transactionType,
        formatArchiveMonthLabel(monthKey, language),
        language,
      ),
    [language],
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const selectArchiveMonth = useCallback(
    async (
      monthKey: string,
      transactionType: InventoryTransactionType,
    ) => {
      const archive = await getMonthlyArchive(monthKey);
      if (!archive) {
        return;
      }

      setViewingMonth(monthKey);
      setViewingTransactionType(transactionType);
      setViewingArchive(archive);
      setDrawerOpen(false);
    },
    [],
  );

  const exitArchiveView = useCallback(() => {
    setViewingMonth(null);
    setViewingTransactionType(null);
    setViewingArchive(null);
    invalidateInventoryCache();
    setLiveDataRevision((current) => current + 1);
  }, []);

  const deleteArchiveTransactions = useCallback(
    async (
      monthKey: string,
      transactionType: InventoryTransactionType,
    ) => {
      const updated = await clearMonthlyArchiveTransactions(
        monthKey,
        transactionType,
      );

      if (
        viewingMonth === monthKey &&
        viewingTransactionType === transactionType
      ) {
        exitArchiveView();
        return;
      }

      if (viewingMonth === monthKey && updated) {
        setViewingArchive(updated);
      }
    },
    [exitArchiveView, viewingMonth, viewingTransactionType],
  );

  const ensureArchiveSynced = useCallback(async () => {
    const result = await syncMonthlyArchiveTransition();
    setArchiveMonths(result.archiveMonths);
    setCurrentMonth(result.currentMonth);
    setPlanDocument(result.planDocument);
  }, []);

  const savePlanDrafts = useCallback(
    async (rowDrafts: InventoryPlanDocument['rowDrafts']) => {
      if (!planDocument || viewingMonth) {
        return;
      }

      const syncResult = await syncMonthlyArchiveTransition();
      setArchiveMonths(syncResult.archiveMonths);
      setCurrentMonth(syncResult.currentMonth);

      const nextDocument: InventoryPlanDocument = {
        workingMonth: syncResult.planDocument.workingMonth,
        rowDrafts,
      };

      await savePlanDocument(nextDocument);
      setPlanDocument(nextDocument);
    },
    [planDocument, viewingMonth],
  );

  const value = useMemo<InventoryArchiveContextValue>(
    () => ({
      archiveMonths,
      currentMonth,
      drawerOpen,
      ensureArchiveSynced,
      exitArchiveView,
      formatMonthLabel,
      formatArchiveTypeLabel,
      isArchiveView: Boolean(viewingMonth && viewingTransactionType),
      isReady,
      liveDataRevision,
      openDrawer,
      closeDrawer,
      planDocument,
      savePlanDrafts,
      selectArchiveMonth,
      deleteArchiveTransactions,
      syncError,
      viewingArchive,
      viewingMonth,
      viewingTransactionType,
    }),
    [
      archiveMonths,
      currentMonth,
      drawerOpen,
      ensureArchiveSynced,
      exitArchiveView,
      formatMonthLabel,
      formatArchiveTypeLabel,
      isReady,
      liveDataRevision,
      openDrawer,
      closeDrawer,
      planDocument,
      savePlanDrafts,
      selectArchiveMonth,
      deleteArchiveTransactions,
      syncError,
      viewingArchive,
      viewingMonth,
      viewingTransactionType,
    ],
  );

  return (
    <InventoryArchiveContext.Provider value={value}>
      {children}
    </InventoryArchiveContext.Provider>
  );
}
