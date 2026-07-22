import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/styles';
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from '@/lib/sidebar-state';
import { MobileNavContext } from '@/context/mobile-nav-context';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageBackBar } from '@/components/layout/PageBackBar';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { ScrollRestoration } from '@/components/layout/ScrollRestoration';
import { Sidebar } from '@/components/layout/Sidebar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useAdminLeaveLogout } from '@/features/admin/hooks/useAdminSessionSecurity';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)';
const BASE_TITLE = 'Triumph Plaza Hotel Laundry';
const DEFAULT_DESCRIPTION =
  'Premium hotel laundry operations for shifts, inventory, training, and admin workflows.';

const ROUTE_SEO: Array<{
  match: (pathname: string) => boolean;
  title: string;
  description: string;
}> = [
  {
    match: (pathname) => pathname === '/',
    title: `${BASE_TITLE} | Home`,
    description:
      'Luxury operations dashboard for Triumph Plaza Hotel Laundry.',
  },
  {
    match: (pathname) => pathname.startsWith('/inventory'),
    title: `${BASE_TITLE} | Inventory`,
    description:
      'Track stock, transactions, planning, and operational inventory history.',
  },
  {
    match: (pathname) => pathname.startsWith('/shifts'),
    title: `${BASE_TITLE} | Shifts`,
    description:
      'View and manage weekly shift schedules for laundry operations.',
  },
  {
    match: (pathname) => pathname.startsWith('/employees'),
    title: `${BASE_TITLE} | Employees`,
    description: 'Browse the employee structure and department hierarchy.',
  },
  {
    match: (pathname) => pathname.startsWith('/admin'),
    title: `${BASE_TITLE} | Admin`,
    description:
      'Secure administration area for configuration, staff, and operations.',
  },
];

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
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const prevPathnameRef = useRef(location.pathname);
  const wasDesktopRef = useRef(isDesktopSidebar);
  const sidebarOpenedFromBackRef = useRef(false);

  useAdminLeaveLogout();

  useEffect(() => {
    if (prevPathnameRef.current === location.pathname) {
      return;
    }

    prevPathnameRef.current = location.pathname;
    sidebarOpenedFromBackRef.current = false;
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktopSidebar && !wasDesktopRef.current) {
      sidebarOpenedFromBackRef.current = false;
      setIsSidebarOpen(false);
    }

    wasDesktopRef.current = isDesktopSidebar;
  }, [isDesktopSidebar]);

  useEffect(() => {
    const seoEntry = ROUTE_SEO.find((entry) => entry.match(location.pathname));
    const title = seoEntry?.title ?? BASE_TITLE;
    const description = seoEntry?.description ?? DEFAULT_DESCRIPTION;

    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [location.pathname]);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktopSidebar) {
      setIsDesktopCollapsed((collapsed) => {
        const next = !collapsed;
        writeSidebarCollapsed(next);
        return next;
      });
      return;
    }

    sidebarOpenedFromBackRef.current = false;
    setIsSidebarOpen((open) => !open);
  }, [isDesktopSidebar]);

  const handleCloseSidebar = useCallback(() => {
    sidebarOpenedFromBackRef.current = false;
    setIsSidebarOpen(false);
  }, []);

  const handleDismissSidebar = useCallback(() => {
    const openedFromBack = sidebarOpenedFromBackRef.current;
    sidebarOpenedFromBackRef.current = false;
    setIsSidebarOpen(false);

    if (openedFromBack && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  const openMobileSidebar = useCallback(() => {
    if (isDesktopSidebar) {
      return;
    }

    sidebarOpenedFromBackRef.current = false;
    setIsSidebarOpen(true);
  }, [isDesktopSidebar]);

  const openMobileSidebarFromBack = useCallback(() => {
    if (isDesktopSidebar) {
      return;
    }

    sidebarOpenedFromBackRef.current = true;
    setIsSidebarOpen(true);
  }, [isDesktopSidebar]);

  const mobileNavValue = useMemo(
    () => ({ openMobileSidebar, openMobileSidebarFromBack }),
    [openMobileSidebar, openMobileSidebarFromBack],
  );

  const showDesktopSidebar = isDesktopSidebar && !isDesktopCollapsed;

  return (
    <MobileNavContext.Provider value={mobileNavValue}>
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
          onDismiss={handleDismissSidebar}
        />
        <div
          className={cn(
            'flex min-h-dvh flex-col transition-[padding] duration-200 ease-out',
            showDesktopSidebar && 'lg:ps-72',
          )}
        >
          <Header
            isMenuExpanded={
              isDesktopSidebar ? showDesktopSidebar : isSidebarOpen
            }
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
    </MobileNavContext.Provider>
  );
}
