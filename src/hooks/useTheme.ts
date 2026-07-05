import { useSyncExternalStore } from 'react';
import {
  getServerThemeSnapshot,
  getTheme,
  setTheme,
  subscribeToTheme,
  toggleTheme,
} from '@/lib/theme';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerThemeSnapshot);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
