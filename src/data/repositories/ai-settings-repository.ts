import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type AiSettings = {
  enabled: boolean;
  assistantName: string;
  systemPrompt: string;
  model: string;
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  assistantName: 'Laundry Assistant',
  systemPrompt: 'You are a helpful assistant for Triumph Plaza Hotel Laundry operations.',
  model: 'gpt-4o-mini',
};

function normalizeAiSettings(parsed: unknown, seed: AiSettings): AiSettings {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const value = parsed as Partial<AiSettings>;
  return {
    enabled: value.enabled ?? seed.enabled,
    assistantName: value.assistantName ?? seed.assistantName,
    systemPrompt: value.systemPrompt ?? seed.systemPrompt,
    model: value.model ?? seed.model,
  };
}

const store = createLocalStore<AiSettings>({
  key: STORAGE_KEYS.aiSettings,
  seed: () => DEFAULT_AI_SETTINGS,
  normalize: normalizeAiSettings,
});

registerRepository(STORAGE_KEYS.aiSettings, store);

export const aiSettingsRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  update(partial: Partial<AiSettings>) {
    const current = store.getSnapshot();
    store.replaceState({ ...current, ...partial });
  },
  replaceAll(next: AiSettings) {
    store.replaceState(next);
    return store.flush();
  },
  replace(next: AiSettings) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};
