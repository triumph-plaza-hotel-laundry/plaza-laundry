import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

export type PushNotificationHistoryRow =
  Database['public']['Tables']['push_notification_history']['Row'];

export type PushHistoryStatus = PushNotificationHistoryRow['status'];

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export async function listPushNotificationHistory(
  limit = 200,
): Promise<PushNotificationHistoryRow[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('push_notification_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === 'PGRST205') {
      throw new Error(
        'push_notification_history table is missing. Run: npm run apply:push-notifications',
      );
    }
    throw new Error(error.message);
  }

  return data ?? [];
}

/** Permanently delete Shift Notifications history rows by id. */
export async function deletePushNotificationHistoryByIds(
  ids: string[],
): Promise<number> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return 0;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('push_notification_history')
    .delete()
    .in('id', uniqueIds)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? uniqueIds.length;
}

/** Permanently delete every Shift Notifications history row. */
export async function deleteAllPushNotificationHistory(): Promise<number> {
  const client = requireSupabase();
  // PostgREST requires a filter for DELETE; created_at is always set.
  const { data, error } = await client
    .from('push_notification_history')
    .delete()
    .gte('created_at', '1970-01-01')
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
