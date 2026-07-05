import { stainsRepository } from '@/data/repositories';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useStains() {
  const stains = useSyncStore(stainsRepository);
  return { stains };
}
