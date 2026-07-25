/**
 * Legacy primary-admin device table removed.
 * Admin auth remains; device linking is employee_notification_devices only.
 */

export type PrimaryAdminDevice = {
  id: string;
  deviceId: string;
  onesignalSubscriptionId: string;
  registeredAt: string;
  registeredByAdminId: string | null;
};

export async function getPrimaryAdminDevice(): Promise<PrimaryAdminDevice | null> {
  return null;
}

export async function registerPrimaryAdminDevice(
  _adminId?: string,
): Promise<PrimaryAdminDevice> {
  throw new Error(
    'Primary Admin Device registration was removed. Use Notifications Center for employee devices.',
  );
}

export async function healPrimaryAdminSubscriptionIfSameDevice() {
  return { healed: false as const };
}
