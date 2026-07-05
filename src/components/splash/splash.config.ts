export const splashTiming = {
  totalMs: 2000,
  fadeInMs: 300,
  fadeOutMs: 300,
  exitMs: 300,
} as const;

export const splashDestination = '/admin/login';

export const splashPhases = {
  introEnd: 400,
  flightEnd: 2600,
  landEnd: 3350,
  explosionEnd: 4200,
  revealEnd: 4800,
  logoEnd: 5800,
  fadeEnd: 6000,
} as const;
