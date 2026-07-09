import { useEffect, useState } from 'react';
import { employeesRepository } from '@/data/repositories';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { shiftsHasSavedAssignments } from '@/lib/shift-schedule-utils';
import { useSyncStore } from '@/hooks/useSyncStore';

const HOME_SHIFT_PLAN_LOG_PREFIX = '[HomeShiftPlan]';

export function useHomeShiftPlan() {
  const shifts = useSyncStore(shiftsRepository);
  const employees = useSyncStore(employeesRepository);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await Promise.all([
          shiftsRepository.reloadFromStorage(),
          employeesRepository.reloadFromStorage(),
        ]);
        if (active) {
          setError(null);
        }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Failed to load shift plan from Supabase.';
        console.error(`${HOME_SHIFT_PLAN_LOG_PREFIX} ${message}`, caught);
        if (active) {
          const hasAssignments = shiftsHasSavedAssignments(shiftsRepository.getSnapshot());
          if (!hasAssignments) {
            setError(message);
          }
        }
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return { shifts, employees, isReady, error };
}
