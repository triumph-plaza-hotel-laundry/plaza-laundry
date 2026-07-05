export { authenticateLogin } from '@/features/auth/login';
export type { LoginCredentials } from '@/features/auth/login';
export type {
  AdminType,
  AuthSession,
  AuthUser,
  PermissionAction,
  PermissionResource,
  UserRole,
} from '@/features/auth/types';
export {
  assertPermission,
  canAccessAdminPortal,
  canAccessRoute,
  canManageResource,
  canSeeNavigation,
  getVisibleNavigationResources,
  hasPermission,
  navigationPathForResource,
  PERMISSION_DENIED,
  resolveResourceFromPath,
  routeResourceMap,
} from '@/features/auth/permissions';
export {
  assertPrimaryAdminProtected,
  assertPrimaryAdminSessionImmutable,
  isPrimaryAdminAccount,
  PRIMARY_ADMIN_DISPLAY_NAME,
  PRIMARY_ADMIN_ID,
  PRIMARY_ADMIN_USERNAME,
  assertOwnerAccountProtected,
  assertOwnerSessionImmutable,
  isOwnerAccount,
  OWNER_USER_ID,
  OWNER_USERNAME,
} from '@/features/auth/owner-protection';
export {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/features/auth/session';
export {
  changeStoredOwnPassword,
  createStoredAdminUser,
  deleteStoredUser,
  ensureUsersStoreReady,
  listAdminManagedUsers,
  getStoredUsers,
  resetStoredAdminPassword,
  updateStoredAdminUser,
} from '@/features/auth/users';
