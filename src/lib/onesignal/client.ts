import OneSignal from 'react-onesignal';
import { onesignalConfig } from '@/lib/onesignal/config';
import { readLocalDeviceLink } from '@/features/employee-devices/local-device-link';
import { platformLog } from '@/lib/notification-platform';
import { installPushTraceClient, pushTrace } from '@/lib/onesignal/push-trace';
import {
  onesignalAdminExternalId,
  onesignalEmployeeExternalId,
} from '@/lib/onesignal/identity';

let initPromise: Promise<boolean> | null = null;
let changeListenerBound = false;
let activeExternalId: string | null = null;
let permissionPromptInFlight: Promise<boolean> | null = null;
let lastKnownSubscriptionId: string | null = null;

/**
 * Allow a full re-subscribe after wiping this browser's push stack.
 * Does not touch other devices.
 */
export function resetOneSignalClientStateForResubscribe(): void {
  initPromise = null;
  changeListenerBound = false;
  permissionPromptInFlight = null;
  lastKnownSubscriptionId = null;
  activeExternalId = null;
  logStep('client state reset for resubscribe');
}

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

async function persistCurrentSubscription(): Promise<void> {
  const playerId = getPushSubscriptionId();
  if (!playerId) {
    logFail(
      'persist subscription',
      'PushSubscription.id is empty (permission may still be pending)',
    );
    return;
  }

  const localLink = readLocalDeviceLink();
  logStep('subscription ready (no pool upsert)', {
    playerId,
    activeExternalId,
    laundryEmployeeId: localLink?.laundryEmployeeId ?? null,
    linked: Boolean(localLink?.linked),
    deviceLabel: detectDeviceLabel(),
  });
}

async function loginOneSignalExternalId(externalId: string): Promise<void> {
  try {
    logStep('OneSignal.login()', externalId);
    await OneSignal.login(externalId);
    activeExternalId = externalId;
    logStep('OneSignal.login() OK', externalId);
  } catch (loginError) {
    const message =
      loginError instanceof Error
        ? loginError.message
        : String(loginError ?? '');
    const is409 = /\b409\b/.test(message) || /conflict/i.test(message);
    if (is409) {
      logFail(
        'OneSignal.login 409 — identity already exists on another User; not transferring',
        message,
      );
      return;
    }
    throw loginError;
  }
}

function isThisBrowserEmployeeLinked(): boolean {
  const local = readLocalDeviceLink();
  return Boolean(local?.linked && local.laundryEmployeeId);
}

