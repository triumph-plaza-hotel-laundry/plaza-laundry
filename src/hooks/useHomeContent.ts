import { homeContentRepository } from '@/data/repositories';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useHomeContent() {
  const content = useSyncStore(homeContentRepository);
  return { content };
}
