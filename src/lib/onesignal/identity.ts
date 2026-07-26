/**
 * OneSignal external_user_id namespaces.
 *
 * Employee push devices (QR-linked phones) use `employee:<laundryEmployeeId>`.
 * Admin browser sessions use `admin:<adminUserId>`.
 *
 * These must never be interchangeable — primary admin "Kamel Ahmed" is not
 * laundry employee EMP-0006 (Kamel Ahmed).
 */

export const ONESIGNAL_EMPLOYEE_EXTERNAL_PREFIX = 'employee:';
export const ONESIGNAL_ADMIN_EXTERNAL_PREFIX = 'admin:';

export function onesignalEmployeeExternalId(laundryEmployeeId: string): string {
  const id = laundryEmployeeId.trim();
  if (!id) {
    throw new Error('laundryEmployeeId is required for employee OneSignal identity');
  }
  if (id.startsWith(ONESIGNAL_EMPLOYEE_EXTERNAL_PREFIX)) {
    return id;
  }
  return `${ONESIGNAL_EMPLOYEE_EXTERNAL_PREFIX}${id}`;
}

export function onesignalAdminExternalId(adminUserId: string): string {
  const id = adminUserId.trim();
  if (!id) {
    throw new Error('adminUserId is required for admin OneSignal identity');
  }
  if (id.startsWith(ONESIGNAL_ADMIN_EXTERNAL_PREFIX)) {
    return id;
  }
  return `${ONESIGNAL_ADMIN_EXTERNAL_PREFIX}${id}`;
}

export function isEmployeeOneSignalExternalId(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(ONESIGNAL_EMPLOYEE_EXTERNAL_PREFIX));
}

export function isAdminOneSignalExternalId(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(ONESIGNAL_ADMIN_EXTERNAL_PREFIX));
}
