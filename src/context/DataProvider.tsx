import { useEffect, type ReactNode } from 'react';
import { syncMissingSeedEmployees } from '@/data/repositories/employees-repository';
import { initAllRepositories } from '@/data/repositories/repository-utils';

type DataProviderProps = {
  children: ReactNode;
};

export function DataProvider({ children }: DataProviderProps) {
  useEffect(() => {
    void (async () => {
      await initAllRepositories();
      await syncMissingSeedEmployees();
    })();
  }, []);

  return children;
}
