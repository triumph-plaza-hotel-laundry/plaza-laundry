export interface LuxuryParticle {
  id: string;
  size: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  duration: number;
  peak: number;
  delay: number;
}

export const LUXURY_PARTICLE_COUNT = 34;

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: -1 },
] as const;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function randomPoint(width: number, height: number) {
  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height),
  };
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

export function createLuxuryParticle(
  width: number,
  height: number,
  delay = 0,
): LuxuryParticle {
  const size = randomBetween(0.8, 2.2);
  const start = randomPoint(width, height);
  const minTravel = Math.min(width, height) * 0.12;
  const maxTravel = Math.min(width, height) * 0.42;

  let endX = start.x;
  let endY = start.y;
  let attempts = 0;

  while (distance(start.x, start.y, endX, endY) < minTravel && attempts < 12) {
    const direction = pickRandom(DIRECTIONS);
    const travel = randomBetween(minTravel, maxTravel);
    const length = Math.hypot(direction.dx, direction.dy) || 1;
    endX =
      start.x +
      (direction.dx / length) * travel +
      randomBetween(-width * 0.04, width * 0.04);
    endY =
      start.y +
      (direction.dy / length) * travel +
      randomBetween(-height * 0.04, height * 0.04);
    endX = Math.max(-8, Math.min(width + 8, endX));
    endY = Math.max(-8, Math.min(height + 8, endY));
    attempts += 1;
  }

  return {
    id: crypto.randomUUID(),
    size,
    x0: start.x,
    y0: start.y,
    x1: endX,
    y1: endY,
    duration: randomBetween(14, 28),
    peak: randomBetween(0.14, 0.38),
    delay,
  };
}

export function createInitialLuxuryParticles(width: number, height: number) {
  return Array.from({ length: LUXURY_PARTICLE_COUNT }, (_, index) =>
    createLuxuryParticle(width, height, index * 0.35),
  );
}
