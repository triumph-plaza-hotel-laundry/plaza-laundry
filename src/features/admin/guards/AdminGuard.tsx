import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessAdminPortal } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const { canAccessPath, isAuthenticated, role } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated || !canAccessAdminPortal(role)) {
    return <Navigate replace state={{ from: pathname }} to="/admin/login" />;
  }

  if (!canAccessPath(pathname)) {
    return <Navigate replace to="/access-denied" />;
  }

  return children;
}
