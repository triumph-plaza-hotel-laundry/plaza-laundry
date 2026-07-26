/**
 * Detect a stale PWA app shell and force reclaim.
 *
 * Workbox can precache index.html. A phone with an old service worker keeps
 * serving old HTML → old JS. Compare NetworkOnly /build.json to the
 * compile-time id and reclaim the root SW until they match.
 */

declare const __TPL_BUILD_ID__: string;

const RECLAIM_FLAG = 'tpl-shell-reclaim-target';
const RECLAIM_ATTEMPTS = 'tpl-shell-reclaim-attempts';

function localBuildId(): string {
  try {
    return typeof __TPL_BUILD_ID__ === 'string' ? __TPL_BUILD_ID__ : '';
  } catch {
    return '';
  }
}

async function readRemoteBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`/build.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { id?: unknown };
    return typeof json.id === 'string' ? json.id : null;
  } catch {
    return null;
  }
}

async function reclaimRootServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        const scopePath = new URL(registration.scope).pathname;
        // Keep OneSignal's /onesignal/ worker — only reclaim the app shell SW.
        if (scopePath === '/' || scopePath === '') {
          await registration.unregister();
        }
      }),
    );
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => !/onesignal/i.test(key))
        .map((key) => caches.delete(key)),
    );
  }
}

/**
 * If the installed shell is behind production, unregister the root SW,
 * clear app caches, and reload. Retries across reloads until local matches
 * remote (does not latch forever on the old build id).
 */
export async function ensureFreshAppShell(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (import.meta.env.DEV) return;

  const local = localBuildId();
  if (!local) return;

  (
    window as Window & { __TPL_BUILD_ID__?: string }
  ).__TPL_BUILD_ID__ = local;

  const remote = await readRemoteBuildId();
  if (!remote || remote === local) {
    sessionStorage.removeItem(RECLAIM_FLAG);
    sessionStorage.removeItem(RECLAIM_ATTEMPTS);
    return;
  }

  const attempts = Number(sessionStorage.getItem(RECLAIM_ATTEMPTS) || '0');
  if (attempts >= 3) {
    console.warn(
      '[pwa] Stale shell persists after reclaim attempts — open /onesignal/clear-cache.html',
      { local, remote, attempts },
    );
    return;
  }

  console.warn('[pwa] Stale app shell — reclaiming', {
    local,
    remote,
    attempts,
  });
  sessionStorage.setItem(RECLAIM_FLAG, remote);
  sessionStorage.setItem(RECLAIM_ATTEMPTS, String(attempts + 1));
  await reclaimRootServiceWorker();
  window.location.reload();
}

export function getTplBuildId(): string {
  return localBuildId();
}
