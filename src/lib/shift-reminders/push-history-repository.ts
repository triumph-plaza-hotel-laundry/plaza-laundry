import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

export type PushNotificationHistoryRow =
  Database['public']['Tables']['push_notification_history']['Row'];

export type PushHistoryStatus = PushNotificationHistoryRow['status'];

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
