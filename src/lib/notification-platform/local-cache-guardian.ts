/**
 * Compatibility wrapper — prefer
 * `@/features/notifications/pairing/reconcile-local-link`.
 */
import { reconcileLocalDeviceLink } from '@/features/notifications/pairing/reconcile-local-link';
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
  const result = await reconcileLocalDeviceLink();
  const repaired =
    result.reason === 'restored_by_player_id' ||
    result.reason === 'player_id_refreshed' ||
    result.reason === 'server_unlinked';

  return {
    status: result.linked
      ? repaired
        ? 'recovering'
        : 'healthy'
      : result.reason === 'not_linked'
        ? 'healthy'
        : 'warning',
    message: result.reason,
    repaired,
  };
}
