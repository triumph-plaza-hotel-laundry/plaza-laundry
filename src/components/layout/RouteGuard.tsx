import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessRoute } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';

const PUBLIC_PATHS = new Set(['/', '/access-denied']);

type RouteGuardProps = {
  children: ReactNode;
};

export function RouteGuard({ children }: RouteGuardProps) {
  const { role } = useAuth();
  const { pathname } = useLocation();

  if (!role || PUBLIC_PATHS.has(pathname) || pathname.startsWith('/admin')) {
    return children;
  }

  if (!canAccessRoute(role, pathname)) {
    return <Navigate replace to="/access-denied" />;
  }

  return children;
}
