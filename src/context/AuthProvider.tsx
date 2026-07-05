import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { appendAuditLog } from '@/features/audit';
import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import { authenticateLogin, type LoginCredentials } from '@/features/auth/login';
import {
  assertPermission,
  canAccessRoute,
  canManageResource,
  canSeeNavigation,
  hasPermission,
  PERMISSION_DENIED,
} from '@/features/auth/permissions';
import { clearAuthSession, readAuthSession, writeAuthSession } from '@/features/auth/session';
import { ensureUsersStoreReady } from '@/features/auth/users';
import type { AuthSession, PermissionAction, PermissionResource } from '@/features/auth/types';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void ensureUsersStoreReady().finally(() => setIsReady(true));
  }, []);

  const user = session?.user ?? null;
  const role = user?.role ?? null;

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsReady(false);
    const nextUser = await authenticateLogin(credentials);
    const nextSession: AuthSession = {
      user: nextUser,
      signedInAt: new Date().toISOString(),
    };
    writeAuthSession(nextSession);
    setSession(nextSession);
    void appendAuditLog({
      user: nextUser,
      action: 'login',
      page: 'auth',
      newValue: { role: nextUser.role, username: nextUser.username },
    }).catch(() => undefined);
    setIsReady(true);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    if (user) {
      void appendAuditLog({
        user,
        action: 'logout',
        page: 'auth',
      }).catch(() => undefined);
    }

    clearAuthSession();
    setSession(null);
  }, [user]);

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction) => {
      if (!role) {
        return false;
      }

      return hasPermission(role, resource, action);
    },
    [role],
  );

  const canManage = useCallback(
    (resource: PermissionResource) => {
      if (!role) {
        return false;
      }

      return canManageResource(role, resource);
    },
    [role],
  );

  const canAccessPath = useCallback(
    (pathname: string) => {
      if (!role) {
        return false;
      }

      return canAccessRoute(role, pathname);
    },
    [role],
  );

  const canSeeNav = useCallback(
    (resource: PermissionResource) => {
      if (!role) {
        return false;
      }

      return canSeeNavigation(role, resource);
    },
    [role],
  );

  const assertCan = useCallback(
    (resource: PermissionResource, action: PermissionAction) => {
      if (!role) {
        throw new Error(PERMISSION_DENIED);
      }

      assertPermission(role, resource, action);
    },
    [role],
  );

  const logAction = useCallback(
    (input: { action: string; page: string; oldValue?: unknown; newValue?: unknown }) => {
      if (!user) {
        return;
      }

      void appendAuditLog({
        user,
        action: input.action,
        page: input.page,
        oldValue: input.oldValue,
        newValue: input.newValue,
      }).catch(() => {
        // Audit logging must not block UI actions.
      });
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isAuthenticated: Boolean(user),
      isReady,
      login,
      logout,
      can,
      canManage,
      canAccessPath,
      canSeeNav,
      assertCan,
      logAction,
      permissionDeniedMessage: PERMISSION_DENIED,
    }),
    [assertCan, can, canAccessPath, canManage, canSeeNav, isReady, logAction, login, logout, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

