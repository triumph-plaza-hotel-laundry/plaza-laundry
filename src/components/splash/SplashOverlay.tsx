import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '@/assets/images/logo.png';
import { splashDestination, splashTiming } from '@/components/splash/splash.config';
import '@/components/splash/splash.css';

type SplashOverlayProps = {
  onDismiss: () => void;
};

export function SplashOverlay({ onDismiss }: SplashOverlayProps) {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    void import('@/features/admin/pages/AdminLoginPage');
  }, []);

  useEffect(() => {
    const blockInteraction = (event: KeyboardEvent) => {
      event.preventDefault();
    };

    window.addEventListener('keydown', blockInteraction, { capture: true });

    return () => {
      window.removeEventListener('keydown', blockInteraction, { capture: true });
    };
  }, []);

  useEffect(() => {
    const exitAt = splashTiming.totalMs - splashTiming.fadeOutMs;
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, exitAt);

    const completeTimer = window.setTimeout(() => {
      navigate(splashDestination, { replace: true });
      onDismiss();
    }, splashTiming.totalMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [navigate, onDismiss]);

  const splashStyle = {
    '--minimal-splash-fade-in-ms': `${splashTiming.fadeInMs}ms`,
    '--minimal-splash-fade-out-ms': `${splashTiming.fadeOutMs}ms`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`minimal-splash${isExiting ? ' minimal-splash--exit' : ''}`}
      role="presentation"
      style={splashStyle}
    >
      <img alt="" className="minimal-splash__logo" decoding="async" src={logoUrl} />
    </div>
  );
}
