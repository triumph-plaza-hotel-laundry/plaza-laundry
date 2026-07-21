import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ADMIN_INACTIVITY_MS,
  isProtectedAdminPath,
  setAdminSessionExpiredNotice,
} from '@/features/admin/admin-session';
import { useAuth } from '@/hooks/useAuth';

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
] as const;

/**
 * Signs out when an authenticated admin leaves the protected admin area
 * for any public route.
 */
export function useAdminLeaveLogout() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const nextPath = location.pathname;

    if (previousPath !== nextPath) {
      const leftProtectedAdmin =
        isAuthenticated &&
        isProtectedAdminPath(previousPath) &&
        !isProtectedAdminPath(nextPath);

      if (leftProtectedAdmin) {
        logout();
        navigate('/', { replace: true });
      }

      previousPathRef.current = nextPath;
    }
  }, [isAuthenticated, location.pathname, logout, navigate]);
}

/**
 * Signs out after 5 minutes of inactivity while inside the protected admin area.
 */
export function useAdminInactivityTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isProtectedAdminPath(location.pathname)) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const expireSession = () => {
      setAdminSessionExpiredNotice();
      logout();
      navigate('/', { replace: true });
    };

    const resetTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(expireSession, ADMIN_INACTIVITY_MS);
    };

    resetTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, [isAuthenticated, location.pathname, logout, navigate]);
}
