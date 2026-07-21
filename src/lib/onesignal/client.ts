import OneSignal from 'react-onesignal';
import { onesignalConfig } from '@/lib/onesignal/config';
import {
  removeOneSignalSubscriptionsForEmployee,
  upsertOneSignalSubscription,
} from '@/lib/onesignal/subscriptions-repository';
import { ONESIGNAL_SERVICE_WORKER } from '@/lib/onesignal/service-worker-config';

let initPromise: Promise<boolean> | null = null;
let changeListenerBound = false;
let activeEmployeeId: string | null = null;
let activeLaundryEmployeeId: string | null = null;
let permissionPromptInFlight: Promise<boolean> | null = null;

function logStep(step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info(`[onesignal] ${step}`, detail);
    return;
  }
  console.info(`[onesignal] ${step}`);
}

function logFail(step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.error(`[onesignal] FAIL @ ${step}`, detail);
    return;
  }
  console.error(`[onesignal] FAIL @ ${step}`);
}

function isLocalhostOrigin(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'web';
  }

  const ua = navigator.userAgent;
  const isIpad =
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTablet = isIpad || /Tablet|Android(?!.*Mobile)/i.test(ua);
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile/i.test(ua);

  if (isTablet) {
    return 'tablet-web';
  }

  if (isMobile) {
    return 'mobile-web';
  }

  return 'desktop-web';
}

function getNativePermission(): NotificationPermission {
  if (typeof Notification !== 'undefined') {
    return Notification.permission;
  }

  try {
    return OneSignal.Notifications.permissionNative;
  } catch {
    return 'default';
  }
}

function getPushSubscriptionId(): string | null {
  try {
    const id = OneSignal.User.PushSubscription.id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

async function persistCurrentSubscription(employeeId: string): Promise<void> {
  const playerId = getPushSubscriptionId();
  if (!playerId) {
    logFail(
      'persist subscription',
      'PushSubscription.id is empty (permission may still be pending)',
    );
    return;
  }

  await upsertOneSignalSubscription({
    employeeId,
    onesignalPlayerId: playerId,
    device: detectDeviceLabel(),
    laundryEmployeeId: activeLaundryEmployeeId,
  });
  logStep('persist subscription OK', {
    playerId,
    employeeId,
    laundryEmployeeId: activeLaundryEmployeeId,
  });
}

function bindSubscriptionChangeListener() {
  if (changeListenerBound) {
    return;
  }

  changeListenerBound = true;

  try {
    OneSignal.User.PushSubscription.addEventListener('change', (event) => {
      const employeeId = activeEmployeeId;
      const nextId = event.current?.id;
      if (!employeeId || !nextId) {
        return;
      }

      void upsertOneSignalSubscription({
        employeeId,
        onesignalPlayerId: nextId,
        device: detectDeviceLabel(),
        laundryEmployeeId: activeLaundryEmployeeId,
      });
    });
  } catch (error) {
    logFail('bind subscription change listener', error);
  }
}

/**
 * Registers the dedicated OneSignal worker under /onesignal/ before SDK init.
 * This avoids racing the root-scoped PWA worker (/sw.js).
 */
async function ensureOneSignalServiceWorkerRegistered(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    logFail('service worker support', 'navigator.serviceWorker is unavailable');
    return false;
  }

  const { url, scope, path } = ONESIGNAL_SERVICE_WORKER;

  try {
    const swResponse = await fetch(url, { cache: 'no-store' });
    if (!swResponse.ok) {
      logFail('service worker file fetch', `${url} → HTTP ${swResponse.status}`);
      return false;
    }
    logStep('service worker file reachable', url);
  } catch (error) {
    logFail('service worker file fetch', error);
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register(url, { scope });
    logStep('service worker register() OK', {
      path,
      scope: registration.scope,
      scriptURL:
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL,
    });
    return true;
  } catch (error) {
    logFail('service worker register()', error);
    return false;
  }
}

async function logActiveServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  logStep(
    'active service workers',
    registrations.map((registration) => ({
      scope: registration.scope,
      scriptURL:
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL,
    })),
  );
}

