import { useCallback, useEffect, useState } from 'react';
import type { PlanRowDrafts } from '@/features/inventory/monthly-archive-types';
import {
  loadPlanDocument,
  mergePlanRowDrafts,
  subscribePlanDocument,
} from '@/features/inventory/plan-document-service';

export function usePublicInventoryPlan() {
  const [rowDrafts, setRowDrafts] = useState<PlanRowDrafts | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const document = await loadPlanDocument();
      setRowDrafts(mergePlanRowDrafts(document.rowDrafts));
      setError(null);
    } catch (caught) {
      setRowDrafts(null);
      setError(caught instanceof Error ? caught.message : 'Failed to load plan.');
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = subscribePlanDocument(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return { rowDrafts, isReady, error };
}
