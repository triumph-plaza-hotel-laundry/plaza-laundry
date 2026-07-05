import { useCallback } from 'react';
import { fabricsRepository, type LaundryFabric } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useFabrics() {
  const fabrics = useSyncStore(fabricsRepository);
  const { assertCan, logAction } = useAuth();

  const createFabric = useCallback(
    (fabric: LaundryFabric) => {
      assertCan('fabrics', 'create');
      const created = fabricsRepository.create(fabric);
      logAction({ action: 'fabrics.create', page: 'fabrics', newValue: created });
      return created;
    },
    [assertCan, logAction],
  );

  const updateFabric = useCallback(
    (id: string, next: LaundryFabric) => {
      assertCan('fabrics', 'update');
      const oldValue = fabricsRepository.getById(id);
      const updated = fabricsRepository.update(id, next);
      logAction({ action: 'fabrics.update', page: 'fabrics', oldValue, newValue: updated });
      return updated;
    },
    [assertCan, logAction],
  );

  const deleteFabric = useCallback(
    (id: string) => {
      assertCan('fabrics', 'delete');
      const oldValue = fabricsRepository.getById(id);
      fabricsRepository.remove(id);
      logAction({ action: 'fabrics.delete', page: 'fabrics', oldValue });
    },
    [assertCan, logAction],
  );

  return { fabrics, createFabric, updateFabric, deleteFabric };
}
