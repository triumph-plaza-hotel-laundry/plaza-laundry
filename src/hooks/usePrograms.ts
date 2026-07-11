import { useCallback } from 'react';
import { programsRepository, type WashingProgram } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function usePrograms() {
  const programs = useSyncStore(programsRepository);
  const { assertCan, logAction } = useAuth();

  const createProgram = useCallback(
    (program: WashingProgram) => {
      assertCan('programs', 'create');
      const created = programsRepository.create(program);
      logAction({
        action: 'programs.create',
        page: 'programs',
        newValue: created,
      });
      return created;
    },
    [assertCan, logAction],
  );

  const updateProgram = useCallback(
    (id: number, next: WashingProgram) => {
      assertCan('programs', 'update');
      const oldValue = programsRepository.getById(id);
      const updated = programsRepository.update(id, next);
      logAction({
        action: 'programs.update',
        page: 'programs',
        oldValue,
        newValue: updated,
      });
      return updated;
    },
    [assertCan, logAction],
  );

  const deleteProgram = useCallback(
    (id: number) => {
      assertCan('programs', 'delete');
      const oldValue = programsRepository.getById(id);
      programsRepository.remove(id);
      logAction({ action: 'programs.delete', page: 'programs', oldValue });
    },
    [assertCan, logAction],
  );

  return { programs, createProgram, updateProgram, deleteProgram };
}
