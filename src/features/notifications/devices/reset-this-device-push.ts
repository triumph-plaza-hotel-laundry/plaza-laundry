import OneSignal from 'react-onesignal';
import { getActiveDeviceByPlayerId } from '@/features/notifications/devices';
import {
  clearLocalDeviceLink,
  readLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';
import { requireSupabase } from '@/features/notifications/shared/supabase';
import { ONESIGNAL_SERVICE_WORKER } from '@/lib/onesignal/service-worker-config';
import {
  ensureOneSignalInitialized,
  resetOneSignalClientStateForResubscribe,
} from '@/lib/onesignal/client';
import { onesignalConfig } from '@/lib/onesignal/config';

const LOG = '[device-push-reset]';

export type DevicePushResetResult = {
  employeeId: string;
  oldPlayerId: string;
  newPlayerId: string;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readPlayerId(): string | null {
  try {
    const id = OneSignal.User.PushSubscription.id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

async function waitForNewPlayerId(
  previousId: string,
  timeoutMs = 20_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const id = readPlayerId();
    if (id && id !== previousId) {
      return id;
    }
    await sleep(400);
  }
  const finalId = readPlayerId();
  if (finalId && finalId !== previousId) {
    return finalId;
  }
  throw new Error(
    'A new OneSignal subscription id was not issued. Allow notifications and retry.',
  );
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Browser-local wipe for THIS device only.
 * Never touches other browsers, and never unregisters the root PWA worker.
 */
async function wipeThisBrowserPushStack(): Promise<void> {
  console.info(LOG, 'wiping local push stack');

  try {
    if (OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optOut();
      console.info(LOG, 'OneSignal optOut OK');
    }
  } catch (error) {
    console.warn(LOG, 'optOut skipped', error);
  }

  try {
    await OneSignal.logout();
    console.info(LOG, 'OneSignal logout OK');
  } catch (error) {
    console.warn(LOG, 'logout skipped', error);
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const script =
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL ||
        '';
      const isOneSignal =
        registration.scope.includes('/onesignal') ||
        script.includes('/onesignal/') ||
        script.includes('OneSignalSDKWorker');

      if (!isOneSignal) {
        continue;
      }

      try {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          console.info(LOG, 'PushSubscription unsubscribed', {
            scope: registration.scope,
          });
        }
      } catch (error) {
        console.warn(LOG, 'unsubscribe skipped', error);
      }

      try {
        await registration.unregister();
        console.info(LOG, 'OneSignal SW unregistered', {
          scope: registration.scope,
        });
      } catch (error) {
        console.warn(LOG, 'SW unregister skipped', error);
      }
    }
  }

  // Best-effort OneSignal / trace DB cleanup (origin-local only).
  await deleteDatabase('tpl-push-trace');
  await deleteDatabase('ONE_SIGNAL_SDK_DB');
  await deleteDatabase('ONE_SIGNAL_PAGE_SDK_DB');

  clearLocalDeviceLink();
  resetOneSignalClientStateForResubscribe();
}

async function createFreshSubscription(previousPlayerId: string): Promise<string> {
  if (!onesignalConfig.isConfigured) {
    throw new Error('OneSignal App ID is not configured');
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) {
    throw new Error('OneSignal failed to initialize after reset');
  }

  // Ensure dedicated worker is present before opt-in.
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(ONESIGNAL_SERVICE_WORKER.url, {
        scope: ONESIGNAL_SERVICE_WORKER.scope,
      });
    } catch (error) {
      console.warn(LOG, 'OneSignal SW register skipped', error);
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    throw new Error(
      'Notifications are blocked for this site. Reset permission in Chrome settings, then retry.',
    );
  }

  try {
    await OneSignal.User.PushSubscription.optIn();
  } catch (error) {
    console.warn(LOG, 'optIn error (may still get id)', error);
  }

  return waitForNewPlayerId(previousPlayerId, 20_000);
}

/**
 * Completely reset THIS phone's web push subscription and relink the same
 * laundry employee. Refuses to run unless this browser owns the active link.
 */
export async function resetThisDevicePushSubscription(): Promise<DevicePushResetResult> {
  if (typeof window === 'undefined') {
    throw new Error('Reset must run in the browser');
  }

  const local = readLocalDeviceLink();
  const initOk = await ensureOneSignalInitialized();
  if (!initOk) {
    throw new Error('OneSignal is not ready');
  }

  const oldPlayerId = readPlayerId() || local?.onesignalPlayerId || null;
  if (!oldPlayerId) {
    throw new Error('No OneSignal subscription id found on this phone');
  }

  const active = await getActiveDeviceByPlayerId(oldPlayerId);
  const employeeId =
    active?.employeeId || local?.laundryEmployeeId || null;

  if (!employeeId) {
    throw new Error(
      'This phone is not linked to an employee. Use Admin QR pairing instead.',
    );
  }

  if (active && active.playerId !== oldPlayerId) {
    throw new Error('Server link does not match this phone — aborting');
  }

  if (!active) {
    throw new Error(
      'No active server link for this subscription. Ask Admin to Generate QR and pair again.',
    );
  }

  console.info(LOG, 'starting scoped reset', {
    employeeId,
    oldPlayerId,
  });

  await wipeThisBrowserPushStack();

  const newPlayerId = await createFreshSubscription(oldPlayerId);
  if (newPlayerId === oldPlayerId) {
    throw new Error(
      'Browser reused the old subscription id. Clear site data for this origin and retry.',
    );
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc(
    'rotate_notification_device_subscription',
    {
      p_employee_id: employeeId,
      p_old_player_id: oldPlayerId,
      p_new_player_id: newPlayerId,
      p_device_id: 'web',
      p_device_name:
        typeof navigator !== 'undefined'
          ? navigator.userAgent.slice(0, 80)
          : 'web',
      p_browser: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_operating_system:
        typeof navigator !== 'undefined' ? navigator.platform : null,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.employee_id || !row?.player_id) {
    throw new Error('Server rotate failed');
  }

  writeLocalDeviceLink({
    linked: true,
    onesignalPlayerId: row.player_id as string,
    laundryEmployeeId: row.employee_id as string,
    pairedAt: new Date().toISOString(),
  });

  console.info(LOG, 'reset complete', {
    employeeId: row.employee_id,
    oldPlayerId,
    newPlayerId: row.player_id,
  });

  return {
    employeeId: row.employee_id as string,
    oldPlayerId,
    newPlayerId: row.player_id as string,
  };
}