/**
 * Soft prompt (Slidedown) → native browser permission.
 * Chromium often blocks bare requestPermission() without a user gesture;
 * Slidedown supplies that gesture when the user clicks Allow.
 */
async function requestBrowserPushPermission(): Promise<boolean> {
  if (permissionPromptInFlight) {
    return permissionPromptInFlight;
  }

  permissionPromptInFlight = (async () => {
    const nativeBefore = getNativePermission();
    logStep('browser permission before prompt', {
      permissionNative: nativeBefore,
      NotificationPermission: nativeBefore,
    });

    if (nativeBefore === 'granted') {
      logStep('permission already granted — skipping prompt');
      return true;
    }

    if (nativeBefore === 'denied') {
      logFail(
        'browser permission request',
        'Notification permission is permanently denied for this origin. Reset it in browser site settings, then reload.',
      );
      return false;
    }

    try {
      logStep('calling OneSignal.Slidedown.promptPush({ force: true })');
      await OneSignal.Slidedown.promptPush({ force: true });
      logStep('Slidedown.promptPush finished', {
        permissionNative: getNativePermission(),
      });
    } catch (error) {
      logFail('Slidedown.promptPush', error);
    }

    if (getNativePermission() === 'granted') {
      return true;
    }

    if (getNativePermission() === 'denied') {
      return false;
    }

    // Fallback: native API (may be gesture-gated on Chromium).
    try {
      logStep('falling back to Notifications.requestPermission()');
      const allowed = await OneSignal.Notifications.requestPermission();
      logStep('requestPermission result', allowed);
      if (allowed) {
        return true;
      }
    } catch (requestError) {
      logFail('Notifications.requestPermission', requestError);
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        logStep('Notification.requestPermission result', result);
        return result === 'granted';
      } catch (nativeError) {
        logFail('Notification.requestPermission', nativeError);
      }
    }

    return getNativePermission() === 'granted';
  })();

  try {
    return await permissionPromptInFlight;
  } finally {
    permissionPromptInFlight = null;
  }
}

/**
 * Initializes the OneSignal Web SDK once (no-op when App ID is missing).
 * Safe to call repeatedly.
 */
export function ensureOneSignalInitialized(): Promise<boolean> {
  if (!onesignalConfig.isConfigured) {
    logFail(
      'config',
      'VITE_ONESIGNAL_APP_ID is missing — restart vite after editing .env.local',
    );
    return Promise.resolve(false);
  }

  if (typeof window === 'undefined') {
    logFail('environment', 'window is undefined');
    return Promise.resolve(false);
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const swConfig = ONESIGNAL_SERVICE_WORKER;

        logStep('init starting', {
          appIdPrefix: `${onesignalConfig.appId.slice(0, 8)}…`,
          origin: window.location.origin,
          localhost: isLocalhostOrigin(),
          serviceWorkerPath: swConfig.path,
          serviceWorkerScope: swConfig.scope,
        });

        const swRegistered = await ensureOneSignalServiceWorkerRegistered();
        if (!swRegistered) {
          logFail(
            'init',
            'OneSignal service worker could not be registered (PWA root worker is separate and OK)',
          );
          // Continue — OneSignal.init may still register the worker itself.
        }

        if (import.meta.env.DEV) {
          OneSignal.Debug.setLogLevel('debug');
        }

        await OneSignal.init({
          appId: onesignalConfig.appId,
          allowLocalhostAsSecureOrigin: isLocalhostOrigin(),
          serviceWorkerPath: swConfig.path,
          serviceWorkerParam: { scope: swConfig.scope },
          autoResubscribe: true,
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: 'push',
                  autoPrompt: false,
                  delay: { pageViews: 1, timeDelay: 0 },
                  text: {
                    actionMessage:
                      'Enable shift notifications for Triumph Plaza Laundry.',
                    acceptButton: 'Allow',
                    cancelButton: 'Later',
                  },
                },
              ],
            },
          },
          welcomeNotification: {
            disable: true,
            message: '',
          },
          ...(onesignalConfig.safariWebId
            ? { safari_web_id: onesignalConfig.safariWebId }
            : {}),
        });

        logStep('OneSignal.init() OK');
        bindSubscriptionChangeListener();
        await logActiveServiceWorkers();

        return true;
      } catch (error) {
        initPromise = null;
        logFail('OneSignal.init()', error);
        return false;
      }
    })();
  }

  return initPromise;
}

