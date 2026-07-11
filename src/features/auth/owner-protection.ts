import type { AuthUser } from '@/features/auth/types';

export const PRIMARY_ADMIN_ID = 'primary-admin-kamel';
export const PRIMARY_ADMIN_USERNAME = 'kamel ahmed';
export const PRIMARY_ADMIN_DISPLAY_NAME = 'Kamel Ahmed';
export const PRIMARY_ADMIN_PASSWORD_HASH =
  'pbkdf2:120000:BJ7QWMnterdTFKAsi80DKg==:r5xd5ArU5KkrI+VlboGPYpRXO/srt6l83ZId01qjooA=';

/** @deprecated Use PRIMARY_ADMIN_ID */
export const OWNER_USER_ID = PRIMARY_ADMIN_ID;

/** @deprecated Use PRIMARY_ADMIN_USERNAME */
export const OWNER_USERNAME = PRIMARY_ADMIN_USERNAME;

export function isPrimaryAdminAccount(
  user: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>,
): boolean {
  return (
    user.isOwner ||
    user.isProtected ||
    user.id === PRIMARY_ADMIN_ID ||
    user.username.trim().toLowerCase() === PRIMARY_ADMIN_USERNAME
  );
}

/** @deprecated Use isPrimaryAdminAccount */
export function isOwnerAccount(
  user: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>,
): boolean {
  return isPrimaryAdminAccount(user);
}

export const PRIMARY_ADMIN_PROTECTED_MESSAGE =
  'Primary administrator account is permanently protected';

/** @deprecated Use PRIMARY_ADMIN_PROTECTED_MESSAGE */
export const OWNER_PROTECTED_MESSAGE = PRIMARY_ADMIN_PROTECTED_MESSAGE;

export function assertPrimaryAdminProtected(
  target: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>,
): void {
  if (!isPrimaryAdminAccount(target)) {
    return;
  }

  throw new Error(PRIMARY_ADMIN_PROTECTED_MESSAGE);
}

/** @deprecated Use assertPrimaryAdminProtected */
export function assertOwnerAccountProtected(
  target: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>,
): void {
  assertPrimaryAdminProtected(target);
}

export function assertPrimaryAdminSessionImmutable(user: AuthUser): AuthUser {
  return {
    ...user,
    id: PRIMARY_ADMIN_ID,
    username: PRIMARY_ADMIN_USERNAME,
    displayName: PRIMARY_ADMIN_DISPLAY_NAME,
    role: 'OWNER',
    isOwner: true,
    isProtected: true,
    isActive: true,
    adminType: 'Admin',
  };
}

/** @deprecated Use assertPrimaryAdminSessionImmutable */
export function assertOwnerSessionImmutable(user: AuthUser): AuthUser {
  return assertPrimaryAdminSessionImmutable(user);
}
