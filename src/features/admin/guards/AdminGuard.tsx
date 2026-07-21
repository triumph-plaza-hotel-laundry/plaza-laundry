import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessAdminPortal } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';

type AdminGuardProps = {
  children: ReactNode;
};

function AdminGuardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-[40dvh] flex-1 items-center justify-center"
    >
      <div className="border-t-luxury-gold size-8 animate-spin rounded-full border-2 border-[var(--app-border)]" />
    </div>
  );
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { canAccessPath, isAuthenticated, isReady, role } = useAuth();
  const { pathname } = useLocation();

  if (!isReady) {
    return <AdminGuardLoading />;
  }

  if (!isAuthenticated || !canAccessAdminPortal(role)) {
    return <Navigate replace state={{ from: pathname }} to="/admin/login" />;
  }

  if (!canAccessPath(pathname)) {
    return <Navigate replace to="/access-denied" />;
  }

  return children;
}
