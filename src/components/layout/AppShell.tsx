import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/styles';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PageBackBar } from '@/components/layout/PageBackBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)';

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDesktopSidebar = useMediaQuery(DESKTOP_SIDEBAR_QUERY);
  const location = useLocation();
  const isHome = location.pathname === '/';
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
      return;
    }

    setIsSidebarOpen((open) => !open);
  }, [isDesktopSidebar]);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div
      className={cn(
        'min-h-dvh text-[var(--app-text)]',
        isHome ? 'bg-[var(--home-shell-bg)]' : 'bg-[var(--app-bg)]',
      )}
    >
      <Sidebar
        isDesktop={isDesktopSidebar}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
      <div className="flex min-h-dvh flex-col lg:ps-72">
        <Header onToggleSidebar={handleToggleSidebar} />
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
