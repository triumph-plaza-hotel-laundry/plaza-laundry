import { Navigate, Outlet } from 'react-router-dom';
import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import { useAuth } from '@/hooks';

export function OwnerGuard() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (!user || !isPrimaryAdminAccount(user)) {
    return <Navigate replace to="/admin" />;
  }

  return <Outlet />;
}
