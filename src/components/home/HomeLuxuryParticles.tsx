import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  createInitialLuxuryParticles,
  createLuxuryParticle,
  type LuxuryParticle,
} from '@/components/home/luxury-particles';
import '@/components/home/home-luxury-particles.css';

interface ParticleBounds {
  width: number;
  height: number;
}

interface HomeLuxuryParticlesProps {
  parallaxX?: number;
  parallaxY?: number;
}

export function HomeLuxuryParticles({
  parallaxX = 0,
  parallaxY = 0,
}: HomeLuxuryParticlesProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<ParticleBounds>({ width: 0, height: 0 });
  const [particles, setParticles] = useState<LuxuryParticle[]>([]);
  const [bounds, setBounds] = useState<ParticleBounds>({ width: 0, height: 0 });

  const recycleParticle = useCallback(
    (id: string) => {
      if (reduceMotion) {
        return;
      }

      const { width, height } = boundsRef.current;
      if (width < 32 || height < 32) {
        return;
      }

      setParticles((current) =>
        current.map((particle) =>
          particle.id === id ? createLuxuryParticle(width, height, 0) : particle,
        ),
      );
    },
    [reduceMotion],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateBounds = () => {
      const rect = container.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      boundsRef.current = next;
      setBounds(next);
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || bounds.width < 32 || bounds.height < 32) {
      setParticles([]);
      return;
    }

    setParticles(createInitialLuxuryParticles(bounds.width, bounds.height));
  }, [reduceMotion, bounds.width, bounds.height]);

  if (reduceMotion) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="home-luxury-particles"
      style={
        {
          '--parallax-x': `${parallaxX * 0.35}`,
          '--parallax-y': `${parallaxY * 0.35}`,
        } as CSSProperties
      }
    >
      {particles.map((particle) => (
        <span
          className="home-luxury-particle"
          key={particle.id}
          onAnimationEnd={() => recycleParticle(particle.id)}
          style={
            {
              '--size': `${particle.size}px`,
              '--half': `${particle.size / 2}px`,
              '--x0': `${particle.x0}px`,
              '--y0': `${particle.y0}px`,
              '--x1': `${particle.x1}px`,
              '--y1': `${particle.y1}px`,
              '--duration': `${particle.duration}s`,
              '--delay': `${particle.delay}s`,
              '--peak': particle.peak,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
