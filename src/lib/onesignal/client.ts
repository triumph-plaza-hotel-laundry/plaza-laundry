import OneSignal from 'react-onesignal';
import { onesignalConfig } from '@/lib/onesignal/config';
import {
  removeOneSignalSubscriptionsForEmployee,
  upsertOneSignalSubscription,
} from '@/lib/onesignal/subscriptions-repository';

const ONESIGNAL_SW_PATH = '/onesignal/OneSignalSDKWorker.js';
const ONESIGNAL_SW_SCOPE = '/onesignal/';

let initPromise: Promise<boolean> | null = null;
let changeListenerBound = false;
let activeEmployeeId: string | null = null;
let activeLaundryEmployeeId: string | null = null;

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

async function verifyServiceWorkerSetup(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    logFail('service worker support', 'navigator.serviceWorker is unavailable');
    return false;
  }

  try {
    const swResponse = await fetch(ONESIGNAL_SW_PATH, { cache: 'no-store' });
    if (!swResponse.ok) {
      logFail(
        'service worker file fetch',
        `${ONESIGNAL_SW_PATH} → HTTP ${swResponse.status}`,
      );
      return false;
    }
    logStep('service worker file reachable', ONESIGNAL_SW_PATH);
  } catch (error) {
    logFail('service worker file fetch', error);
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const onesignalRegistration = registrations.find((registration) => {
    const scriptUrl =
      registration.active?.scriptURL ||
      registration.installing?.scriptURL ||
      registration.waiting?.scriptURL ||
      '';
    return (
      scriptUrl.includes('OneSignalSDKWorker') ||
      registration.scope.includes('/onesignal/')
    );
  });

  if (!onesignalRegistration) {
    logFail(
      'service worker registration',
      {
        message: 'No OneSignal service worker registration found yet',
        scopes: registrations.map((registration) => registration.scope),
      },
    );
    // Not always fatal immediately after init — OneSignal may register async.
    return false;
  }

  logStep('service worker registered', {
    scope: onesignalRegistration.scope,
    scriptURL:
      onesignalRegistration.active?.scriptURL ||
      onesignalRegistration.installing?.scriptURL ||
      onesignalRegistration.waiting?.scriptURL,
  });
  return true;
}

/**
 * Soft prompt → native browser permission.
 * Direct requestPermission() from useEffect is often blocked on Chromium (no user gesture).
 */
async function requestBrowserPushPermission(): Promise<boolean> {
  const nativeBefore = OneSignal.Notifications.permissionNative;
  logStep('browser permission before prompt', {
    permissionNative: nativeBefore,
    permission: OneSignal.Notifications.permission,
    NotificationPermission:
      typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
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

  // Step: show OneSignal slidedown (creates the user gesture Chromium requires).
  try {
    logStep('calling OneSignal.Slidedown.promptPush({ force: true })');
    await OneSignal.Slidedown.promptPush({ force: true });
    logStep('Slidedown.promptPush finished', {
      permissionNative: OneSignal.Notifications.permissionNative,
      permission: OneSignal.Notifications.permission,
    });
  } catch (error) {
    logFail('Slidedown.promptPush', error);
    logStep('falling back to Notifications.requestPermission()');
    try {
      const allowed = await OneSignal.Notifications.requestPermission();
      logStep('requestPermission result', allowed);
      return Boolean(allowed);
    } catch (requestError) {
      logFail('Notifications.requestPermission', requestError);
      return false;
    }
  }

  // If slidedown closed without granting, try native once more (may still be blocked).
  if (OneSignal.Notifications.permissionNative === 'default') {
    logStep(
      'permission still default after Slidedown — calling Notifications.requestPermission()',
    );
    try {
      const allowed = await OneSignal.Notifications.requestPermission();
      logStep('requestPermission result', allowed);
      return Boolean(allowed);
    } catch (requestError) {
      logFail('Notifications.requestPermission', requestError);
      return false;
    }
  }

  return OneSignal.Notifications.permissionNative === 'granted';
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
        logStep('init starting', {
          appIdPrefix: `${onesignalConfig.appId.slice(0, 8)}…`,
          origin: window.location.origin,
          localhost: isLocalhostOrigin(),
          allowLocalhostAsSecureOrigin: isLocalhostOrigin(),
          serviceWorkerPath: ONESIGNAL_SW_PATH,
          serviceWorkerScope: ONESIGNAL_SW_SCOPE,
        });

        if (import.meta.env.DEV) {
          OneSignal.Debug.setLogLevel('debug');
        }

        await OneSignal.init({
          appId: onesignalConfig.appId,
          allowLocalhostAsSecureOrigin: isLocalhostOrigin(),
          serviceWorkerPath: ONESIGNAL_SW_PATH,
          serviceWorkerParam: { scope: ONESIGNAL_SW_SCOPE },
          autoResubscribe: true,
          // Disable automatic native prompt; we drive permission after login.
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

        // Give the SDK a brief moment to finish SW registration.
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        await verifyServiceWorkerSetup();

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
 * Registers the current browser with OneSignal for a logged-in staff user
 * and upserts the subscription id into Supabase.
 */
export async function registerOneSignalForEmployee(
  employeeId: string,
  options?: { laundryEmployeeId?: string | null },
): Promise<void> {
  logStep('register start', { employeeId, laundryEmployeeId: options?.laundryEmployeeId });

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

    // Ensure subscription is opted in after permission grant.
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
