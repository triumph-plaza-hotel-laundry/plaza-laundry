import type {
  TrainingRestoreTarget,
  TrainingVideoRecord,
  TrainingVideoSourceType,
} from '@/data/training-cms';
import {
  createTrainingEntityId,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  removeTrainingMedia,
  TRAINING_MAX_VIDEO_BYTES,
  uploadTrainingMedia,
  type UploadProgressCallback,
} from '@/features/training/storage/upload-training-media';
import { detectVideoSource } from '@/data/training-content';
import { getYoutubeThumbnail } from '@/features/training/youtube';

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function mapVideo(row: TrainingVideoRecord): TrainingVideoRecord {
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    source_type: row.source_type === 'mp4' ? 'mp4' : 'youtube',
    media_url: row.media_url ?? '',
    storage_path: row.storage_path ?? '',
    thumbnail_url: row.thumbnail_url ?? '',
    month_key: row.month_key,
    status: row.status === 'archived' ? 'archived' : 'active',
    display_order: Number(row.display_order) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTrainingVideos(
  status: 'active' | 'archived' | 'all' = 'active',
): Promise<TrainingVideoRecord[]> {
  const client = requireSupabase();
  let query = client
    .from('training_videos')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapVideo(row as TrainingVideoRecord));
}

export async function getTrainingVideo(
  id: string,
): Promise<TrainingVideoRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('training_videos')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapVideo(data as TrainingVideoRecord) : null;
}

export type CreateTrainingVideoInput = {
  title: string;
  description: string;
  /** YouTube URL when source is youtube */
  youtubeUrl?: string;
  /** MP4 file when source is mp4 */
  file?: File;
  onProgress?: UploadProgressCallback;
};

export async function createTrainingVideo(
  input: CreateTrainingVideoInput,
): Promise<TrainingVideoRecord> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  let source_type: TrainingVideoSourceType = 'youtube';
  let media_url = '';
  let storage_path = '';
  let thumbnail_url = '';

  if (input.file) {
    if (input.file.size > TRAINING_MAX_VIDEO_BYTES) {
      throw new Error('Video is too large. Maximum upload size is 100 MB.');
    }
    if (!input.file.type.startsWith('video/')) {
      throw new Error('Only video files are allowed.');
    }
    source_type = 'mp4';
    const uploaded = await uploadTrainingMedia({
      bucket: 'training-videos',
      file: input.file,
      contentType: input.file.type || 'video/mp4',
      folder: getCurrentTrainingMonthKey(),
      onProgress: input.onProgress,
    });
    media_url = uploaded.publicUrl;
    storage_path = uploaded.path;
  } else {
    const url = (input.youtubeUrl ?? '').trim();
    if (!url) {
      throw new Error('Provide a YouTube link or an MP4 file.');
    }
    source_type = detectVideoSource(url) === 'mp4' ? 'mp4' : 'youtube';
    media_url = url;
    thumbnail_url =
      source_type === 'youtube' ? getYoutubeThumbnail(url) || '' : '';
  }

  const row: TrainingVideoRecord = {
    id: createTrainingEntityId('tvid'),
    title: input.title.trim(),
    description: input.description.trim(),
    source_type,
    media_url,
    storage_path,
    thumbnail_url,
    month_key: getCurrentTrainingMonthKey(),
    status: 'active',
    display_order: Date.now(),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('training_videos')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return mapVideo(data as TrainingVideoRecord);
}

export type UpdateTrainingVideoInput = {
  id: string;
  title?: string;
  description?: string;
  youtubeUrl?: string;
  file?: File;
  onProgress?: UploadProgressCallback;
};

/** In-place update — replaces media on the same record when provided. */
export async function updateTrainingVideo(
  input: UpdateTrainingVideoInput,
): Promise<TrainingVideoRecord> {
  const client = requireSupabase();
  const existing = await getTrainingVideo(input.id);
  if (!existing) throw new Error('Video not found.');

  let source_type = existing.source_type;
  let media_url = existing.media_url;
  let storage_path = existing.storage_path;
  let thumbnail_url = existing.thumbnail_url;

  if (input.file) {
    if (input.file.size > TRAINING_MAX_VIDEO_BYTES) {
      throw new Error('Video is too large. Maximum upload size is 100 MB.');
    }
    const uploaded = await uploadTrainingMedia({
      bucket: 'training-videos',
      file: input.file,
      contentType: input.file.type || 'video/mp4',
      folder: existing.month_key || getCurrentTrainingMonthKey(),
      onProgress: input.onProgress,
    });
    const oldPath = existing.storage_path;
    source_type = 'mp4';
    media_url = uploaded.publicUrl;
    storage_path = uploaded.path;
    thumbnail_url = '';
    if (oldPath && oldPath !== storage_path) {
      await removeTrainingMedia('training-videos', oldPath);
    }
  } else if (input.youtubeUrl !== undefined) {
    const url = input.youtubeUrl.trim();
    if (!url) throw new Error('Video URL is required.');
    source_type = detectVideoSource(url) === 'mp4' ? 'mp4' : 'youtube';
    media_url = url;
    thumbnail_url =
      source_type === 'youtube' ? getYoutubeThumbnail(url) || '' : '';
    if (existing.storage_path) {
      await removeTrainingMedia('training-videos', existing.storage_path);
      storage_path = '';
    }
  }

  const patch = {
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description:
      input.description !== undefined
        ? input.description.trim()
        : existing.description,
    source_type,
    media_url,
    storage_path,
    thumbnail_url,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('training_videos')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single();
  if (error) throw error;
  return mapVideo(data as TrainingVideoRecord);
}

export async function deleteTrainingVideo(id: string): Promise<void> {
  const client = requireSupabase();
  const existing = await getTrainingVideo(id);
  const { error } = await client.from('training_videos').delete().eq('id', id);
  if (error) throw error;
  if (existing?.storage_path) {
    await removeTrainingMedia('training-videos', existing.storage_path);
  }
}

export async function restoreTrainingVideo(
  id: string,
  target: TrainingRestoreTarget,
): Promise<TrainingVideoRecord> {
  const client = requireSupabase();
  const existing = await getTrainingVideo(id);
  if (!existing) throw new Error('Video not found.');
  const patch = {
    status: 'active' as const,
    month_key:
      target === 'current' ? getCurrentTrainingMonthKey() : existing.month_key,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('training_videos')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapVideo(data as TrainingVideoRecord);
}

export async function countTrainingVideos(
  status: 'active' | 'archived' = 'active',
): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('training_videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw error;
  return count ?? 0;
}

export const trainingVideosRepository = {
  list: listTrainingVideos,
  get: getTrainingVideo,
  create: createTrainingVideo,
  update: updateTrainingVideo,
  delete: deleteTrainingVideo,
  restore: restoreTrainingVideo,
  count: countTrainingVideos,
};
