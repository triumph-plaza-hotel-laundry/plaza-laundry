export {
  canRegisterPrimaryAdminDevice,
} from '@/features/primary-admin-device/access';
export {
  getOrCreatePrimaryAdminDeviceId,
} from '@/features/primary-admin-device/local-device-id';
export {
  getPrimaryAdminDevice,
  registerPrimaryAdminDevice,
  healPrimaryAdminSubscriptionIfSameDevice,
} from '@/features/primary-admin-device/primary-admin-device-service';

export const PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED =
  'PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED';
export const PRIMARY_ADMIN_DEVICE_FORBIDDEN = 'PRIMARY_ADMIN_DEVICE_FORBIDDEN';

export type PrimaryAdminDevice = {
  id: string;
  deviceId: string;
  onesignalSubscriptionId: string;
  registeredAt: string;
  registeredByAdminId: string | null;
};

export { PrimaryAdminDevicePanel } from '@/features/primary-admin-device/PrimaryAdminDevicePanel';
