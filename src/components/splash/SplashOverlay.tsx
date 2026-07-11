import { useEffect, useRef, useState, type CSSProperties } from 'react';
import logoUrl from '@/assets/images/logo.png';
import { splashTiming, splashTotalMs } from '@/components/splash/splash.config';
import '@/components/splash/splash.css';

type SplashOverlayProps = {
  onDismiss: () => void;
};

const SPLASH_PARTICLES = [
  {
    x: '8%',
    y: '12%',
    size: '2px',
    peak: '0.45',
    dx: '2px',
    dy: '-6px',
    delay: '0s',
    duration: '14s',
  },
  {
    x: '22%',
    y: '6%',
    size: '3px',
    peak: '0.7',
    dx: '-3px',
    dy: '-10px',
    delay: '1.4s',
    duration: '16s',
  },
  {
    x: '38%',
    y: '4%',
    size: '2px',
    peak: '0.55',
    dx: '1px',
    dy: '-8px',
    delay: '0.6s',
    duration: '15s',
  },
  {
    x: '54%',
    y: '8%',
    size: '2px',
    peak: '0.4',
    dx: '4px',
    dy: '-12px',
    delay: '2.2s',
    duration: '17s',
  },
  {
    x: '72%',
    y: '10%',
    size: '3px',
    peak: '0.65',
    dx: '-2px',
    dy: '-7px',
    delay: '1s',
    duration: '18s',
  },
  {
    x: '88%',
    y: '18%',
    size: '2px',
    peak: '0.5',
    dx: '3px',
    dy: '-9px',
    delay: '3s',
    duration: '15s',
  },
  {
    x: '94%',
    y: '34%',
    size: '2px',
    peak: '0.35',
    dx: '-4px',
    dy: '-6px',
    delay: '1.8s',
    duration: '16s',
  },
  {
    x: '90%',
    y: '52%',
    size: '3px',
    peak: '0.6',
    dx: '2px',
    dy: '-11px',
    delay: '0.4s',
    duration: '19s',
  },
  {
    x: '84%',
    y: '70%',
    size: '2px',
    peak: '0.48',
    dx: '-3px',
    dy: '-8px',
    delay: '2.6s',
    duration: '14s',
  },
  {
    x: '76%',
    y: '86%',
    size: '2px',
    peak: '0.42',
    dx: '1px',
    dy: '-7px',
    delay: '1.2s',
    duration: '17s',
  },
  {
    x: '58%',
    y: '92%',
    size: '3px',
    peak: '0.72',
    dx: '-2px',
    dy: '-10px',
    delay: '3.4s',
    duration: '16s',
  },
  {
    x: '40%',
    y: '94%',
    size: '2px',
    peak: '0.38',
    dx: '3px',
    dy: '-6px',
    delay: '0.9s',
    duration: '18s',
  },
  {
    x: '24%',
    y: '88%',
    size: '2px',
    peak: '0.58',
    dx: '-1px',
    dy: '-9px',
    delay: '2s',
    duration: '15s',
  },
  {
    x: '10%',
    y: '74%',
    size: '3px',
    peak: '0.5',
    dx: '4px',
    dy: '-12px',
    delay: '1.6s',
    duration: '17s',
  },
  {
    x: '4%',
    y: '56%',
    size: '2px',
    peak: '0.44',
    dx: '-3px',
    dy: '-7px',
    delay: '2.8s',
    duration: '14s',
  },
  {
    x: '6%',
    y: '38%',
    size: '2px',
    peak: '0.62',
    dx: '2px',
    dy: '-8px',
    delay: '0.2s',
    duration: '19s',
  },
  {
    x: '18%',
    y: '28%',
    size: '2px',
    peak: '0.36',
    dx: '-4px',
    dy: '-6px',
    delay: '3.2s',
    duration: '16s',
  },
  {
    x: '32%',
    y: '22%',
    size: '3px',
    peak: '0.68',
    dx: '1px',
    dy: '-11px',
    delay: '1.1s',
    duration: '15s',
  },
  {
    x: '48%',
    y: '18%',
    size: '2px',
    peak: '0.52',
    dx: '-2px',
    dy: '-9px',
    delay: '2.4s',
    duration: '18s',
  },
  {
    x: '64%',
    y: '24%',
    size: '2px',
    peak: '0.4',
    dx: '3px',
    dy: '-7px',
    delay: '0.7s',
    duration: '17s',
  },
  {
    x: '78%',
    y: '32%',
    size: '3px',
    peak: '0.66',
    dx: '-1px',
    dy: '-10px',
    delay: '1.9s',
    duration: '16s',
  },
  {
    x: '82%',
    y: '48%',
    size: '2px',
    peak: '0.46',
    dx: '2px',
    dy: '-8px',
    delay: '3.6s',
    duration: '14s',
  },
  {
    x: '70%',
    y: '62%',
    size: '2px',
    peak: '0.54',
    dx: '-3px',
    dy: '-6px',
    delay: '0.5s',
    duration: '19s',
  },
  {
    x: '52%',
    y: '72%',
    size: '3px',
    peak: '0.7',
    dx: '4px',
    dy: '-12px',
    delay: '2.1s',
    duration: '15s',
  },
  {
    x: '36%',
    y: '78%',
    size: '2px',
    peak: '0.43',
    dx: '-2px',
    dy: '-7px',
    delay: '1.3s',
    duration: '17s',
  },
  {
    x: '20%',
    y: '64%',
    size: '2px',
    peak: '0.57',
    dx: '1px',
    dy: '-9px',
    delay: '2.9s',
    duration: '16s',
  },
  {
    x: '14%',
    y: '48%',
    size: '3px',
    peak: '0.48',
    dx: '-4px',
    dy: '-8px',
    delay: '0.8s',
    duration: '18s',
  },
  {
    x: '28%',
    y: '42%',
    size: '2px',
    peak: '0.64',
    dx: '3px',
    dy: '-10px',
    delay: '3.1s',
    duration: '14s',
  },
  {
    x: '44%',
    y: '36%',
    size: '2px',
    peak: '0.39',
    dx: '-1px',
    dy: '-6px',
    delay: '1.7s',
    duration: '17s',
  },
  {
    x: '60%',
    y: '40%',
    size: '3px',
    peak: '0.61',
    dx: '2px',
    dy: '-11px',
    delay: '2.5s',
    duration: '16s',
  },
  {
    x: '74%',
    y: '54%',
    size: '2px',
    peak: '0.47',
    dx: '-3px',
    dy: '-7px',
    delay: '0.3s',
    duration: '19s',
  },
  {
    x: '66%',
    y: '12%',
    size: '2px',
    peak: '0.53',
    dx: '1px',
    dy: '-8px',
    delay: '3.3s',
    duration: '15s',
  },
  {
    x: '50%',
    y: '50%',
    size: '2px',
    peak: '0.33',
    dx: '-2px',
    dy: '-5px',
    delay: '1.5s',
    duration: '20s',
  },
  {
    x: '42%',
    y: '58%',
    size: '2px',
    peak: '0.41',
    dx: '3px',
    dy: '-9px',
    delay: '2.7s',
    duration: '16s',
  },
  {
    x: '56%',
    y: '64%',
    size: '2px',
    peak: '0.59',
    dx: '-2px',
    dy: '-7px',
    delay: '0.1s',
    duration: '18s',
  },
  {
    x: '30%',
    y: '52%',
    size: '3px',
    peak: '0.69',
    dx: '2px',
    dy: '-10px',
    delay: '3.8s',
    duration: '17s',
  },
  {
    x: '46%',
    y: '26%',
    size: '2px',
    peak: '0.37',
    dx: '-3px',
    dy: '-6px',
    delay: '1s',
    duration: '15s',
  },
  {
    x: '62%',
    y: '78%',
    size: '2px',
    peak: '0.51',
    dx: '1px',
    dy: '-8px',
    delay: '2.3s',
    duration: '19s',
  },
] as const;

