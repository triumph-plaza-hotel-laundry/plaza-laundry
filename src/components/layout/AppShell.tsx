import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/styles';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageBackBar } from '@/components/layout/PageBackBar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

const Sidebar = lazy(() =>
  import('@/components/layout/Sidebar').then((module) => ({
    default: module.Sidebar,
  })),
);

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={cn(
        'min-h-dvh text-[var(--app-text)]',
        isHome ? 'bg-[var(--home-shell-bg)]' : 'bg-[var(--app-bg)]',
      )}
    >
      <Suspense fallback={null}>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </Suspense>
      <div className="flex min-h-dvh flex-col lg:ps-72">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
        <main
          className={cn(
            'flex flex-1 flex-col',
            isHome ? 'home-shell-main bg-transparent' : 'px-4 pt-4 pb-5 sm:px-6',
          )}
        >
          {!isHome ? <PageBackBar /> : null}
          <Outlet />
        </main>
        <Footer />
        <InstallPrompt />
      </div>
    </div>
  );
}
