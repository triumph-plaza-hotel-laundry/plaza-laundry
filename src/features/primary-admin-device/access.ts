import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import type { AuthUser } from '@/features/auth/types';

/** Only the Super Admin / primary owner may register the primary admin device. */
export function canRegisterPrimaryAdminDevice(
  user: AuthUser | null | undefined,
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  return isPrimaryAdminAccount(user) || user.role === 'SUPER_ADMIN';
}
