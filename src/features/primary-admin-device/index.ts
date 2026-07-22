export {
  canRegisterPrimaryAdminDevice,
} from '@/features/primary-admin-device/access';
export {
  getOrCreatePrimaryAdminDeviceId,
} from '@/features/primary-admin-device/local-device-id';
export {
  PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED,
  PRIMARY_ADMIN_DEVICE_FORBIDDEN,
  getPrimaryAdminDevice,
  registerPrimaryAdminDevice,
  type PrimaryAdminDevice,
} from '@/features/primary-admin-device/primary-admin-device-service';
export { PrimaryAdminDevicePanel } from '@/features/primary-admin-device/PrimaryAdminDevicePanel';
