import { navigationItems } from '@/config/navigation';

/**
 * Top-level app pages reachable from the main sidebar
 * (excludes Home and Admin hub).
 */
const MAIN_SIDEBAR_APP_PATHS = navigationItems
  .map((item) => item.path)
  .filter((path) => path !== '/' && path !== '/admin');

/**
 * Exact match for a primary sidebar destination (e.g. /employees, /shifts).
 */
export function isMainSidebarAppPage(pathname: string): boolean {
  return MAIN_SIDEBAR_APP_PATHS.includes(pathname);
}

/**
 * Parent list path for a nested detail URL under a sidebar page
 * (e.g. /employees/abc → /employees). Returns null for top-level pages.
 */
export function getDetailPageParentPath(pathname: string): string | null {
  const parent = MAIN_SIDEBAR_APP_PATHS.find(
    (path) => pathname.startsWith(`${path}/`) && pathname !== path,
  );
  return parent ?? null;
}
