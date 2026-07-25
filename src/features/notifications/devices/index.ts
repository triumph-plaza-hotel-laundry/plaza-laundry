import { requireSupabase } from '@/features/notifications/shared/supabase';
import type {
  NotificationDevice,
  NotificationDeviceStatus,
} from '@/features/notifications/shared/types';

const TABLE = 'employee_notification_devices';

type DeviceRow = {
  id: string;
  employee_id: string;
  player_id: string;
  device_id: string;
  device_name: string | null;
  device_model: string | null;
  operating_system: string | null;
  browser: string | null;
  app_version: string | null;
  linked_at: string;
  updated_at: string;
  status: NotificationDeviceStatus;
};

function mapRow(row: DeviceRow): NotificationDevice {
  return {
    id: row.id,
    employeeId: row.employee_id,
    playerId: row.player_id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceModel: row.device_model,
    operatingSystem: row.operating_system,
    browser: row.browser,
    appVersion: row.app_version,
    linkedAt: row.linked_at,
    updatedAt: row.updated_at,
    status: row.status,
  };
}

export async function listNotificationDevices(status?: NotificationDeviceStatus) {
  const client = requireSupabase();
  let query = client.from(TABLE).select('*').order('linked_at', { ascending: false });
  if (status) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as DeviceRow[]).map(mapRow);
}

export async function listActiveDevices() {
  return listNotificationDevices('active');
}

export async function getActiveDeviceByEmployeeId(
  employeeId: string,
): Promise<NotificationDevice | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapRow(data as DeviceRow) : null;
}

export async function getActiveDeviceByPlayerId(
  playerId: string,
): Promise<NotificationDevice | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapRow(data as DeviceRow) : null;
}

export async function unlinkDevice(employeeId: string, adminId?: string | null) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('unlink_notification_device', {
    p_employee_id: employeeId,
    p_admin_id: adminId ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export { refreshLinkedPlayerId } from '@/features/notifications/devices/refresh-player-id';
export { resetThisDevicePushSubscription } from '@/features/notifications/devices/reset-this-device-push';

export function subscribeDevices(onChange: () => void) {
  const client = requireSupabase();
  // Unique topic per subscriber — reusing a fixed name returns an already
  // subscribed channel, and .on() after subscribe() throws.
  const channelName = `employee_notification_devices:${crypto.randomUUID()}`;
  const channel = client.channel(channelName);
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: TABLE },
    () => onChange(),
  );
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
