import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { UserRole } from '@/features/auth/types';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_ONLY_ROLES: UserRole[] = ['OWNER', 'SUPER_ADMIN', 'ADMIN'];

type AdminOnlyGuardProps = {
  children: ReactNode;
};

export function AdminOnlyGuard({ children }: AdminOnlyGuardProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role || !ADMIN_ONLY_ROLES.includes(role)) {
    return <Navigate replace to="/access-denied" />;
  }

  return children;
}
