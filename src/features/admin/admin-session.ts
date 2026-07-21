const ADMIN_SESSION_EXPIRED_KEY = 'tpl-admin-session-expired';

/** Admin routes that require an active session (excludes login). */
export function isProtectedAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== '/admin/login';
}

export function isAdminAreaPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export const ADMIN_INACTIVITY_MS = 5 * 60 * 1000;

export function setAdminSessionExpiredNotice() {
  sessionStorage.setItem(ADMIN_SESSION_EXPIRED_KEY, '1');
}

export function consumeAdminSessionExpiredNotice(): boolean {
  if (sessionStorage.getItem(ADMIN_SESSION_EXPIRED_KEY) !== '1') {
    return false;
  }

  sessionStorage.removeItem(ADMIN_SESSION_EXPIRED_KEY);
  return true;
}
