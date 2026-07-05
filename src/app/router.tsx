import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { adminRoutes } from '@/features/admin/routes';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((module) => ({ default: module.HomePage })),
);

const AccessDeniedPage = lazy(() =>
  import('@/pages/AccessDeniedPage').then((module) => ({
    default: module.AccessDeniedPage,
  })),
);

const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

const ProgramsPage = lazy(() =>
  import('@/pages/ProgramsPage').then((module) => ({
    default: module.ProgramsPage,
  })),
);

const ChemicalsPage = lazy(() =>
  import('@/pages/ChemicalsPage').then((module) => ({
    default: module.ChemicalsPage,
  })),
);

const FabricsPage = lazy(() =>
  import('@/pages/FabricsPage').then((module) => ({
    default: module.FabricsPage,
  })),
);

const StainsPage = lazy(() =>
  import('@/pages/StainsPage').then((module) => ({
    default: module.StainsPage,
  })),
);

const CareSymbolsPage = lazy(() =>
  import('@/pages/CareSymbolsPage').then((module) => ({
    default: module.CareSymbolsPage,
  })),
);

const PriceListPage = lazy(() =>
  import('@/pages/PriceListPage').then((module) => ({
    default: module.PriceListPage,
  })),
);

const EmployeesPage = lazy(() =>
  import('@/pages/EmployeesPage').then((module) => ({
    default: module.EmployeesPage,
  })),
);

const ShiftsPage = lazy(() =>
  import('@/pages/ShiftsPage').then((module) => ({
    default: module.ShiftsPage,
  })),
);

const TrainingPage = lazy(() =>
  import('@/pages/TrainingPage').then((module) => ({
    default: module.TrainingPage,
  })),
);

const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
);

function PageLoader() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center bg-[var(--app-bg)]">
      <div
        className="size-8 animate-spin rounded-full border-2 border-[var(--app-border)] border-t-luxury-gold"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AccessDeniedPage />} path="access-denied" />
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route element={<ProgramsPage />} path="programs" />
          <Route element={<ChemicalsPage />} path="chemicals" />
          <Route element={<FabricsPage />} path="fabrics" />
          <Route element={<StainsPage />} path="stains" />
          <Route element={<CareSymbolsPage />} path="care-symbols" />
          <Route element={<PriceListPage />} path="price-list" />
          <Route element={<EmployeesPage />} path="employees" />
          <Route element={<ShiftsPage />} path="shifts" />
          <Route element={<TrainingPage />} path="training" />
          <Route element={<ReportsPage />} path="inventory" />
          {adminRoutes}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
