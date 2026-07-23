const routePreloaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/HomePage'),
  '/programs': () => import('@/pages/ProgramsPage'),
  '/chemicals': () => import('@/pages/ChemicalsPage'),
  '/fabrics': () => import('@/pages/FabricsPage'),
  '/stains': () => import('@/pages/StainsPage'),
  '/care-symbols': () => import('@/pages/CareSymbolsPage'),
  '/price-list': () => import('@/pages/PriceListPage'),
  '/employees': () => import('@/pages/EmployeesPage'),
  '/shifts': () => import('@/pages/ShiftsPage'),
  '/training': () => import('@/pages/TrainingPage'),
  '/inventory': () => import('@/pages/ReportsPage'),
  '/admin': () => import('@/features/admin/pages/AdminIndexPage'),
  '/admin/login': () => import('@/features/admin/pages/AdminLoginPage'),
  '/admin/inventory': () =>
    import('@/features/admin/pages/AdminInventoryEditorPage'),
  '/admin/department-items': () =>
    import('@/features/admin/pages/AdminDepartmentItemsPage'),
  '/admin/employees': () =>
    import('@/features/admin/pages/AdminEmployeesEditorPage'),
  '/admin/shifts': () => import('@/features/admin/pages/AdminShiftsEditorPage'),
  '/admin/leaves': () => import('@/features/admin/pages/AdminLeavesPage'),
  '/admin/price-list': () =>
    import('@/features/admin/pages/AdminPriceListEditorPage'),
  '/admin/chemicals': () =>
    import('@/features/admin/pages/AdminChemicalsEditorPage'),
  '/admin/fabrics': () =>
    import('@/features/admin/pages/AdminFabricsEditorPage'),
  '/admin/stains': () => import('@/features/admin/pages/AdminStainsEditorPage'),
  '/admin/programs': () =>
    import('@/features/admin/pages/AdminProgramsEditorPage'),
  '/admin/care-symbols': () =>
    import('@/features/admin/pages/AdminCareSymbolsEditorPage'),
  '/admin/training': () =>
    import('@/features/admin/pages/AdminTrainingEditorPage'),
  '/admin/home': () =>
    import('@/features/admin/pages/AdminHomeContentEditorPage'),
  '/admin/ai': () => import('@/features/admin/pages/AdminAiSettingsEditorPage'),
  '/admin/settings': () => import('@/features/admin/pages/AdminSettingsPage'),
  '/admin/employee-devices': () =>
    import('@/features/admin/pages/AdminEmployeeDevicesPage'),
  '/admin/notification-diagnostics': () =>
    import('@/features/admin/pages/AdminNotificationDiagnosticsPage'),
  '/admin/hotel-employee-assets': () =>
    import('@/features/hotel-employee-assets'),
  '/hotel-employee-assets': () => import('@/features/hotel-employee-assets'),
  '/employee-device-pairing': () =>
    import('@/pages/EmployeeDevicePairingPage'),
};

const preloadedRoutes = new Set<string>();

export function preloadRoute(path: string): void {
  const preload = routePreloaders[path];
  if (!preload || preloadedRoutes.has(path)) {
    return;
  }

  preloadedRoutes.add(path);
  void preload().catch(() => {
    preloadedRoutes.delete(path);
  });
}
