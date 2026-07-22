import { Outlet, useLocation } from 'react-router-dom';
import { AdminBackButton } from '@/features/admin/components/AdminBackButton';
import { useAdminInactivityTimeout } from '@/features/admin/hooks/useAdminSessionSecurity';
import '@/features/admin/admin-editor.css';

function isAdminDashboardPath(pathname: string) {
  return pathname === '/admin' || pathname === '/admin/';
}

/**
 * Shared Admin shell. Renders the Back button for every nested Admin page
 * except the main dashboard (/admin).
 */
export function AdminLayout() {
  useAdminInactivityTimeout();
  const { pathname } = useLocation();
  const showBack = !isAdminDashboardPath(pathname);

  return (
    <div className="admin-layout flex min-h-dvh flex-col">
      {showBack ? (
        <div className="admin-layout__back-bar">
          <AdminBackButton />
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
