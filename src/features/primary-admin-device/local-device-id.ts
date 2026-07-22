const STORAGE_KEY = 'tpl-primary-admin-device-id-v1';

/** Stable browser device id used for primary admin registration. */
export function getOrCreatePrimaryAdminDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing) {
      return existing;
    }

    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
