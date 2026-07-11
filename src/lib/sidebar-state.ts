const SIDEBAR_COLLAPSED_KEY = 'tpl-sidebar-collapsed';

export function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
}
