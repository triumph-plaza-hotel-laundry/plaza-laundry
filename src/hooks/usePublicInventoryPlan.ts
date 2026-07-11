import { useCallback, useEffect, useState } from 'react';
import type { PlanRowDrafts } from '@/features/inventory/monthly-archive-types';
import {
  loadPlanDocument,
  mergePlanRowDrafts,
  subscribePlanDocument,
} from '@/features/inventory/plan-document-service';
import { useDepartmentItemsCatalog } from '@/hooks/useDepartmentItems';

export function usePublicInventoryPlan() {
  const {
    items: catalog,
    categories,
    error: catalogError,
    isReady: catalogReady,
  } = useDepartmentItemsCatalog();
  const [rowDrafts, setRowDrafts] = useState<PlanRowDrafts | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const document = await loadPlanDocument(categories);
      setRowDrafts(mergePlanRowDrafts(document.rowDrafts, categories));
      setError(null);
    } catch (caught) {
      setRowDrafts(null);
      setError(
        caught instanceof Error ? caught.message : 'Failed to load plan.',
      );
    } finally {
      setIsReady(true);
    }
  }, [categories]);

  useEffect(() => {
    void refresh();

    const unsubscribe = subscribePlanDocument(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return {
    catalog,
    categories,
    rowDrafts,
    isReady: isReady && catalogReady,
    error: error ?? catalogError,
  };
}
