import { useEffect, useRef } from 'react';

type ParticleMode = 'ambient' | 'trail' | 'explosion' | 'dissipate';

type GoldenParticleFieldProps = {
  mode: ParticleMode;
  burstKey?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  gold: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function GoldenParticleField({
  mode,
  burstKey = 0,
}: GoldenParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const modeRef = useRef(mode);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (mode !== 'explosion') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width * 0.5;
    const centerY = height * 0.46;
    const burst: Particle[] = [];

    for (let index = 0; index < 220; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(2.5, 14);
      burst.push({
        x: centerX + randomBetween(-24, 24),
        y: centerY + randomBetween(-18, 18),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(0.5, 3),
        size: randomBetween(1.5, 7),
        life: 0,
        maxLife: randomBetween(48, 96),
        alpha: randomBetween(0.45, 1),
        gold: randomBetween(0.65, 1),
      });
    }

    particlesRef.current = [...particlesRef.current, ...burst];
  }, [burstKey, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth, clientHeight } = parent;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const spawnAmbient = (width: number, height: number) => {
      if (particlesRef.current.length > 120) {
        return;
      }

      particlesRef.current.push({
        x: randomBetween(0, width),
        y: randomBetween(height * 0.2, height),
        vx: randomBetween(-0.12, 0.12),
        vy: randomBetween(-0.35, -0.08),
        size: randomBetween(0.6, 2.2),
        life: 0,
        maxLife: randomBetween(120, 220),
        alpha: randomBetween(0.15, 0.55),
        gold: randomBetween(0.7, 1),
      });
    };

    const tick = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const currentMode = modeRef.current;

      if (currentMode === 'ambient' || currentMode === 'trail') {
        if (Math.random() < 0.35) {
          spawnAmbient(width, height);
        }
      }

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.life += 1;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (currentMode === 'explosion') {
          particle.vy += 0.04;
          particle.vx *= 0.985;
        } else if (currentMode === 'dissipate') {
          particle.vy -= 0.015;
          particle.vx *= 0.992;
        } else {
          particle.vx *= 0.998;
        }

        const lifeRatio = 1 - particle.life / particle.maxLife;
        if (lifeRatio <= 0) {
          return false;
        }

        const alpha = particle.alpha * lifeRatio;
        const goldMix = particle.gold;
        context.beginPath();
        context.fillStyle = `rgba(${Math.floor(180 + 75 * goldMix)}, ${Math.floor(130 + 70 * goldMix)}, ${Math.floor(
          60 + 40 * goldMix,
        )}, ${alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        if (particle.size > 2.2) {
          context.beginPath();
          context.fillStyle = `rgba(255, 244, 210, ${alpha * 0.35})`;
          context.arc(
            particle.x,
            particle.y,
            particle.size * 0.45,
            0,
            Math.PI * 2,
          );
          context.fill();
        }

        return true;
      });

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="cinematic-splash__particles"
      ref={canvasRef}
    />
  );
}
