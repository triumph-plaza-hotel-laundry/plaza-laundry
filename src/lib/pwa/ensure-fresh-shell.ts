/**
 * Detect a stale PWA app shell and force a one-time reclaim.
 *
 * Why this exists:
 * Workbox precaches index.html. A phone with an old service worker keeps
 * serving the old HTML → old /assets/index-*.js → old pairing page without
 * diagnostics, even when Vercel production already has the new build.
 *
 * fetch('/') is intercepted by that same SW, so we cannot detect staleness
 * via HTML. Instead we compare a NetworkOnly /build.json to the compile-time id.
 */

declare const __TPL_BUILD_ID__: string;

const RECLAIM_FLAG = 'tpl-shell-reclaim';

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
 * clear app caches, and reload once this session.
 */
export async function ensureFreshAppShell(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (import.meta.env.DEV) return;

  const local = localBuildId();
  if (!local) return;

  // Expose for phone-side confirmation without DevTools.
  (
    window as Window & { __TPL_BUILD_ID__?: string }
  ).__TPL_BUILD_ID__ = local;

  if (sessionStorage.getItem(RECLAIM_FLAG) === local) {
    return;
  }

  const remote = await readRemoteBuildId();
  if (!remote || remote === local) {
    return;
  }

  console.warn('[pwa] Stale app shell — reclaiming', { local, remote });
  sessionStorage.setItem(RECLAIM_FLAG, local);
  await reclaimRootServiceWorker();
  window.location.reload();
}

export function getTplBuildId(): string {
  return localBuildId();
}
