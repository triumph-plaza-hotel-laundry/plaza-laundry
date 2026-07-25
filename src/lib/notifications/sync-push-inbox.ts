import { requireSupabase } from '@/features/notifications/shared/supabase';
import { getNotificationSetting } from '@/features/notifications/settings';
import { readLocalDeviceLink } from '@/features/notifications/pairing/local-device-link';
import {
  notificationsStore,
  pushInboxNotificationId,
  type AppNotification,
} from '@/lib/notifications';

type InboxRow = {
  id: string;
  employee_id: string;
  title: string;
  body: string;
  status: 'sent' | 'failed' | 'skipped' | 'pending';
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
};

/**
 * Sync server inbox (push mirrors) into the local notification bell.
 * Birthdays remain client-generated; push rows come from employee_inbox_notifications.
 */
export async function syncPushInboxNotifications(): Promise<void> {
  const link = readLocalDeviceLink();
  if (!link?.linked || !link.laundryEmployeeId) {
    // Drop push items if this device is not linked.
    notificationsStore.update((current) =>
      current.filter((n) => n.type !== 'push'),
    );
    return;
  }

  const employeeId = link.laundryEmployeeId;
  const retentionDays = Number.parseInt(
    await getNotificationSetting('bell_retention_days'),
    10,
  );
  const days = Number.isFinite(retentionDays) ? retentionDays : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const client = requireSupabase();
  const { data, error } = await client
    .from('employee_inbox_notifications')
    .select('id, employee_id, title, body, status, created_at, read_at, deleted_at')
    .eq('employee_id', employeeId)
    .is('deleted_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('[notifications/inbox] sync failed', error.message);
    return;
  }

  const pushItems: AppNotification[] = ((data ?? []) as InboxRow[]).map(
    (row) => ({
      id: pushInboxNotificationId(row.id),
      type: 'push' as const,
      employeeId: row.employee_id,
      employeeName: { en: '', ar: '' },
      dateKey: row.created_at.slice(0, 10),
      createdAt: row.created_at,
      read: Boolean(row.read_at),
      title: row.title,
      body: row.body,
      status: row.status,
    }),
  );

  notificationsStore.update((current) => {
    const birthdays = current.filter((n) => n.type === 'birthday');
    const readById = new Map(
      current.filter((n) => n.type === 'push').map((n) => [n.id, n.read]),
    );
    const mergedPush = pushItems.map((item) => ({
      ...item,
      read: item.read || Boolean(readById.get(item.id)),
    }));
    return [...mergedPush, ...birthdays].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });
}

export async function markPushInboxRead(localId: string): Promise<void> {
  const link = readLocalDeviceLink();
  if (!link?.laundryEmployeeId || !localId.startsWith('push:')) return;
  const serverId = localId.slice('push:'.length);
  notificationsStore.markRead(localId);
  try {
    await requireSupabase().rpc('mark_inbox_notification_read', {
      p_id: serverId,
      p_employee_id: link.laundryEmployeeId,
    });
  } catch (error) {
    console.warn('[notifications/inbox] mark read failed', error);
  }
}

export async function deletePushInbox(localId: string): Promise<void> {
  const link = readLocalDeviceLink();
  if (!link?.laundryEmployeeId || !localId.startsWith('push:')) {
    notificationsStore.remove(localId);
    return;
  }
  const serverId = localId.slice('push:'.length);
  notificationsStore.remove(localId);
  try {
    await requireSupabase().rpc('delete_inbox_notification', {
      p_id: serverId,
      p_employee_id: link.laundryEmployeeId,
    });
  } catch (error) {
    console.warn('[notifications/inbox] delete failed', error);
  }
}
