import { createContext, useContext } from 'react';

export type MobileNavContextValue = {
  /** Opens the mobile sidebar drawer (hamburger / generic). */
  openMobileSidebar: () => void;
  /**
   * Opens the mobile sidebar after Back on a main app page.
   * Dismissing the drawer (backdrop / close / Escape) finishes that flow at Home.
   */
  openMobileSidebarFromBack: () => void;
};

export const MobileNavContext = createContext<MobileNavContextValue | null>(
  null,
);

export function useMobileNav(): MobileNavContextValue | null {
  return useContext(MobileNavContext);
}
