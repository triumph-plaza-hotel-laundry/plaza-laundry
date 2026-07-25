/** Legacy health monitor — use @/features/notifications/health */

export async function collectHealthReport() {
  const { runHealthProbes } = await import('@/features/notifications/health');
  return runHealthProbes();
}
