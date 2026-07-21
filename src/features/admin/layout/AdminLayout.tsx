import { Outlet } from 'react-router-dom';
import { useAdminInactivityTimeout } from '@/features/admin/hooks/useAdminSessionSecurity';

export function AdminLayout() {
  useAdminInactivityTimeout();

  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
    </div>
  );
}
