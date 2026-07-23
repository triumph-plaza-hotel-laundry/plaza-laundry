import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { AdminGuard } from '@/features/admin/guards/AdminGuard';
import { OwnerGuard } from '@/features/admin/guards/OwnerGuard';
import { ShiftNotificationsGuard } from '@/features/admin/guards/ShiftNotificationsGuard';
import { AdminLayout } from '@/features/admin/layout/AdminLayout';

const AdminLoginPage = lazy(() =>
  import('@/features/admin/pages/AdminLoginPage').then((module) => ({
    default: module.AdminLoginPage,
  })),
);

const AdminIndexPage = lazy(() =>
  import('@/features/admin/pages/AdminIndexPage').then((module) => ({
    default: module.AdminIndexPage,
  })),
);

const AdminTrainingPage = lazy(() =>
  import('@/features/admin/pages/AdminTrainingEditorPage').then((module) => ({
    default: module.AdminTrainingEditorPage,
  })),
);

const AdminDepartmentItemsPage = lazy(() =>
  import('@/features/admin/pages/AdminDepartmentItemsPage').then((module) => ({
    default: module.AdminDepartmentItemsPage,
  })),
);

const AdminInventoryPage = lazy(() =>
  import('@/features/admin/pages/AdminInventoryEditorPage').then((module) => ({
    default: module.AdminInventoryEditorPage,
  })),
);

const AdminLeavesPage = lazy(() =>
  import('@/features/admin/pages/AdminLeavesPage').then((module) => ({
    default: module.AdminLeavesPage,
  })),
);

const AdminEmployeesPage = lazy(() =>
  import('@/features/admin/pages/AdminEmployeesEditorPage').then((module) => ({
    default: module.AdminEmployeesEditorPage,
  })),
);

const AdminShiftsPage = lazy(() =>
  import('@/features/admin/pages/AdminShiftsEditorPage').then((module) => ({
    default: module.AdminShiftsEditorPage,
  })),
);

const AdminPriceListPage = lazy(() =>
  import('@/features/admin/pages/AdminPriceListEditorPage').then((module) => ({
    default: module.AdminPriceListEditorPage,
  })),
);

const AdminChemicalsPage = lazy(() =>
  import('@/features/admin/pages/AdminChemicalsEditorPage').then((module) => ({
    default: module.AdminChemicalsEditorPage,
  })),
);

const AdminFabricsPage = lazy(() =>
  import('@/features/admin/pages/AdminFabricsEditorPage').then((module) => ({
    default: module.AdminFabricsEditorPage,
  })),
);

const AdminStainsPage = lazy(() =>
  import('@/features/admin/pages/AdminStainsEditorPage').then((module) => ({
    default: module.AdminStainsEditorPage,
  })),
);

const AdminProgramsPage = lazy(() =>
  import('@/features/admin/pages/AdminProgramsEditorPage').then((module) => ({
    default: module.AdminProgramsEditorPage,
  })),
);

const AdminCareSymbolsPage = lazy(() =>
  import('@/features/admin/pages/AdminCareSymbolsEditorPage').then(
    (module) => ({
      default: module.AdminCareSymbolsEditorPage,
    }),
  ),
);

const AdminHomeContentPage = lazy(() =>
  import('@/features/admin/pages/AdminHomeContentEditorPage').then(
    (module) => ({
      default: module.AdminHomeContentEditorPage,
    }),
  ),
);

const AdminAiSettingsPage = lazy(() =>
  import('@/features/admin/pages/AdminAiSettingsEditorPage').then((module) => ({
    default: module.AdminAiSettingsEditorPage,
  })),
);

const AdminOwnerPushPage = lazy(() =>
  import('@/features/admin/pages/AdminOwnerPushPage').then((module) => ({
    default: module.AdminOwnerPushPage,
  })),
);

const AdminNotificationDiagnosticsPage = lazy(() =>
  import('@/features/admin/pages/AdminNotificationDiagnosticsPage').then(
    (module) => ({
      default: module.AdminNotificationDiagnosticsPage,
    }),
  ),
);

const AdminSettingsPage = lazy(() =>
  import('@/features/admin/pages/AdminSettingsPage').then((module) => ({
    default: module.AdminSettingsPage,
  })),
);

const AdminEmployeeDevicesPage = lazy(() =>
  import('@/features/admin/pages/AdminEmployeeDevicesPage').then((module) => ({
    default: module.AdminEmployeeDevicesPage,
  })),
);

const AdminHotelEmployeeAssetsPage = lazy(() =>
  import('@/features/hotel-employee-assets').then((module) => ({
    default: module.AdminHotelEmployeeAssetsPage,
  })),
);

export const adminRoutes = (
  <Route path="admin">
    <Route element={<AdminLoginPage />} path="login" />
    <Route
      element={
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      }
    >
      <Route index element={<AdminIndexPage />} />
      <Route element={<AdminInventoryPage />} path="inventory" />
      <Route element={<AdminDepartmentItemsPage />} path="department-items" />
      <Route element={<AdminEmployeesPage />} path="employees" />
      <Route element={<AdminShiftsPage />} path="shifts" />
      <Route element={<AdminLeavesPage />} path="leaves" />
      <Route element={<AdminPriceListPage />} path="price-list" />
      <Route element={<AdminChemicalsPage />} path="chemicals" />
      <Route element={<AdminFabricsPage />} path="fabrics" />
      <Route element={<AdminStainsPage />} path="stains" />
      <Route element={<AdminProgramsPage />} path="programs" />
      <Route element={<AdminCareSymbolsPage />} path="care-symbols" />
      <Route element={<AdminTrainingPage />} path="training" />
      <Route element={<AdminHomeContentPage />} path="home" />
      <Route element={<AdminAiSettingsPage />} path="ai" />
      <Route element={<ShiftNotificationsGuard />}>
        <Route element={<AdminOwnerPushPage />} path="push-notifications" />
      </Route>
      <Route element={<OwnerGuard />}>
        <Route
          element={<AdminNotificationDiagnosticsPage />}
          path="notification-diagnostics"
        />
      </Route>
      <Route element={<AdminEmployeeDevicesPage />} path="employee-devices" />
      <Route
        element={<AdminHotelEmployeeAssetsPage />}
        path="hotel-employee-assets"
      />
      <Route element={<AdminSettingsPage />} path="settings" />
    </Route>
  </Route>
);