/**
 * Initializes OneSignal and requests notification permission once for new users
 * (while Notification.permission is still "default").
 */
export async function bootstrapOneSignalWebPush(): Promise<void> {
  logStep('bootstrap starting');

  const ready = await ensureOneSignalInitialized();
  if (!ready) {
    logFail('bootstrap', 'OneSignal.init did not complete successfully');
    return;
  }

  if (!OneSignal.Notifications.isPushSupported()) {
    logFail(
      'bootstrap',
      'OneSignal.Notifications.isPushSupported() returned false for this browser',
    );
    return;
  }

  const permissionNative = getNativePermission();
  if (permissionNative !== 'default') {
    logStep('bootstrap skip — permission already decided', permissionNative);
    return;
  }

  const permitted = await requestBrowserPushPermission();
  if (permitted) {
    logStep('bootstrap complete — permission granted');
  } else {
    logStep('bootstrap complete — permission not granted', getNativePermission());
  }
}

/**
 * Registers the current browser with OneSignal for a logged-in staff user
 * and upserts the subscription id into Supabase.
 */
export async function registerOneSignalForEmployee(
  employeeId: string,
  options?: { laundryEmployeeId?: string | null },
): Promise<void> {
  logStep('register start', {
    employeeId,
    laundryEmployeeId: options?.laundryEmployeeId,
  });

  if (!employeeId) {
    logFail('register', 'employeeId is empty');
    return;
  }

  if (!onesignalConfig.isConfigured) {
    logFail('register', 'VITE_ONESIGNAL_APP_ID is not configured');
    return;
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) {
    logFail('register', 'OneSignal.init did not complete successfully');
    return;
  }

  if (!OneSignal.Notifications.isPushSupported()) {
    logFail(
      'push support',
      'OneSignal.Notifications.isPushSupported() returned false for this browser',
    );
    return;
  }
  logStep('push is supported');

  activeEmployeeId = employeeId;
  activeLaundryEmployeeId = options?.laundryEmployeeId ?? null;

  try {
    logStep('OneSignal.login()', employeeId);
    await OneSignal.login(employeeId);
    logStep('OneSignal.login() OK');

    const permitted = await requestBrowserPushPermission();
    if (!permitted) {
      logFail(
        'permission prompt',
        'User did not grant notification permission (or browser blocked the prompt)',
      );
      return;
    }

    try {
      if (!OneSignal.User.PushSubscription.optedIn) {
        logStep('PushSubscription.optIn()');
        await OneSignal.User.PushSubscription.optIn();
      }
    } catch (error) {
      logFail('PushSubscription.optIn()', error);
    }

    await persistCurrentSubscription(employeeId);
    logStep('register complete');
  } catch (error) {
    logFail('register', error);
  }
}

/**
 * Removes the current device subscription from Supabase and clears OneSignal identity.
 */
export async function unregisterOneSignalForEmployee(
  employeeId?: string | null,
): Promise<void> {
  if (!onesignalConfig.isConfigured) {
    activeEmployeeId = null;
    return;
  }

  const playerId = getPushSubscriptionId();
  const targetEmployeeId = employeeId ?? activeEmployeeId;
  activeEmployeeId = null;
  activeLaundryEmployeeId = null;

  try {
    if (targetEmployeeId) {
      await removeOneSignalSubscriptionsForEmployee(
        targetEmployeeId,
        playerId,
      );
    }

    const ready = await ensureOneSignalInitialized();
    if (ready) {
      await OneSignal.logout();
      logStep('OneSignal.logout() OK');
    }
  } catch (error) {
    logFail('unregister', error);
  }
}