export function SplashOverlay({ onDismiss }: SplashOverlayProps) {
  const [isExiting, setIsExiting] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    const timers: number[] = [];

    const dismiss = () => {
      if (dismissedRef.current) {
        return;
      }

      dismissedRef.current = true;
      setIsExiting(true);
      timers.push(window.setTimeout(() => onDismiss(), splashTiming.fadeOutMs));
    };

    timers.push(window.setTimeout(dismiss, splashTotalMs));

    const handleLoad = () => {
      timers.push(window.setTimeout(dismiss, 700));
    };

    if (document.readyState === 'complete') {
      timers.push(window.setTimeout(dismiss, 900));
    } else {
      window.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('load', handleLoad);
    };
  }, [onDismiss]);

  const splashStyle = {
    '--luxury-splash-load-ms': `${splashTiming.loadBarMs}ms`,
    '--luxury-splash-fade-out-ms': `${splashTiming.fadeOutMs}ms`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`luxury-splash${isExiting ? 'luxury-splash--exit' : ''}`}
      role="presentation"
      style={splashStyle}
    >
      <div className="luxury-splash__marble" />

      <div className="luxury-splash__logo-stage">
        <div
          aria-hidden="true"
          className="luxury-splash__particles luxury-splash__particles--around-logo"
        >
          {SPLASH_PARTICLES.map((particle, index) => (
            <span
              className="luxury-splash__particle"
              key={index}
              style={
                {
                  '--particle-x': particle.x,
                  '--particle-y': particle.y,
                  '--particle-size': particle.size,
                  '--particle-peak': particle.peak,
                  '--particle-dx': particle.dx,
                  '--particle-dy': particle.dy,
                  '--particle-delay': particle.delay,
                  '--particle-duration': particle.duration,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="luxury-splash__logo-wrap">
          <img
            alt=""
            className="luxury-splash__logo"
            decoding="async"
            draggable={false}
            src={logoUrl}
          />
        </div>
      </div>

      <div className="luxury-splash__loader" aria-hidden="true">
        <div className="luxury-splash__loader-track">
          <div className="luxury-splash__loader-fill" />
        </div>
      </div>
    </div>
  );
}
