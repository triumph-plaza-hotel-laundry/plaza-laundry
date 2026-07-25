import { requireSupabase } from '@/features/notifications/shared/supabase';
import { asJson } from '@/features/notifications/shared/supabase';
import { onesignalConfig } from '@/lib/onesignal/config';
import {
  listActiveDevices,
} from '@/features/notifications/devices';
import { expireStaleTickets } from '@/features/notifications/pairing';
import {
  getNotificationSettings,
  settingAsBool,
  settingAsInt,
} from '@/features/notifications/settings';
import {
  logNotificationAction,
  recordDiagnosticsHistory,
} from '@/features/notifications/audit';
import type {
  HealthComponentId,
  HealthComponentReport,
  HealthStatus,
} from '@/features/notifications/shared/types';

const COMPONENTS: HealthComponentId[] = [
  'notification_service',
  'onesignal',
  'database',
  'edge_functions',
  'scheduled_jobs',
  'device_links',
  'player_ids',
  'service_worker',
  'sync_status',
  'qr_service',
];

function nowIso() {
  return new Date().toISOString();
}

function report(
  component: HealthComponentId,
  status: HealthStatus,
  message: string,
  detail?: Record<string, unknown>,
): HealthComponentReport {
  return { component, status, message, detail, checkedAt: nowIso() };
}

async function probeDatabase(): Promise<HealthComponentReport> {
  const client = requireSupabase();
  const { error, count } = await client
    .from('employee_notification_devices')
    .select('id', { count: 'exact', head: true });
  if (error) {
    return report('database', 'critical', `Database unreachable: ${error.message}`);
  }
  return report('database', 'healthy', 'Notification tables reachable', {
    deviceRows: count ?? 0,
  });
}

async function probeDeviceLinks(): Promise<HealthComponentReport> {
  const devices = await listActiveDevices();
  const byEmployee = new Map<string, number>();
  for (const d of devices) {
    byEmployee.set(d.employeeId, (byEmployee.get(d.employeeId) ?? 0) + 1);
  }
  const dupes = [...byEmployee.entries()].filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    return report(
      'device_links',
      'critical',
      `Duplicate active links detected (${dupes.length} employees)`,
      { employees: dupes.map(([id]) => id) },
    );
  }
  return report('device_links', 'healthy', `${devices.length} active device link(s)`, {
    activeCount: devices.length,
  });
}

async function probePlayerIds(): Promise<HealthComponentReport> {
  const devices = await listActiveDevices();
  const missing = devices.filter((d) => !d.playerId?.trim());
  if (missing.length > 0) {
    return report(
      'player_ids',
      'critical',
      `${missing.length} active link(s) missing player_id`,
    );
  }
  const ids = devices.map((d) => d.playerId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return report('player_ids', 'critical', 'Duplicate player_id across active links');
  }
  return report('player_ids', 'healthy', `${ids.length} unique active player id(s)`);
}

async function probeOneSignal(
  enabled: boolean,
): Promise<HealthComponentReport> {
  if (!enabled) {
    return report('onesignal', 'unknown', 'OneSignal probe disabled in settings');
  }
  if (!onesignalConfig.appId) {
    return report('onesignal', 'critical', 'OneSignal app id not configured');
  }
  return report('onesignal', 'healthy', 'OneSignal app id configured', {
    appIdPresent: true,
  });
}

async function probeEdge(enabled: boolean): Promise<HealthComponentReport> {
  if (!enabled) {
    return report('edge_functions', 'unknown', 'Edge probe disabled in settings');
  }
  try {
    const client = requireSupabase();
    // Lightweight OPTIONS-style: invoke with dry ping body may 4xx; treat network/auth differently
    const { error } = await client.functions.invoke('shift-reminder', {
      body: { action: 'health_ping' },
    });
    // Function may reject unknown action but still proves reachability if not "Failed to send"
    if (error && /Failed to send|fetch|network/i.test(error.message)) {
      return report('edge_functions', 'critical', `Edge unreachable: ${error.message}`);
    }
    return report(
      'edge_functions',
      'healthy',
      'shift-reminder edge reachable',
      { note: error?.message ?? 'ok' },
    );
  } catch (caught) {
    return report(
      'edge_functions',
      'critical',
      caught instanceof Error ? caught.message : 'Edge probe failed',
    );
  }
}

async function probeScheduledJobs(
  enabled: boolean,
): Promise<HealthComponentReport> {
  if (!enabled) {
    return report('scheduled_jobs', 'unknown', 'Scheduled jobs probe disabled');
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from('push_notification_history')
    .select('created_at')
    .eq('triggered_by', 'cron')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return report('scheduled_jobs', 'warning', `Could not read cron history: ${error.message}`);
  }
  if (!data?.created_at) {
    return report('scheduled_jobs', 'warning', 'No cron reminder history yet');
  }
  return report('scheduled_jobs', 'healthy', 'Cron history present', {
    lastCronAt: data.created_at,
  });
}

async function probeNotificationService(
  maxHours: number,
): Promise<HealthComponentReport> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('push_notification_history')
    .select('created_at, status')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return report(
      'notification_service',
      'warning',
      `History unavailable: ${error.message}`,
    );
  }
  if (!data?.created_at) {
    return report(
      'notification_service',
      'warning',
      'No successful sends recorded yet',
    );
  }
  const ageMs = Date.now() - new Date(data.created_at as string).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours > maxHours) {
    return report(
      'notification_service',
      'warning',
      `Last successful send was ${Math.round(ageHours)}h ago`,
      { lastSentAt: data.created_at },
    );
  }
  return report('notification_service', 'healthy', 'Recent successful delivery', {
    lastSentAt: data.created_at,
  });
}

