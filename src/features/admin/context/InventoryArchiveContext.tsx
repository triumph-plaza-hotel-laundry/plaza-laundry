import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { InventoryPlanDocument } from '@/features/inventory/monthly-archive-types';
import {
  InventoryArchiveContext,
  type InventoryArchiveContextValue,
} from '@/features/admin/context/inventory-archive-context';
import {
  formatArchiveMonthLabel,
  getMonthlyArchive,
  syncMonthlyArchiveTransition,
} from '@/features/inventory/monthly-archive-service';
import { savePlanDocument } from '@/features/inventory/plan-document-service';
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
  const [viewingArchive, setViewingArchive] =
    useState<InventoryArchiveContextValue['viewingArchive']>(null);
  const [isReady, setIsReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const selectArchiveMonth = useCallback(async (monthKey: string) => {
    const archive = await getMonthlyArchive(monthKey);
    if (!archive) {
      return;
    }

    setViewingMonth(monthKey);
    setViewingArchive(archive);
    setDrawerOpen(false);
  }, []);

  const exitArchiveView = useCallback(() => {
    setViewingMonth(null);
    setViewingArchive(null);
  }, []);

  const savePlanDrafts = useCallback(
    async (rowDrafts: InventoryPlanDocument['rowDrafts']) => {
      if (!planDocument || viewingMonth) {
        return;
      }

      const nextDocument: InventoryPlanDocument = {
        workingMonth: planDocument.workingMonth,
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
      exitArchiveView,
      formatMonthLabel,
      isArchiveView: Boolean(viewingMonth),
      isReady,
      openDrawer,
      closeDrawer,
      planDocument,
      savePlanDrafts,
      selectArchiveMonth,
      syncError,
      viewingArchive,
      viewingMonth,
    }),
    [
      archiveMonths,
      currentMonth,
      drawerOpen,
      exitArchiveView,
      formatMonthLabel,
      isReady,
      openDrawer,
      closeDrawer,
      planDocument,
      savePlanDrafts,
      selectArchiveMonth,
      syncError,
      viewingArchive,
      viewingMonth,
    ],
  );

  return (
    <InventoryArchiveContext.Provider value={value}>
      {children}
    </InventoryArchiveContext.Provider>
  );
}
