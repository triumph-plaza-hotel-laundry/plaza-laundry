export type OneSignalServiceWorkerConfig = {
  /** Relative path passed to OneSignal.init (no leading slash). */
  path: string;
  /** Absolute URL used for reachability checks. */
  url: string;
  scope: string;
};

/**
 * Dedicated OneSignal worker under /onesignal/ so it never shares scope with
 * the PWA worker registered at /sw.js (scope /).
 */
export const ONESIGNAL_SERVICE_WORKER: OneSignalServiceWorkerConfig = {
  path: 'onesignal/OneSignalSDKWorker.js',
  url: '/onesignal/OneSignalSDKWorker.js',
  scope: '/onesignal/',
};
