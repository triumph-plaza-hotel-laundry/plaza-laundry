import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

function getScrollKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const key = getScrollKey(location.pathname, location.search);

    if (navigationType === 'POP') {
      window.scrollTo({
        top: scrollPositions.get(key) ?? 0,
        left: 0,
        behavior: 'auto',
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, navigationType]);

  useEffect(() => {
    const handleScroll = () => {
      const key = getScrollKey(location.pathname, location.search);
      scrollPositions.set(key, window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, location.search]);

  return null;
}
