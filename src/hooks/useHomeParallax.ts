import { useEffect, useRef, useState } from 'react';

interface ParallaxOffset {
  x: number;
  y: number;
}

const MAX_SHIFT = 6;

export function useHomeParallax(enabled: boolean) {
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef<ParallaxOffset>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      targetRef.current = {
        x: nx * MAX_SHIFT,
        y: ny * (MAX_SHIFT * 0.65),
      };

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setOffset({ ...targetRef.current });
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled]);

  return offset;
}
