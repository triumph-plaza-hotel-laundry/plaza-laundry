import {
  assertPrimaryAdminSessionImmutable,
  isPrimaryAdminAccount,
} from '@/features/auth/owner-protection';
import type { AuthSession, AuthUser } from '@/features/auth/types';

const SESSION_STORAGE_KEY = 'tpl-auth-session';

function normalizeSessionUser(user: AuthUser): AuthUser {
  const withDefaults: AuthUser = {
    ...user,
    isActive: user.isActive ?? true,
    adminType: user.adminType ?? 'Admin',
  };

  if (isPrimaryAdminAccount(withDefaults)) {
    return assertPrimaryAdminSessionImmutable(withDefaults);
  }

  return withDefaults;
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.user?.role) {
      return null;
    }

    return {
      ...parsed,
      user: normalizeSessionUser(parsed.user),
    };
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      ...session,
      user: normalizeSessionUser(session.user),
    }),
  );
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function toAuthUser(user: AuthUser): AuthUser {
  return normalizeSessionUser(user);
}
