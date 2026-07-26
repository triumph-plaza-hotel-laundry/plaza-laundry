import {
  getActiveDeviceByEmployeeId,
  getActiveDeviceByPlayerId,
} from '@/features/notifications/devices';
import { refreshLinkedPlayerId } from '@/features/notifications/devices/refresh-player-id';
import {
  clearLocalDeviceLink,
  readLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';
import { getCurrentOneSignalPlayerId } from '@/features/employee-devices/onesignal-pairing';

export type ReconcileLocalLinkResult = {
  linked: boolean;
  reason: string;
};

/**
 * Source of truth: active row in employee_notification_devices.
 * Local cache mirrors that row for inbox / this-device UX.
 *
 * Critical rule (phone replacement):
 * Never call refresh when this browser's cached player_id differs from the
 * server active player_id — that would steal the new phone's link.
 * Refresh is only for true OneSignal rotation on the phone that still owns
 * the active subscription (local player_id === server player_id).
 */
export async function reconcileLocalDeviceLink(options?: {
  currentPlayerId?: string | null;
}): Promise<ReconcileLocalLinkResult> {
  const local = readLocalDeviceLink();
  const playerId =
    options && 'currentPlayerId' in options
      ? options.currentPlayerId
      : await getCurrentOneSignalPlayerId();

  console.info('[device-link] reconcile start', {
    hasLocal: Boolean(local?.linked),
    localEmployeeId: local?.laundryEmployeeId ?? null,
    localPlayerId: local?.onesignalPlayerId ?? null,
    currentPlayerId: playerId,
  });

  // 1) Current subscription already mapped on server → restore / refresh cache.
  if (playerId) {
    try {
      const byPlayer = await getActiveDeviceByPlayerId(playerId);
      if (byPlayer) {
        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: playerId,
          laundryEmployeeId: byPlayer.employeeId,
          pairedAt: byPlayer.linkedAt,
        });
        console.info('[device-link] reconcile restored_by_player_id', {
          employeeId: byPlayer.employeeId,
          playerId,
        });
        return { linked: true, reason: 'restored_by_player_id' };
      }
    } catch (error) {
      console.warn(
        '[device-link] lookup by player_id failed — keeping local',
        error instanceof Error ? error.message : error,
      );
      if (local?.linked) {
        return { linked: true, reason: 'kept_local_player_lookup_failed' };
      }
    }
  }

  // 2) Local cache says this phone is linked → confirm by employee_id.
  if (local?.linked && local.laundryEmployeeId) {
    try {
      const byEmployee = await getActiveDeviceByEmployeeId(
        local.laundryEmployeeId,
      );

      if (!byEmployee) {
        clearLocalDeviceLink();
        console.info('[device-link] reconcile server_unlinked', {
          employeeId: local.laundryEmployeeId,
        });
        return { linked: false, reason: 'server_unlinked' };
      }

      // True rotation: we still own the active row; OneSignal gave a new id.
      if (
        playerId &&
        local.onesignalPlayerId &&
        local.onesignalPlayerId === byEmployee.playerId &&
        playerId !== byEmployee.playerId
      ) {
        const refreshed = await refreshLinkedPlayerId({
          newPlayerId: playerId,
          previousPlayerId: byEmployee.playerId,
        });
        if (refreshed) {
          console.info('[device-link] reconcile player_id_refreshed', {
            employeeId: byEmployee.employeeId,
            from: byEmployee.playerId,
            to: playerId,
          });
          return { linked: true, reason: 'player_id_refreshed' };
        }

        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: byEmployee.playerId,
          laundryEmployeeId: byEmployee.employeeId,
          pairedAt: byEmployee.linkedAt,
        });
        console.warn('[device-link] reconcile kept_local_refresh_failed', {
          employeeId: byEmployee.employeeId,
          serverPlayerId: byEmployee.playerId,
          currentPlayerId: playerId,
        });
        return { linked: true, reason: 'kept_local_refresh_failed' };
      }

      // Another device owns this employee (phone replacement) — do not steal.
      if (
        playerId &&
        local.onesignalPlayerId &&
        local.onesignalPlayerId !== byEmployee.playerId
      ) {
        clearLocalDeviceLink();
        console.info('[device-link] reconcile replaced_by_other_device', {
          employeeId: byEmployee.employeeId,
          localPlayerId: local.onesignalPlayerId,
          serverPlayerId: byEmployee.playerId,
        });
        return { linked: false, reason: 'replaced_by_other_device' };
      }

      writeLocalDeviceLink({
        linked: true,
        onesignalPlayerId: byEmployee.playerId,
        laundryEmployeeId: byEmployee.employeeId,
        pairedAt: byEmployee.linkedAt,
      });
      console.info('[device-link] reconcile confirmed_by_employee_id', {
        employeeId: byEmployee.employeeId,
        playerId: byEmployee.playerId,
      });
      return { linked: true, reason: 'confirmed_by_employee_id' };
    } catch (error) {
      console.warn(
        '[device-link] lookup by employee_id failed — keeping local',
        error instanceof Error ? error.message : error,
      );
      return { linked: true, reason: 'kept_local_employee_lookup_failed' };
    }
  }

  console.info('[device-link] reconcile not_linked');
  return { linked: false, reason: 'not_linked' };
}