async function bindSubscriptionChangeListener() {
  if (changeListenerBound) {
    return;
  }

  changeListenerBound = true;

  try {
    OneSignal.User.PushSubscription.addEventListener('change', (event) => {
      const nextIdRaw = event.current?.id;
      const nextId =
        typeof nextIdRaw === 'string' && nextIdRaw.trim()
          ? nextIdRaw.trim()
          : null;
      if (!nextId) {
        return;
      }

      const previousId = lastKnownSubscriptionId;
      lastKnownSubscriptionId = nextId;
      const localLink = readLocalDeviceLink();
      platformLog('subscription', 'player id changed — refresh in place if linked', {
        previousId,
        nextId,
        linkedEmployeeId: localLink?.laundryEmployeeId ?? null,
      });

      // Linked device only: UPDATE existing row. Never claim / never create.
      if (localLink?.linked && localLink.laundryEmployeeId) {
        void import('@/features/notifications/devices/refresh-player-id').then(
          ({ refreshLinkedPlayerId }) =>
            refreshLinkedPlayerId({
              newPlayerId: nextId,
              previousPlayerId: previousId ?? localLink.onesignalPlayerId,
            }),
        );
      }
    });
  } catch (error) {
    logFail('bind subscription change listener', error);
  }

  try {
    // Deep-link: open Notification Center for the tapped inbox row (never home-only).
    OneSignal.Notifications.addEventListener('click', (event) => {
      const notification = event?.notification as
        | {
            title?: string;
            notificationId?: string;
            additionalData?: Record<string, unknown>;
          }
        | undefined;
      const additional = notification?.additionalData ?? {};
      const inboxIdRaw = additional.inbox_id;
      const inboxId =
        typeof inboxIdRaw === 'string' ? inboxIdRaw.trim() : '';

      platformLog('subscription', 'notification click — open inbox deep link', {
        inboxId: inboxId || null,
      });
      pushTrace('onesignal-click-bound-listener', {
        title: notification?.title ?? null,
        notificationId: notification?.notificationId ?? null,
        inboxId: inboxId || null,
        additionalDataKeys: Object.keys(additional),
      });

      if (inboxId) {
        void import('@/lib/notifications/open-notification').then(
          ({ requestOpenNotification }) => {
            requestOpenNotification(inboxId);
          },
        );
      }
    });
  } catch (error) {
    logFail('bind notification click listener', error);
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
        logStep('init starting', {
          appIdPrefix: `${onesignalConfig.appId.slice(0, 8)}…`,
          origin: window.location.origin,
          localhost: isLocalhostOrigin(),
          serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
          serviceWorkerScope: '/onesignal/',
          serviceWorkerOverrideForTypical: true,
        });

        if (import.meta.env.DEV) {
          OneSignal.Debug.setLogLevel('debug');
        }

        await OneSignal.init({
          appId: onesignalConfig.appId,
          allowLocalhostAsSecureOrigin: isLocalhostOrigin(),
          // Required: without this flag the SDK ignores local SW path/scope and
          // falls back to the dashboard Typical defaults (/OneSignalSDKWorker.js).
          serviceWorkerOverrideForTypical: true,
          serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/onesignal/' },
          // Keep the same browser subscribed; Player ID changes update the
          // existing device row — they never create a second link.
          autoResubscribe: true,
          // Navigate to payload url/web_url (?openNotification=…) so clicks
          // deep-link into Notification Center instead of only focusing home.
          notificationClickHandlerAction: 'navigate',
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
        // TEMP: wire push/SW/OneSignal stage tracers for delivery diagnosis.
        void installPushTraceClient();
        pushTrace('onesignal-init-ok', {
          origin: window.location.origin,
          playerId: getPushSubscriptionId(),
          localLink: readLocalDeviceLink(),
        });
        // Restore local device link from server if player_id still maps,
        // or keep/repair cache when this phone is already employee-linked.
        void import('@/features/notifications/pairing/reconcile-local-link').then(
          ({ reconcileLocalDeviceLink }) => reconcileLocalDeviceLink(),
        );

        return true;
      } catch (error) {
        // Another caller (e.g. main bootstrap) may have already initialized the
        // shared SDK. Reuse that instance instead of reporting a false failure.
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : '';
        const alreadyInitialized = /already (been )?init/i.test(message);

        if (alreadyInitialized) {
          logStep('OneSignal already initialized — reusing shared instance');
          bindSubscriptionChangeListener();
          return true;
        }

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
 * Bind this browser's OneSignal User to a laundry employee identity.
 * Used after QR claim / this-device push reset. Never uses admin ids.
 */
export async function ensureEmployeeOneSignalIdentity(
  laundryEmployeeId: string,
): Promise<void> {
  const externalId = onesignalEmployeeExternalId(laundryEmployeeId);
  logStep('ensure employee identity', { laundryEmployeeId, externalId });

  if (!onesignalConfig.isConfigured) {
    logFail('ensure employee identity', 'VITE_ONESIGNAL_APP_ID is not configured');
    return;
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) {
    logFail('ensure employee identity', 'OneSignal.init failed');
    return;
  }

  await loginOneSignalExternalId(externalId);
  lastKnownSubscriptionId = getPushSubscriptionId();
  await persistCurrentSubscription();
}

/**
 * Admin-only push registration for a non-employee-linked browser.
 * Hard no-op when this device is an employee notification endpoint.
 */
export async function registerAdminOneSignalPush(
  adminUserId: string,
): Promise<void> {
  const externalId = onesignalAdminExternalId(adminUserId);
  logStep('register admin push', { adminUserId, externalId });

  if (!adminUserId) {
    logFail('register admin push', 'adminUserId is empty');
    return;
  }

  if (isThisBrowserEmployeeLinked()) {
    const local = readLocalDeviceLink();
    logStep(
      'register admin push skipped — this device is employee-linked',
      {
        laundryEmployeeId: local?.laundryEmployeeId,
        playerId: local?.onesignalPlayerId,
        refusedAdminId: adminUserId,
      },
    );
    // Keep the employee identity authoritative on this phone.
    if (local?.laundryEmployeeId) {
      await ensureEmployeeOneSignalIdentity(local.laundryEmployeeId);
    }
    return;
  }

  if (!onesignalConfig.isConfigured) {
    logFail('register admin push', 'VITE_ONESIGNAL_APP_ID is not configured');
    return;
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) {
    logFail('register admin push', 'OneSignal.init failed');
    return;
  }

  if (!OneSignal.Notifications.isPushSupported()) {
    logFail('register admin push', 'push not supported');
    return;
  }

  try {
    await loginOneSignalExternalId(externalId);

    const permitted = await requestBrowserPushPermission();
    if (!permitted) {
      logFail('register admin push', 'notification permission not granted');
      return;
    }

    try {
      if (!OneSignal.User.PushSubscription.optedIn) {
        await OneSignal.User.PushSubscription.optIn();
      }
    } catch (error) {
      logFail('admin PushSubscription.optIn()', error);
    }

    lastKnownSubscriptionId = getPushSubscriptionId();
    await persistCurrentSubscription();
    logStep('register admin push complete', {
      externalId,
      playerId: lastKnownSubscriptionId,
    });
  } catch (error) {
    logFail('register admin push', error);
  }
}

/**
 * Admin logout only. Never runs OneSignal.logout on an employee-linked phone.
 */
export async function clearAdminOneSignalSession(): Promise<void> {
  if (!onesignalConfig.isConfigured) {
    activeExternalId = null;
    return;
  }

  if (isThisBrowserEmployeeLinked()) {
    platformLog(
      'subscription',
      'Admin logout ignored — employee push subscription preserved',
    );
    logStep('clearAdminOneSignalSession skipped — employee-linked device');
    return;
  }

  activeExternalId = null;

  try {
    const ready = await ensureOneSignalInitialized();
    if (ready) {
      await OneSignal.logout();
      logStep('OneSignal.logout() OK (admin session)');
    }
  } catch (error) {
    logFail('clearAdminOneSignalSession', error);
  }
}

/**
 * @deprecated Use ensureEmployeeOneSignalIdentity / registerAdminOneSignalPush.
 * Kept as a safe no-op router so older call sites cannot bind admin→employee.
 */
export async function registerOneSignalForEmployee(
  adminOrUserId: string,
  options?: { laundryEmployeeId?: string | null },
): Promise<void> {
  if (isThisBrowserEmployeeLinked()) {
    const local = readLocalDeviceLink();
    if (local?.laundryEmployeeId) {
      await ensureEmployeeOneSignalIdentity(local.laundryEmployeeId);
    }
    return;
  }

  // Prefer explicit laundry employee only when THIS browser is pairing as that
  // employee — never map primary-admin id onto an employee subscription.
  if (options?.laundryEmployeeId) {
    logStep(
      'legacy register ignored laundryEmployeeId on non-linked browser — using admin identity',
      {
        adminOrUserId,
        laundryEmployeeId: options.laundryEmployeeId,
      },
    );
  }

  await registerAdminOneSignalPush(adminOrUserId);
}

/**
 * @deprecated Use clearAdminOneSignalSession.
 */
export async function unregisterOneSignalForEmployee(
  _employeeId?: string | null,
): Promise<void> {
  await clearAdminOneSignalSession();
}
