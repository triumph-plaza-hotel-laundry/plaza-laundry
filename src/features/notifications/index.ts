/**
 * Notifications feature — modular public barrels.
 * Each submodule is independently replaceable; import from these paths only.
 */

export type * from '@/features/notifications/shared/types';

export * as notificationDevices from '@/features/notifications/devices';
export * as notificationPairing from '@/features/notifications/pairing';
export * as notificationSend from '@/features/notifications/send';
export * as notificationDiagnostics from '@/features/notifications/diagnostics';
export * as notificationHealth from '@/features/notifications/health';
export * as notificationSettings from '@/features/notifications/settings';
export * as notificationAudit from '@/features/notifications/audit';

export {
  readLocalDeviceLink,
  writeLocalDeviceLink,
  clearLocalDeviceLink,
  subscribeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';

export { reconcileLocalDeviceLink } from '@/features/notifications/pairing/reconcile-local-link';
