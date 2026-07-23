/**
 * Kill switch for the self-healing notification platform.
 * Set VITE_NOTIFICATION_PLATFORM_V2=false to disable client engine/sync
 * while leaving legacy OneSignal + pairing paths intact.
 */
function readFlag(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'on') {
    return true;
  }
  return defaultValue;
}

export const notificationPlatformConfig = {
  /** Default ON so production heals automatically after deploy. */
  isEnabled: readFlag(import.meta.env.VITE_NOTIFICATION_PLATFORM_V2, true),
  buildId:
    (import.meta.env.VITE_APP_BUILD_ID as string | undefined)?.trim() ||
    (import.meta.env.MODE === 'production' ? 'production' : 'development'),
  maxRecoveryAttemptsPerTrigger: 3,
  recoveryBackoffMs: [1_000, 5_000, 15_000] as const,
  eventRetentionDays: 30,
} as const;
