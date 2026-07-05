import { useCallback } from 'react';
import { aiSettingsRepository, type AiSettings } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useAiSettings() {
  const settings = useSyncStore(aiSettingsRepository);
  const { assertCan, logAction } = useAuth();

  const updateSettings = useCallback(
    async (partial: Partial<AiSettings>) => {
      assertCan('admin', 'update');
      const oldValue = aiSettingsRepository.getSnapshot();
      aiSettingsRepository.update(partial);
      await aiSettingsRepository.flush();
      await aiSettingsRepository.reloadFromStorage();
      logAction({
        action: 'aiSettings.update',
        page: 'admin/ai',
        oldValue,
        newValue: aiSettingsRepository.getSnapshot(),
      });
    },
    [assertCan, logAction],
  );

  return { settings, updateSettings };
}
