import { getActiveLinkedDeviceByPlayerId } from '@/features/employee-devices/device-pairing-service';
import {
  clearLocalDeviceLink,
  readLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/employee-devices/local-device-link';
import { getCurrentOneSignalPlayerId } from '@/features/employee-devices/onesignal-pairing';
import { platformLog } from '@/lib/notification-platform/logger';
import type { HealthStatus } from '@/lib/notification-platform/types';

export type LocalCacheGuardianResult = {
  status: HealthStatus;
  message: string;
  repaired: boolean;
};

/**
 * Reconcile localStorage device-link cache with server active linked device.
 */
export async function reconcileLocalDeviceLinkCache(): Promise<LocalCacheGuardianResult> {
  try {
    const local = readLocalDeviceLink();
    const playerId = await getCurrentOneSignalPlayerId();

    if (!playerId) {
      if (local?.linked) {
        // Keep optimistic linked state briefly when subscription is not ready yet.
        return {
          status: 'warning',
          message: 'Local link present but subscription id not ready',
          repaired: false,
        };
      }
      return {
        status: 'healthy',
        message: 'No local link and no subscription id',
        repaired: false,
      };
    }

    const active = await getActiveLinkedDeviceByPlayerId(playerId);
    if (active) {
      const needsWrite =
        !local?.linked ||
        local.onesignalPlayerId !== playerId ||
        local.laundryEmployeeId !== active.laundryEmployeeId;

      if (needsWrite) {
        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: playerId,
          laundryEmployeeId: active.laundryEmployeeId,
          pairedAt: active.pairedAt,
        });
        platformLog('cache', 'info', 'Local device link restored from server', {
          onesignalPlayerId: playerId,
          laundryEmployeeId: active.laundryEmployeeId,
          recoveryAction: 'rewrite_local_link',
          finalStatus: 'ok',
        });
        return {
          status: 'recovering',
          message: 'Local cache rewritten from server',
          repaired: true,
        };
      }

      return {
        status: 'healthy',
        message: 'Local cache matches active linked device',
        repaired: false,
      };
    }

    if (local?.linked) {
      clearLocalDeviceLink();
      platformLog('cache', 'info', 'Cleared stale local device link', {
        onesignalPlayerId: playerId,
        recoveryAction: 'clear_stale_local_link',
        finalStatus: 'ok',
      });
      return {
        status: 'recovering',
        message: 'Cleared stale local linked state',
        repaired: true,
      };
    }

    return {
      status: 'healthy',
      message: 'Device not linked',
      repaired: false,
    };
  } catch (error) {
    platformLog('cache', 'warning', 'Local cache reconcile deferred', {
      recoveryAction: 'cache_reconcile_deferred',
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      status: 'warning',
      message: 'Could not reconcile local cache (network/DB)',
      repaired: false,
    };
  }
}
