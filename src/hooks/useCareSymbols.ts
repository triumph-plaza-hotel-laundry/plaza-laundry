import { careSymbolsRepository } from '@/data/repositories';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useCareSymbols() {
  const careLabels = useSyncStore(careSymbolsRepository);
  return { careLabels };
}
