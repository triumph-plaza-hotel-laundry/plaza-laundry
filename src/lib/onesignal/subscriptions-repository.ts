import { getSupabaseClient } from '@/lib/supabase/client';

export type OneSignalSubscriptionRecord = {
  employeeId: string;
  onesignalPlayerId: string;
  device: string;
  laundryEmployeeId?: string | null;
};

export async function upsertOneSignalSubscription(
  record: OneSignalSubscriptionRecord,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const updatedAt = new Date().toISOString();
  const { error } = await client.from('onesignal_subscriptions').upsert(
    {
      employee_id: record.employeeId,
      onesignal_player_id: record.onesignalPlayerId,
      device: record.device,
      laundry_employee_id: record.laundryEmployeeId ?? null,
      updated_at: updatedAt,
    },
    { onConflict: 'onesignal_player_id' },
  );

  if (error && import.meta.env.DEV) {
    console.error('[onesignal] Failed to upsert subscription:', error.message);
  }
}

export async function removeOneSignalSubscriptionByPlayerId(
  onesignalPlayerId: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !onesignalPlayerId) {
    return;
  }

  const { error } = await client
    .from('onesignal_subscriptions')
    .delete()
    .eq('onesignal_player_id', onesignalPlayerId);

  if (error && import.meta.env.DEV) {
    console.error('[onesignal] Failed to remove subscription:', error.message);
  }
}

export async function removeOneSignalSubscriptionsForEmployee(
  employeeId: string,
  onesignalPlayerId?: string | null,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !employeeId) {
    return;
  }

  let query = client
    .from('onesignal_subscriptions')
    .delete()
    .eq('employee_id', employeeId);

  if (onesignalPlayerId) {
    query = query.eq('onesignal_player_id', onesignalPlayerId);
  }

  const { error } = await query;

  if (error && import.meta.env.DEV) {
    console.error(
      '[onesignal] Failed to remove employee subscriptions:',
      error.message,
    );
  }
}
