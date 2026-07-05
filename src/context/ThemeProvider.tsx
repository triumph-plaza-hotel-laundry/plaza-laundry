import { useEffect, type ReactNode } from 'react';
import { initTheme } from '@/lib/theme';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    initTheme();
  }, []);

  return children;
}
