import type {
  TrainingCmsStats,
  TrainingLessonRecord,
  TrainingLessonVisibility,
  TrainingRestoreTarget,
} from '@/data/training-cms';
import {
  createTrainingEntityId,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import { getSupabaseClient } from '@/lib/supabase/client';
import { countTrainingImages } from '@/data/repositories/training-images-repository';
import { countTrainingVideos } from '@/data/repositories/training-videos-repository';
import { nextTrainingDisplayOrder } from '@/data/repositories/training-order';

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function mapLesson(row: TrainingLessonRecord): TrainingLessonRecord {
  return {
    id: row.id,
    title: row.title ?? '',
    content_html: row.content_html ?? '',
    month_key: row.month_key,
    status: row.status === 'archived' ? 'archived' : 'active',
    visibility: row.visibility === 'hidden' ? 'hidden' : 'visible',
    display_order: Number(row.display_order) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTrainingLessons(options?: {
  status?: 'active' | 'archived' | 'all';
  monthKey?: string;
  visibility?: TrainingLessonVisibility | 'all';
}): Promise<TrainingLessonRecord[]> {
  const client = requireSupabase();
  let query = client
    .from('training_lessons')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  const status = options?.status ?? 'active';
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (options?.monthKey) {
    query = query.eq('month_key', options.monthKey);
  }
  if (options?.visibility && options.visibility !== 'all') {
    query = query.eq('visibility', options.visibility);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapLesson(row as TrainingLessonRecord));
}

export async function getTrainingLesson(
  id: string,
): Promise<TrainingLessonRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('training_lessons')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLesson(data as TrainingLessonRecord) : null;
}

export type CreateTrainingLessonInput = {
  title: string;
  contentHtml?: string;
  visibility?: TrainingLessonVisibility;
  monthKey?: string;
};

export async function createTrainingLesson(
  input: CreateTrainingLessonInput,
): Promise<TrainingLessonRecord> {
  const client = requireSupabase();
  const title = input.title.trim();
  if (!title) throw new Error('Lesson title is required.');

  const monthKey = input.monthKey ?? getCurrentTrainingMonthKey();
  const nextOrder = await nextTrainingDisplayOrder(client, 'training_lessons', {
    month_key: monthKey,
  });

  const now = new Date().toISOString();
  const row: TrainingLessonRecord = {
    id: createTrainingEntityId('tles'),
    title,
    content_html: input.contentHtml ?? '',
    month_key: monthKey,
    status: 'active',
    visibility: input.visibility ?? 'visible',
    display_order: nextOrder,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('training_lessons')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data as TrainingLessonRecord);
}

export type UpdateTrainingLessonInput = {
  id: string;
  title?: string;
  contentHtml?: string;
  visibility?: TrainingLessonVisibility;
  monthKey?: string;
  displayOrder?: number;
};

/** In-place update of an existing lesson record only. */
export async function updateTrainingLesson(
  input: UpdateTrainingLessonInput,
): Promise<TrainingLessonRecord> {
  const client = requireSupabase();
  const existing = await getTrainingLesson(input.id);
  if (!existing) throw new Error('Lesson not found.');

  const patch = {
    title: input.title !== undefined ? input.title.trim() : existing.title,
    content_html:
      input.contentHtml !== undefined
        ? input.contentHtml
        : existing.content_html,
    visibility: input.visibility ?? existing.visibility,
    month_key: input.monthKey ?? existing.month_key,
    display_order:
      input.displayOrder !== undefined
        ? input.displayOrder
        : existing.display_order,
    updated_at: new Date().toISOString(),
  };

  if (!patch.title) throw new Error('Lesson title is required.');

  const { data, error } = await client
    .from('training_lessons')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data as TrainingLessonRecord);
}

export async function reorderTrainingLessons(
  orderedIds: string[],
): Promise<void> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  await Promise.all(
    orderedIds.map(async (id, index) => {
      const { error } = await client
        .from('training_lessons')
        .update({ display_order: index + 1, updated_at: now })
        .eq('id', id);
      if (error) throw error;
    }),
  );
}

export async function deleteTrainingLesson(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('training_lessons').delete().eq('id', id);
  if (error) throw error;
}

/** Soft-archive a lesson (status=archived). Does not hard-delete. */
export async function archiveTrainingLesson(
  id: string,
): Promise<TrainingLessonRecord> {
  const client = requireSupabase();
  const existing = await getTrainingLesson(id);
  if (!existing) throw new Error('Lesson not found.');
  const { data, error } = await client
    .from('training_lessons')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data as TrainingLessonRecord);
}

/** Duplicate an existing lesson into the same month as a new active row. */
export async function duplicateTrainingLesson(
  id: string,
): Promise<TrainingLessonRecord> {
  const existing = await getTrainingLesson(id);
  if (!existing) throw new Error('Lesson not found.');
  return createTrainingLesson({
    title: `${existing.title || 'درس'} (نسخة)`,
    contentHtml: existing.content_html,
    visibility: existing.visibility,
    monthKey: existing.month_key,
  });
}

export async function restoreTrainingLesson(
  id: string,
  target: TrainingRestoreTarget,
): Promise<TrainingLessonRecord> {
  const client = requireSupabase();
  const existing = await getTrainingLesson(id);
  if (!existing) throw new Error('Lesson not found.');
  const patch = {
    status: 'active' as const,
    month_key:
      target === 'current' ? getCurrentTrainingMonthKey() : existing.month_key,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('training_lessons')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data as TrainingLessonRecord);
}

export async function countTrainingLessons(options?: {
  status?: 'active' | 'archived';
  monthKey?: string;
}): Promise<number> {
  const client = requireSupabase();
  let query = client
    .from('training_lessons')
    .select('id', { count: 'exact', head: true });
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.monthKey) {
    query = query.eq('month_key', options.monthKey);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getTrainingCmsStats(): Promise<TrainingCmsStats> {
  const currentMonth = getCurrentTrainingMonthKey();
  const [activeLessons, archivedLessons, activeImages, activeVideos, currentMonthLessons] =
    await Promise.all([
      countTrainingLessons({ status: 'active' }),
      countTrainingLessons({ status: 'archived' }),
      countTrainingImages('active'),
      countTrainingVideos('active'),
      countTrainingLessons({ status: 'active', monthKey: currentMonth }),
    ]);

  return {
    activeLessons,
    archivedLessons,
    activeImages,
    activeVideos,
    currentMonthLessons,
  };
}

export const trainingLessonsRepository = {
  list: listTrainingLessons,
  get: getTrainingLesson,
  create: createTrainingLesson,
  update: updateTrainingLesson,
  reorder: reorderTrainingLessons,
  delete: deleteTrainingLesson,
  archive: archiveTrainingLesson,
  duplicate: duplicateTrainingLesson,
  restore: restoreTrainingLesson,
  count: countTrainingLessons,
  stats: getTrainingCmsStats,
};
