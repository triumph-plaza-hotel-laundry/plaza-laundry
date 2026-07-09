export const splashTiming = {
  loadBarMs: 5000,
  fadeOutMs: 700,
  logoIntroMs: 1200,
  shimmerMs: 1400,
} as const;

export const splashTotalMs = splashTiming.loadBarMs + splashTiming.fadeOutMs;

export const splashPhases = {
  introEnd: 400,
  flightEnd: 2600,
  landEnd: 3350,
  explosionEnd: 4200,
  revealEnd: 4800,
  logoEnd: 5800,
  fadeEnd: 6000,
} as const;
