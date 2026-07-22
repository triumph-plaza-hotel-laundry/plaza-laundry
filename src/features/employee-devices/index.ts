export {
  DEVICE_PERMISSIONS,
  allDevicePermissions,
  assertDevicePermission,
  hasDevicePermission,
  listDevicePermissions,
  setDevicePermissions,
  type DevicePermission,
} from '@/features/employee-devices/device-permissions-service';

export {
  createPairingSession,
  ensureFreshPairingSession,
  cancelPendingPairingSessionsForPlayer,
  encodePairingPayload,
  getActiveLinkedDeviceByPlayerId,
  listLinkedDevices,
  pairDeviceFromSession,
  parsePairingPayload,
  removeLinkedDevice,
  type LinkedDevice,
  type PairingSession,
} from '@/features/employee-devices/device-pairing-service';
