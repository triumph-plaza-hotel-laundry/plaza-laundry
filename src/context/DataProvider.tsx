import { useEffect, type ReactNode } from 'react';
import { initAllRepositories } from '@/data/repositories/repository-utils';

type DataProviderProps = {
  children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
  useEffect(() => {
    void initAllRepositories();
  }, []);

  return children;
}
