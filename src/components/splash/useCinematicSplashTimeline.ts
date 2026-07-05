import { useEffect, useState } from 'react';
import { splashPhases } from '@/components/splash/splash.config';

export type CinematicSplashPhase =
  | 'intro'
  | 'flight'
  | 'land'
  | 'explosion'
  | 'smoke'
  | 'reveal'
  | 'logo'
  | 'fade';

export function useCinematicSplashTimeline() {
  const [phase, setPhase] = useState<CinematicSplashPhase>('intro');
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    const timers: number[] = [];

    const schedule = (delay: number, nextPhase: CinematicSplashPhase, onFire?: () => void) => {
      timers.push(
        window.setTimeout(() => {
          setPhase(nextPhase);
          onFire?.();
        }, delay),
      );
    };

    schedule(splashPhases.introEnd, 'flight');
    schedule(splashPhases.flightEnd, 'land');
    schedule(splashPhases.landEnd, 'explosion', () => setBurstKey((value) => value + 1));
    schedule(splashPhases.landEnd + 420, 'smoke');
    schedule(splashPhases.explosionEnd, 'reveal');
    schedule(splashPhases.revealEnd, 'logo');
    schedule(splashPhases.logoEnd, 'fade');

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return { phase, burstKey };
}
