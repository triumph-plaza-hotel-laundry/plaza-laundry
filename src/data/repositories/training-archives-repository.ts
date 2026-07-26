import type {
  TrainingImageRecord,
  TrainingLessonRecord,
  TrainingMonthlyArchiveRecord,
  TrainingSearchHit,
  TrainingVideoRecord,
} from '@/data/training-cms';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listTrainingImages } from '@/data/repositories/training-images-repository';
import { listTrainingVideos } from '@/data/repositories/training-videos-repository';
import { listTrainingLessons } from '@/data/repositories/training-lessons-repository';

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function parseSnapshotArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function mapArchive(row: {
  archive_month: string;
  images_snapshot: unknown;
  videos_snapshot: unknown;
  lessons_snapshot: unknown;
  archived_at: string;
}): TrainingMonthlyArchiveRecord {
  return {
    archive_month: row.archive_month,
    images_snapshot: parseSnapshotArray<TrainingImageRecord>(row.images_snapshot),
    videos_snapshot: parseSnapshotArray<TrainingVideoRecord>(row.videos_snapshot),
    lessons_snapshot: parseSnapshotArray<TrainingLessonRecord>(
      row.lessons_snapshot,
    ),
    archived_at: row.archived_at,
  };
}

export async function listTrainingArchives(): Promise<
  TrainingMonthlyArchiveRecord[]
> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('training_monthly_archives')
    .select('*')
    .order('archive_month', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapArchive(
      row as {
        archive_month: string;
        images_snapshot: unknown;
        videos_snapshot: unknown;
        lessons_snapshot: unknown;
        archived_at: string;
      },
    ),
  );
}

export async function getTrainingArchive(
  archiveMonth: string,
): Promise<TrainingMonthlyArchiveRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('training_monthly_archives')
    .select('*')
    .eq('archive_month', archiveMonth)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapArchive(
    data as {
      archive_month: string;
      images_snapshot: unknown;
      videos_snapshot: unknown;
      lessons_snapshot: unknown;
      archived_at: string;
    },
  );
}

/**
 * Idempotent previous-month archive. Safe to call on CMS open.
 */
export async function ensureTrainingMonthArchived(): Promise<unknown> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('archive_training_previous_month');
  if (error) throw error;
  return data;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Universal search across active + archived lessons/images/videos.
 */
export async function searchTrainingCms(
  query: string,
): Promise<TrainingSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [activeLessons, archivedLessons, activeImages, archivedImages, activeVideos, archivedVideos, archives] =
    await Promise.all([
      listTrainingLessons({ status: 'active' }),
      listTrainingLessons({ status: 'archived' }),
      listTrainingImages('active'),
      listTrainingImages('archived'),
      listTrainingVideos('active'),
      listTrainingVideos('archived'),
      listTrainingArchives(),
    ]);

  const hits: TrainingSearchHit[] = [];

  const matchLesson = (record: TrainingLessonRecord, archived: boolean) => {
    const hay = `${record.title} ${stripHtml(record.content_html)}`.toLowerCase();
    if (hay.includes(q)) hits.push({ kind: 'lesson', record, archived });
  };
  const matchImage = (record: TrainingImageRecord, archived: boolean) => {
    const hay = `${record.title} ${record.description}`.toLowerCase();
    if (hay.includes(q)) hits.push({ kind: 'image', record, archived });
  };
  const matchVideo = (record: TrainingVideoRecord, archived: boolean) => {
    const hay = `${record.title} ${record.description}`.toLowerCase();
    if (hay.includes(q)) hits.push({ kind: 'video', record, archived });
  };

  activeLessons.forEach((r) => matchLesson(r, false));
  archivedLessons.forEach((r) => matchLesson(r, true));
  activeImages.forEach((r) => matchImage(r, false));
  archivedImages.forEach((r) => matchImage(r, true));
  activeVideos.forEach((r) => matchVideo(r, false));
  archivedVideos.forEach((r) => matchVideo(r, true));

  // Also scan frozen archive snapshots (in case live rows were removed)
  for (const archive of archives) {
    for (const lesson of archive.lessons_snapshot) {
      if (hits.some((h) => h.kind === 'lesson' && h.record.id === lesson.id)) {
        continue;
      }
      matchLesson(lesson, true);
    }
    for (const image of archive.images_snapshot) {
      if (hits.some((h) => h.kind === 'image' && h.record.id === image.id)) {
        continue;
      }
      matchImage(image, true);
    }
    for (const video of archive.videos_snapshot) {
      if (hits.some((h) => h.kind === 'video' && h.record.id === video.id)) {
        continue;
      }
      matchVideo(video, true);
    }
  }

  return hits;
}

export const trainingArchivesRepository = {
  list: listTrainingArchives,
  get: getTrainingArchive,
  ensureMonthArchived: ensureTrainingMonthArchived,
  search: searchTrainingCms,
};
