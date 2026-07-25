/** Legacy notification platform — disabled. Use @/features/notifications/* */

export const notificationPlatformConfig = {
  isEnabled: false,
  buildId: 'notifications-v1',
} as const;

export async function startNotificationPlatform() {
  console.info('[notifications] legacy platform start skipped — v1 modular system active');
}

export async function runRecoveryPass() {
  return { ok: true, actions: [] as string[] };
}

export function subscribePlatformSync(_onChange: () => void) {
  return () => {};
}

export async function collectHealthReport() {
  const { runHealthProbes } = await import('@/features/notifications/health');
  return runHealthProbes();
}

export function platformLog(
  _category: string,
  message: string,
  detail?: unknown,
) {
  if (detail !== undefined) {
    console.info(`[notifications] ${message}`, detail);
    return;
  }
  console.info(`[notifications] ${message}`);
}

export async function onSubscriptionIdChanged() {
  // No automatic player_id rewrite. Relink via Admin QR if needed.
}
