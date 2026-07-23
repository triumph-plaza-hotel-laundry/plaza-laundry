import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { notificationPlatformConfig } from '@/lib/notification-platform/config';
import type {
  PlatformEventCategory,
  PlatformEventRecord,
  PlatformEventSeverity,
} from '@/lib/notification-platform/types';

const MEMORY_CAP = 80;
const memoryEvents: PlatformEventRecord[] = [];
const EVENTS_TABLE = 'notification_platform_events';

function pushMemory(event: PlatformEventRecord) {
  memoryEvents.unshift(event);
  if (memoryEvents.length > MEMORY_CAP) {
    memoryEvents.length = MEMORY_CAP;
  }
}

export function getRecentPlatformEvents(limit = 40): PlatformEventRecord[] {
  return memoryEvents.slice(0, limit);
}

export function platformLog(
  category: PlatformEventCategory,
  severity: PlatformEventSeverity,
  message: string,
  detail?: Omit<
    PlatformEventRecord,
    'category' | 'severity' | 'message' | 'createdAt'
  >,
): void {
  const event: PlatformEventRecord = {
    category,
    severity,
    message,
    laundryEmployeeId: detail?.laundryEmployeeId ?? null,
    onesignalPlayerId: detail?.onesignalPlayerId ?? null,
    deviceLabel: detail?.deviceLabel ?? null,
    payload: detail?.payload ?? null,
    recoveryAction: detail?.recoveryAction ?? null,
    retryCount: detail?.retryCount ?? null,
    finalStatus: detail?.finalStatus ?? null,
    createdAt: new Date().toISOString(),
  };

  pushMemory(event);

  const prefix = `[notification-platform:${category}]`;
  if (severity === 'error') {
    console.error(prefix, message, detail?.payload ?? '');
  } else if (severity === 'warning') {
    console.warn(prefix, message, detail?.payload ?? '');
  } else if (import.meta.env.DEV) {
    console.info(prefix, message, detail?.payload ?? '');
  }

  if (!notificationPlatformConfig.isEnabled) {
    return;
  }

  // Best-effort durable log — never block UX.
  void persistEvent(event);
}

async function persistEvent(event: PlatformEventRecord): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    const { error } = await client.from(EVENTS_TABLE).insert({
      category: event.category,
      severity: event.severity,
      message: event.message,
      laundry_employee_id: event.laundryEmployeeId ?? null,
      onesignal_player_id: event.onesignalPlayerId ?? null,
      device_label: event.deviceLabel ?? null,
      payload: (event.payload as Json | null) ?? null,
      recovery_action: event.recoveryAction ?? null,
      retry_count: event.retryCount ?? 0,
      final_status: event.finalStatus ?? null,
    });

    if (error && import.meta.env.DEV) {
      // Table may not exist until migration is applied.
      console.warn('[notification-platform] event persist skipped', error.message);
    }
  } catch {
    // Offline / outage — memory buffer already holds the event.
  }
}
