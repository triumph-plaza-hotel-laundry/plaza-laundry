import OneSignal from 'react-onesignal';
import {
  ensureOneSignalInitialized,
  bootstrapOneSignalWebPush,
} from '@/lib/onesignal';
import { onesignalConfig } from '@/lib/onesignal/config';
import { ONESIGNAL_SERVICE_WORKER } from '@/lib/onesignal/service-worker-config';
import { notificationPlatformConfig } from '@/lib/notification-platform/config';
import { reconcileLocalDeviceLinkCache } from '@/lib/notification-platform/local-cache-guardian';
import { onSubscriptionIdChanged } from '@/lib/notification-platform/live-subscription-sync';
import { platformLog } from '@/lib/notification-platform/logger';
import { ensureOneSignalServiceWorker } from '@/lib/notification-platform/service-worker-guardian';
import type {
  HealthStatus,
  RecoveryTrigger,
} from '@/lib/notification-platform/types';
import { readLocalDeviceLink } from '@/features/employee-devices/local-device-link';
import { getOrCreatePrimaryAdminDeviceId } from '@/features/primary-admin-device/local-device-id';
import { healPrimaryAdminSubscriptionIfSameDevice } from '@/features/primary-admin-device/primary-admin-device-service';

const BUILD_STORAGE_KEY = 'tpl-notification-platform-build-id';

type EngineState = {
  running: boolean;
  lastTrigger: RecoveryTrigger | null;
  lastPassAt: string | null;
  lastRepairAt: string | null;
  lastSyncAt: string | null;
  lastStatus: HealthStatus;
  lastMessage: string;
  passInFlight: boolean;
  listenersBound: boolean;
};

const state: EngineState = {
  running: false,
  lastTrigger: null,
  lastPassAt: null,
  lastRepairAt: null,
  lastSyncAt: null,
  lastStatus: 'warning',
  lastMessage: 'Engine not started',
  passInFlight: false,
  listenersBound: false,
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readPermission(): NotificationPermission | 'unavailable' {
  if (typeof Notification !== 'undefined') {
    return Notification.permission;
  }
  try {
    return OneSignal.Notifications.permissionNative;
  } catch {
    return 'unavailable';
  }
}

function readSubscriptionId(): string | null {
  try {
    const id = OneSignal.User.PushSubscription.id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'web';
  }
  const ua = navigator.userAgent;
  const isIpad =
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIpad || /Tablet|Android(?!.*Mobile)/i.test(ua)) {
    return 'tablet-web';
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) {
    return 'mobile-web';
  }
  return 'desktop-web';
}

async function waitForSubscriptionId(timeoutMs: number): Promise<string | null> {
  const existing = readSubscriptionId();
  if (existing) {
    return existing;
  }

  return new Promise((resolve) => {
    let settled = false;
    let pollId = 0;
    let timerId = 0;

    const finish = (id: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timerId);
      try {
        OneSignal.User.PushSubscription.removeEventListener('change', onChange);
      } catch {
        // ignore
      }
      resolve(id);
    };

    const onChange = (event: { current?: { id?: string | null } }) => {
      const nextId = event.current?.id;
      if (typeof nextId === 'string' && nextId.trim()) {
        finish(nextId.trim());
      }
    };

    try {
      OneSignal.User.PushSubscription.addEventListener('change', onChange);
    } catch {
      // ignore
    }

    pollId = window.setInterval(() => {
      const id = readSubscriptionId();
      if (id) {
        finish(id);
      }
    }, 300);

    timerId = window.setTimeout(() => finish(readSubscriptionId()), timeoutMs);
  });
}

async function softRecoverMissingSubscription(): Promise<string | null> {
  const permission = readPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    if (OneSignal.User.PushSubscription.optedIn !== true) {
      void OneSignal.User.PushSubscription.optIn().catch(() => undefined);
    }
  } catch {
    // ignore
  }

  return waitForSubscriptionId(4_000);
}

function checkVersionBump(): boolean {
  try {
    const previous = window.localStorage.getItem(BUILD_STORAGE_KEY);
    const current = notificationPlatformConfig.buildId;
    if (previous !== current) {
      window.localStorage.setItem(BUILD_STORAGE_KEY, current);
      return Boolean(previous);
    }
  } catch {
    // ignore
  }
  return false;
}

export function getEngineSnapshot() {
  return { ...state };
}

/**
 * Run one recovery pass. Safe to call repeatedly; concurrent calls coalesce.
 */
