import { useCallback } from 'react';
import { chemicalsRepository, type LaundryChemical } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useChemicals() {
  const chemicals = useSyncStore(chemicalsRepository);
  const { assertCan, logAction } = useAuth();

  const createChemical = useCallback(
    (chemical: LaundryChemical) => {
      assertCan('chemicals', 'create');
      const created = chemicalsRepository.create(chemical);
      logAction({ action: 'chemicals.create', page: 'chemicals', newValue: created });
      return created;
    },
    [assertCan, logAction],
  );

  const updateChemical = useCallback(
    (id: number, next: LaundryChemical) => {
      assertCan('chemicals', 'update');
      const oldValue = chemicalsRepository.getById(id);
      const updated = chemicalsRepository.update(id, next);
      logAction({ action: 'chemicals.update', page: 'chemicals', oldValue, newValue: updated });
      return updated;
    },
    [assertCan, logAction],
  );

  const deleteChemical = useCallback(
    (id: number) => {
      assertCan('chemicals', 'delete');
      const oldValue = chemicalsRepository.getById(id);
      chemicalsRepository.remove(id);
      logAction({ action: 'chemicals.delete', page: 'chemicals', oldValue });
    },
    [assertCan, logAction],
  );

  return { chemicals, createChemical, updateChemical, deleteChemical };
}
