import { Navigate, Outlet } from 'react-router-dom';
import { AdminPermissionDenied } from '@/features/admin/components/AdminPermissionDenied';
import { SPECIAL_PERMISSION_DENIED } from '@/features/auth/special-admin-permissions';
import { useSpecialAdminPermissions } from '@/hooks/useSpecialAdminPermissions';
import '@/features/admin/admin-permission-denied.css';

export function ShiftNotificationsGuard() {
  const { canManageShiftNotifications, isReady } = useSpecialAdminPermissions();

  if (!isReady) {
    return null;
  }

  if (!canManageShiftNotifications) {
    return <AdminPermissionDenied message={SPECIAL_PERMISSION_DENIED} />;
  }

  return <Outlet />;
}

/** Optional helper redirect for soft denials */
export function ShiftNotificationsRedirectGuard() {
  const { canManageShiftNotifications, isReady } = useSpecialAdminPermissions();

  if (!isReady) {
    return null;
  }

  if (!canManageShiftNotifications) {
    return <Navigate replace to="/admin" />;
  }

  return <Outlet />;
}
