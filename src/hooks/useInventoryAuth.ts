import { useCallback, useState } from 'react';
import {
  clearInventorySession,
  isInventorySessionActive,
  startInventorySession,
  validateInventoryCredentials,
} from '@/features/inventory/inventory-auth';

export function useInventoryAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(isInventorySessionActive);

  const login = useCallback((username: string, password: string) => {
    if (!validateInventoryCredentials(username, password)) {
      return false;
    }

    startInventorySession();
    setIsAuthenticated(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    clearInventorySession();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