async function probeQrService(): Promise<HealthComponentReport> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('employee_notification_link_tickets')
    .select('id', { count: 'exact', head: true })
    .is('consumed_at', null)
    .gt('expires_at', nowIso());
  if (error) {
    return report('qr_service', 'critical', `QR tickets table error: ${error.message}`);
  }
  return report('qr_service', 'healthy', 'QR ticket service available', {
    openTickets: count ?? 0,
  });
}

async function probeSyncStatus(): Promise<HealthComponentReport> {
  const devices = await listActiveDevices();
  if (devices.length === 0) {
    return report('sync_status', 'warning', 'No active device links to sync');
  }
  const newest = devices
    .map((d) => new Date(d.updatedAt).getTime())
    .sort((a, b) => b - a)[0];
  return report('sync_status', 'healthy', 'Device link timestamps present', {
    lastUpdatedAt: new Date(newest).toISOString(),
    activeCount: devices.length,
  });
}

async function probeServiceWorker(): Promise<HealthComponentReport> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return report(
      'service_worker',
      'warning',
      'Service worker API unavailable in this admin context',
    );
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return report(
        'service_worker',
        'warning',
        'No service worker registration on this admin browser',
      );
    }
    return report('service_worker', 'healthy', 'Service worker registered on this browser');
  } catch (caught) {
    return report(
      'service_worker',
      'warning',
      caught instanceof Error ? caught.message : 'SW check failed',
    );
  }
}

async function persistSnapshots(reports: HealthComponentReport[]) {
  const client = requireSupabase();
  const rows = reports.map((r) => ({
    component: r.component,
    status: r.status,
    message: r.message,
    detail: asJson(r.detail ?? {}),
    checked_at: r.checkedAt,
  }));
  const { error } = await client.from('notification_health_snapshots').insert(rows);
  if (error) {
    console.error('[notifications/health] snapshot persist failed', error.message);
  }
}

export async function runHealthProbes(adminId?: string | null): Promise<{
  overall: HealthStatus;
  reports: HealthComponentReport[];
  autoRepairs: string[];
}> {
  const settings = await getNotificationSettings();
  const maxHours = settingAsInt(settings, 'max_hours_since_last_send_warning', 48);
  const onesignalOn = settingAsBool(settings, 'probe_onesignal_enabled', true);
  const edgeOn = settingAsBool(settings, 'probe_edge_enabled', true);
  const jobsOn = settingAsBool(settings, 'probe_scheduled_jobs_enabled', true);

  const autoRepairs: string[] = [];

  // Safe auto-repair: expire stale tickets (non-destructive)
  try {
    const expired = await expireStaleTickets();
    if (expired > 0) {
      autoRepairs.push(`Expired ${expired} stale QR ticket(s)`);
      await recordDiagnosticsHistory({
        component: 'qr_service',
        severity: 'info',
        issueCode: 'stale_tickets_expired',
        message: `Auto-expired ${expired} stale QR ticket(s)`,
        actionTaken: 'expire_stale_notification_link_tickets',
        verificationResult: 'verified',
      });
    }
  } catch (caught) {
    console.warn('[notifications/health] ticket cleanup failed', caught);
  }

  const reports = await Promise.all([
    probeNotificationService(maxHours),
    probeOneSignal(onesignalOn),
    probeDatabase(),
    probeEdge(edgeOn),
    probeScheduledJobs(jobsOn),
    probeDeviceLinks(),
    probePlayerIds(),
    probeServiceWorker(),
    probeSyncStatus(),
    probeQrService(),
  ]);

  await persistSnapshots(reports);

  for (const r of reports) {
    if (r.status === 'critical' || r.status === 'warning') {
      await recordDiagnosticsHistory({
        component: r.component,
        severity: r.status === 'critical' ? 'critical' : 'warning',
        issueCode: `health_${r.component}_${r.status}`,
        message: r.message,
        detail: r.detail,
      });
    }
  }

  await logNotificationAction({
    action: 'health_probe',
    actorAdminId: adminId,
    detail: {
      overall: overallFrom(reports),
      autoRepairs,
    },
  });

  return {
    overall: overallFrom(reports),
    reports,
    autoRepairs,
  };
}

function overallFrom(reports: HealthComponentReport[]): HealthStatus {
  if (reports.some((r) => r.status === 'critical')) return 'critical';
  if (reports.some((r) => r.status === 'warning')) return 'warning';
  if (reports.every((r) => r.status === 'healthy')) return 'healthy';
  return 'unknown';
}

export async function getLatestHealthSnapshots(): Promise<HealthComponentReport[]> {
  const client = requireSupabase();
  const results: HealthComponentReport[] = [];
  for (const component of COMPONENTS) {
    const { data, error } = await client
      .from('notification_health_snapshots')
      .select('*')
      .eq('component', component)
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      results.push(
        report(component, 'unknown', 'No snapshot yet — run Refresh Health'),
      );
      continue;
    }
    results.push({
      component: data.component as HealthComponentId,
      status: data.status as HealthStatus,
      message: data.message as string,
      detail: (data.detail as Record<string, unknown>) ?? {},
      checkedAt: data.checked_at as string,
    });
  }
  return results;
}

export { COMPONENTS as HEALTH_COMPONENTS };
