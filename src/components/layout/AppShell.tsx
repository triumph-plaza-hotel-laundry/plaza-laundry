import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/styles';
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from '@/lib/sidebar-state';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageBackBar } from '@/components/layout/PageBackBar';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { ScrollRestoration } from '@/components/layout/ScrollRestoration';
import { Sidebar } from '@/components/layout/Sidebar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)';

function PageLoader() {
  return (
    <div className="flex min-h-[40dvh] flex-1 items-center justify-center">
      <div
        className="border-t-luxury-gold size-8 animate-spin rounded-full border-2 border-[var(--app-border)]"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() =>
    readSidebarCollapsed(),
  );
  const isDesktopSidebar = useMediaQuery(DESKTOP_SIDEBAR_QUERY);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const prevPathnameRef = useRef(location.pathname);
  const wasDesktopRef = useRef(isDesktopSidebar);

  useEffect(() => {
    if (prevPathnameRef.current === location.pathname) {
      return;
    }

    prevPathnameRef.current = location.pathname;
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktopSidebar && !wasDesktopRef.current) {
      setIsSidebarOpen(false);
    }

    wasDesktopRef.current = isDesktopSidebar;
  }, [isDesktopSidebar]);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktopSidebar) {
      setIsDesktopCollapsed((collapsed) => {
        const next = !collapsed;
        writeSidebarCollapsed(next);
        return next;
      });
      return;
    }

    setIsSidebarOpen((open) => !open);
  }, [isDesktopSidebar]);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const showDesktopSidebar = isDesktopSidebar && !isDesktopCollapsed;

  return (
    <div
      className={cn(
        'min-h-dvh text-[var(--app-text)]',
        isHome ? 'bg-[var(--home-shell-bg)]' : 'bg-[var(--app-bg)]',
      )}
    >
      <ScrollRestoration />
      <Sidebar
        isDesktop={isDesktopSidebar}
        isDesktopCollapsed={isDesktopCollapsed}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-200 ease-out',
          showDesktopSidebar && 'lg:ps-72',
        )}
      >
        <Header
          isMenuExpanded={isDesktopSidebar ? showDesktopSidebar : isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />
        <main
          className={cn(
            'flex flex-1 flex-col',
            isHome
              ? 'home-shell-main bg-transparent'
              : 'px-4 pt-4 pb-5 sm:px-6',
          )}
        >
          {!isHome && !isAdminRoute ? <PageBackBar /> : null}
          <RouteGuard>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </RouteGuard>
        </main>
        <Footer />
        <InstallPrompt />
      </div>
    </div>
  );
}