export async function runRecoveryPass(
  trigger: RecoveryTrigger,
): Promise<HealthStatus> {
  if (!notificationPlatformConfig.isEnabled) {
    state.lastStatus = 'warning';
    state.lastMessage = 'Platform disabled by kill switch';
    return state.lastStatus;
  }

  if (state.passInFlight) {
    return state.lastStatus;
  }

  state.passInFlight = true;
  state.lastTrigger = trigger;
  let repaired = false;

  try {
    platformLog('recovery', 'info', `Recovery pass starting (${trigger})`, {
      recoveryAction: 'run_recovery_pass',
      payload: { trigger },
    });

    if (!onesignalConfig.isConfigured) {
      state.lastStatus = 'broken';
      state.lastMessage = 'OneSignal App ID missing';
      return state.lastStatus;
    }

    const sw = await ensureOneSignalServiceWorker();
    if (sw.repaired) {
      repaired = true;
      state.lastRepairAt = new Date().toISOString();
    }

    const ready = await ensureOneSignalInitialized();
    if (!ready) {
      state.lastStatus = 'broken';
      state.lastMessage = 'OneSignal init failed';
      platformLog('recovery', 'error', 'OneSignal init failed during recovery', {
        recoveryAction: 'onesignal_init',
        finalStatus: 'broken',
      });
      return state.lastStatus;
    }

    const permission = readPermission();
    if (permission === 'denied') {
      state.lastStatus = 'broken';
      state.lastMessage = 'Notification permission denied';
      platformLog('permission', 'error', 'Permission permanently denied', {
        recoveryAction: 'permission_denied',
        finalStatus: 'broken',
      });
      return state.lastStatus;
    }

    if (permission === 'default') {
      // Do not force prompts outside user gesture / bootstrap — warn only.
      state.lastStatus = 'warning';
      state.lastMessage = 'Permission not granted yet';
    }

    let subscriptionId = readSubscriptionId();
    if (!subscriptionId && permission === 'granted') {
      subscriptionId = await softRecoverMissingSubscription();
      if (subscriptionId) {
        repaired = true;
        state.lastRepairAt = new Date().toISOString();
        platformLog('subscription', 'info', 'Recovered missing subscription id', {
          onesignalPlayerId: subscriptionId,
          recoveryAction: 'soft_optin_recover',
          finalStatus: 'ok',
        });
      } else {
        // Last resort: re-run anonymous bootstrap (no login).
        await bootstrapOneSignalWebPush();
        subscriptionId = await waitForSubscriptionId(3_000);
      }
    }

    if (subscriptionId) {
      const local = readLocalDeviceLink();
      let primaryAdminDeviceId: string | null = null;
      try {
        primaryAdminDeviceId = getOrCreatePrimaryAdminDeviceId();
      } catch {
        primaryAdminDeviceId = null;
      }

      // Always pass the previous linked/local id when it differs — otherwise
      // employee_linked_devices stays on a stale subscription and pushes
      // "succeed" in OneSignal without reaching the device.
      const previousFromLocal =
        local?.onesignalPlayerId &&
        local.onesignalPlayerId.trim() &&
        local.onesignalPlayerId.trim() !== subscriptionId
          ? local.onesignalPlayerId.trim()
          : null;

      await onSubscriptionIdChanged({
        previousId: previousFromLocal,
        nextId: subscriptionId,
        deviceLabel: detectDeviceLabel(),
        laundryEmployeeId: local?.laundryEmployeeId ?? null,
        adminEmployeeId: null,
        primaryAdminDeviceId,
      });

      void healPrimaryAdminSubscriptionIfSameDevice(subscriptionId);

      state.lastSyncAt = new Date().toISOString();
    }

    const cache = await reconcileLocalDeviceLinkCache();
    if (cache.repaired) {
      repaired = true;
      state.lastRepairAt = new Date().toISOString();
    }

    if (!subscriptionId && permission === 'granted') {
      state.lastStatus = 'warning';
      state.lastMessage = 'Permission granted but subscription id missing';
    } else if (repaired || sw.status === 'recovering' || cache.status === 'recovering') {
      state.lastStatus = 'recovering';
      state.lastMessage = 'Recovery actions applied';
    } else if (permission === 'default') {
      state.lastStatus = 'warning';
      state.lastMessage = 'Awaiting notification permission';
    } else {
      state.lastStatus = 'healthy';
      state.lastMessage = 'Notification platform healthy';
    }

    state.lastPassAt = new Date().toISOString();
    platformLog('recovery', 'info', `Recovery pass finished (${state.lastStatus})`, {
      recoveryAction: 'run_recovery_pass',
      finalStatus: state.lastStatus,
      payload: {
        trigger,
        subscriptionId,
        permission,
        sw: sw.message,
        cache: cache.message,
      },
    });

    return state.lastStatus;
  } catch (error) {
    state.lastStatus = 'broken';
    state.lastMessage =
      error instanceof Error ? error.message : 'Recovery pass failed';
    platformLog('recovery', 'error', 'Recovery pass failed', {
      recoveryAction: 'run_recovery_pass',
      finalStatus: 'broken',
      payload: { message: state.lastMessage, trigger },
    });
    return state.lastStatus;
  } finally {
    state.passInFlight = false;
  }
}

function bindLifecycleListeners() {
  if (state.listenersBound || typeof window === 'undefined') {
    return;
  }
  state.listenersBound = true;

  window.addEventListener('online', () => {
    void runRecoveryPass('online');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void runRecoveryPass('resume');
    }
  });

  window.addEventListener('focus', () => {
    void runRecoveryPass('resume');
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      void runRecoveryPass('resume');
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      void runRecoveryPass('service_worker_change');
    });
  }

  try {
    OneSignal.Notifications.addEventListener('permissionChange', () => {
      void runRecoveryPass('permission_change');
    });
  } catch {
    // SDK may not be ready yet; recovery on init covers this.
  }
}

/**
 * Start the background self-healing engine once per page lifetime.
 */
export function startNotificationPlatform(options?: {
  trigger?: RecoveryTrigger;
}): void {
  if (!notificationPlatformConfig.isEnabled) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const trigger = options?.trigger ?? 'app_start';
  state.running = true;
  bindLifecycleListeners();

  const versionBumped = checkVersionBump();
  void (async () => {
    await sleep(500);
    await runRecoveryPass(versionBumped ? 'version_update' : trigger);
  })();
}

export function getExpectedOneSignalWorkerPath() {
  return ONESIGNAL_SERVICE_WORKER;
}
