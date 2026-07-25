import { requireSupabase } from '@/features/notifications/shared/supabase';
import { logNotificationAction } from '@/features/notifications/audit';

const TABLE = 'notification_system_settings';

export type NotificationSettingsMap = Record<string, string>;

const DEFAULTS: NotificationSettingsMap = {
  qr_ticket_ttl_minutes: '15',
  health_probe_interval_minutes: '15',
  max_hours_since_last_send_warning: '48',
  audit_retention_days: '90',
  diagnostics_history_retention_days: '90',
  health_snapshot_retention_days: '30',
  probe_onesignal_enabled: 'true',
  probe_edge_enabled: 'true',
  probe_scheduled_jobs_enabled: 'true',
  bell_retention_days: '30',
};

export async function getNotificationSettings(): Promise<NotificationSettingsMap> {
  const client = requireSupabase();
  const { data, error } = await client.from(TABLE).select('key, value');
  if (error) {
    console.warn('[notifications/settings] load failed, using defaults', error.message);
    return { ...DEFAULTS };
  }

  const map = { ...DEFAULTS };
  for (const row of data ?? []) {
    map[row.key as string] = row.value as string;
  }
  return map;
}

export async function getNotificationSetting(
  key: string,
): Promise<string> {
  try {
    const settings = await getNotificationSettings();
    return settings[key] ?? DEFAULTS[key] ?? '';
  } catch {
    return DEFAULTS[key] ?? '';
  }
}

export async function updateNotificationSetting(
  key: string,
  value: string,
  adminId?: string | null,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by_admin_id: adminId ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  await logNotificationAction({
    action: 'update_setting',
    actorAdminId: adminId,
    detail: { key, value },
  });
}

export function settingAsInt(settings: NotificationSettingsMap, key: string, fallback: number) {
  const raw = Number.parseInt(settings[key] ?? '', 10);
  return Number.isFinite(raw) ? raw : fallback;
}

export function settingAsBool(settings: NotificationSettingsMap, key: string, fallback = true) {
  const raw = (settings[key] ?? '').toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}
