import { createContext, useContext } from 'react';
import type { AuthUser, PermissionAction, PermissionResource, UserRole } from '@/features/auth/types';

export type AuthContextValue = {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (credentials: import('@/features/auth/login').LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  canManage: (resource: PermissionResource) => boolean;
  canAccessPath: (pathname: string) => boolean;
  canSeeNav: (resource: PermissionResource) => boolean;
  assertCan: (resource: PermissionResource, action: PermissionAction) => void;
  logAction: (input: {
    action: string;
    page: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) => void;
  permissionDeniedMessage: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
