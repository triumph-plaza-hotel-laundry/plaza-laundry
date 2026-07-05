import { defaultHomeContent, type HomeContentState } from '@/data/home-content';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type { HomeContentState } from '@/data/home-content';

function normalizeHomeContent(parsed: unknown, seed: HomeContentState): HomeContentState {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const partial = parsed as Partial<HomeContentState>;
  return {
    slogan: {
      en: partial.slogan?.en ?? seed.slogan.en,
      ar: partial.slogan?.ar ?? seed.slogan.ar,
    },
    featuredFabricIds: partial.featuredFabricIds ?? seed.featuredFabricIds,
  };
}

const store = createLocalStore<HomeContentState>({
  key: STORAGE_KEYS.homeContent,
  seed: () => defaultHomeContent,
  normalize: normalizeHomeContent,
});

registerRepository(STORAGE_KEYS.homeContent, store);

export const homeContentRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  get content() {
    return store.getSnapshot();
  },
  replaceAll(next: HomeContentState) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};
