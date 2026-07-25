/** Legacy self-healing engine disabled. Use @/features/notifications/health */

export async function runRecoveryPass(_trigger?: string) {
  return { ok: true, actions: [] as string[] };
}

export function getEngineSnapshot() {
  return {
    enabled: false,
    running: false,
    lastRunAt: null as string | null,
    lastPassAt: null as string | null,
    lastRepairAt: null as string | null,
    lastSyncAt: null as string | null,
    lastStatus: 'disabled' as const,
    lastMessage: 'Legacy self-healing disabled',
    status: 'disabled' as const,
  };
}

export async function startSelfHealingEngine() {
  return;
}
