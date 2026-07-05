import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
    </div>
  );
}
