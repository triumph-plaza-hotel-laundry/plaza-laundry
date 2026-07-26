import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type TrainingOrderTable =
  | 'training_lessons'
  | 'training_images'
  | 'training_videos';

/**
 * Sequential display_order: max(existing) + 1 within an optional filter scope.
 * Never use Date.now() — timestamps overflow INTEGER and are not meaningful order.
 */
export async function nextTrainingDisplayOrder(
  client: SupabaseClient<Database>,
  table: TrainingOrderTable,
  filters?: Record<string, string>,
): Promise<number> {
  let query = client
    .from(table)
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  const current = Number(
    data && typeof data === 'object' && 'display_order' in data
      ? (data as { display_order: number | null }).display_order
      : 0,
  );
  return (Number.isFinite(current) ? current : 0) + 1;
}
