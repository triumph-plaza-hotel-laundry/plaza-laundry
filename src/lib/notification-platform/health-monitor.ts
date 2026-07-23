import { getSupabaseClient } from '@/lib/supabase/client';
import { onesignalConfig } from '@/lib/onesignal/config';
import { ONESIGNAL_SERVICE_WORKER } from '@/lib/onesignal/service-worker-config';
import { notificationPlatformConfig } from '@/lib/notification-platform/config';
import {
  getRecentPlatformEvents,
} from '@/lib/notification-platform/logger';
import { getEngineSnapshot } from '@/lib/notification-platform/self-healing-engine';
import type {
  ComponentHealth,
  HealthReport,
  HealthStatus,
  PlatformEventRecord,
} from '@/lib/notification-platform/types';
import { readLocalDeviceLink } from '@/features/employee-devices/local-device-link';

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('broken')) return 'broken';
  if (statuses.includes('recovering')) return 'recovering';
  if (statuses.includes('warning')) return 'warning';
  return 'healthy';
}

function readPermission(): NotificationPermission | 'unavailable' {
  if (typeof Notification === 'undefined') {
    return 'unavailable';
  }
  return Notification.permission;
}

async function probeDatabase(): Promise<ComponentHealth> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      id: 'database',
      status: 'broken',
      message: 'Supabase client not configured',
      lastRepair: null,
      lastSync: null,
    };
  }

  const { error } = await client
    .from('onesignal_subscriptions')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return {
      id: 'database',
      status: 'broken',
      message: error.message,
      lastRepair: null,
      lastSync: null,
    };
  }

  return {
    id: 'database',
    status: 'healthy',
    message: 'Supabase reachable',
    lastRepair: null,
    lastSync: new Date().toISOString(),
  };
}

async function probeWorkers(): Promise<ComponentHealth> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      id: 'workers',
      status: 'warning',
      message: 'Service workers unavailable',
      lastRepair: null,
      lastSync: null,
    };
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const expectedScope = new URL(
    ONESIGNAL_SERVICE_WORKER.scope,
    window.location.origin,
  ).href;
  const found = registrations.some(
    (registration) =>
      registration.scope === expectedScope ||
      (registration.active?.scriptURL ?? '').includes('/onesignal/'),
  );

  return {
    id: 'workers',
    status: found ? 'healthy' : 'warning',
    message: found
      ? 'OneSignal worker registered'
      : 'OneSignal worker not found (recovery will re-register)',
    lastRepair: null,
    lastSync: new Date().toISOString(),
  };
}

async function loadRecentDbEvents(): Promise<PlatformEventRecord[]> {
  const client = getSupabaseClient();
  if (!client) {
    return getRecentPlatformEvents(20);
  }

  const { data, error } = await client
    .from('notification_platform_events')
    .select(
      'id, category, severity, message, laundry_employee_id, onesignal_player_id, device_label, payload, recovery_action, retry_count, final_status, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    return getRecentPlatformEvents(20);
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    category: row.category as PlatformEventRecord['category'],
    severity: row.severity as PlatformEventRecord['severity'],
    message: String(row.message ?? ''),
    laundryEmployeeId: (row.laundry_employee_id as string | null) ?? null,
    onesignalPlayerId: (row.onesignal_player_id as string | null) ?? null,
    deviceLabel: (row.device_label as string | null) ?? null,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    recoveryAction: (row.recovery_action as string | null) ?? null,
    retryCount: (row.retry_count as number | null) ?? null,
    finalStatus: (row.final_status as string | null) ?? null,
    createdAt: (row.created_at as string | undefined) ?? undefined,
  }));
}

export async function collectHealthReport(): Promise<HealthReport> {
  const engine = getEngineSnapshot();
  const permission = readPermission();
  const local = readLocalDeviceLink();

  const [database, workers, recentEvents] = await Promise.all([
    probeDatabase(),
    probeWorkers(),
    loadRecentDbEvents(),
  ]);

  let subscriptionId: string | null = null;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    const id = OneSignal.User.PushSubscription.id;
    subscriptionId = typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    subscriptionId = null;
  }

  const onesignal: ComponentHealth = {
    id: 'onesignal',
    status: !onesignalConfig.isConfigured
      ? 'broken'
      : permission === 'denied'
        ? 'broken'
        : permission === 'default'
          ? 'warning'
          : subscriptionId
            ? 'healthy'
            : 'warning',
    message: !onesignalConfig.isConfigured
      ? 'App ID missing'
      : `permission=${permission}; subscription=${subscriptionId ? 'yes' : 'no'}`,
    lastRepair: engine.lastRepairAt,
    lastSync: engine.lastSyncAt,
  };

  const subscriptions: ComponentHealth = {
    id: 'subscriptions',
    status: subscriptionId ? 'healthy' : permission === 'granted' ? 'warning' : 'warning',
    message: subscriptionId
      ? `Live subscription ${subscriptionId.slice(0, 8)}…`
      : 'No live subscription id on this device',
    lastRepair: engine.lastRepairAt,
    lastSync: engine.lastSyncAt,
  };

  const linkedDevices: ComponentHealth = {
    id: 'linked_devices',
    status: local?.linked ? 'healthy' : 'warning',
    message: local?.linked
      ? `Linked locally to ${local.laundryEmployeeId ?? 'employee'}`
      : 'This device is not linked to an employee',
    lastRepair: null,
    lastSync: engine.lastSyncAt,
  };

  const recoveryEngine: ComponentHealth = {
    id: 'recovery_engine',
    status: !notificationPlatformConfig.isEnabled
      ? 'warning'
      : engine.running
        ? engine.lastStatus
        : 'warning',
    message: !notificationPlatformConfig.isEnabled
      ? 'Kill switch disabled'
      : engine.running
        ? engine.lastMessage
        : 'Engine not started',
    lastRepair: engine.lastRepairAt,
    lastSync: engine.lastPassAt,
  };

  const cache: ComponentHealth = {
    id: 'cache',
    status: 'healthy',
    message: local
      ? `Local link cache present (linked=${local.linked})`
      : 'No local link cache',
    lastRepair: null,
    lastSync: engine.lastSyncAt,
  };

  const backgroundSync: ComponentHealth = {
    id: 'background_sync',
    status: typeof navigator !== 'undefined' && navigator.onLine ? 'healthy' : 'warning',
    message:
      typeof navigator !== 'undefined' && navigator.onLine
        ? 'Browser online; lifecycle listeners active'
        : 'Browser offline',
    lastRepair: null,
    lastSync: engine.lastSyncAt,
  };

  const notifications: ComponentHealth = {
    id: 'notifications',
    status: permission === 'granted' ? 'healthy' : permission === 'denied' ? 'broken' : 'warning',
    message: `Notification permission: ${permission}`,
    lastRepair: null,
    lastSync: null,
  };

  const queue: ComponentHealth = {
    id: 'queue',
    status: 'healthy',
    message: 'Delivery queue handled by shift-reminder edge + attempts table',
    lastRepair: null,
    lastSync: null,
  };

  const components = [
    database,
    onesignal,
    subscriptions,
    workers,
    notifications,
    queue,
    recoveryEngine,
    cache,
    backgroundSync,
    linkedDevices,
  ];

  return {
    collectedAt: new Date().toISOString(),
    overall: worstStatus(components.map((c) => c.status)),
    components,
    recentEvents,
    engineRunning: engine.running,
    platformEnabled: notificationPlatformConfig.isEnabled,
  };
}
