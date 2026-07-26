import type {
  TrainingCmsStats,
  TrainingImageRecord,
  TrainingRestoreTarget,
} from '@/data/training-cms';
import {
  createTrainingEntityId,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  removeTrainingMedia,
  uploadTrainingMedia,
  type UploadProgressCallback,
} from '@/features/training/storage/upload-training-media';
import { optimizeTrainingImageToBlob } from '@/features/training/image-optimize';
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

function mapImage(row: TrainingImageRecord): TrainingImageRecord {
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    storage_path: row.storage_path ?? '',
    public_url: row.public_url ?? '',
    month_key: row.month_key,
    status: row.status === 'archived' ? 'archived' : 'active',
    display_order: Number(row.display_order) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTrainingImages(
  status: 'active' | 'archived' | 'all' = 'active',
): Promise<TrainingImageRecord[]> {
  const client = requireSupabase();
  let query = client
    .from('training_images')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapImage(row as TrainingImageRecord));
}

export async function getTrainingImage(
  id: string,
): Promise<TrainingImageRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('training_images')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapImage(data as TrainingImageRecord) : null;
}

export type CreateTrainingImageInput = {
  title: string;
  description: string;
  file: File;
  onProgress?: UploadProgressCallback;
};

export async function createTrainingImage(
  input: CreateTrainingImageInput,
): Promise<TrainingImageRecord> {
  const client = requireSupabase();
  const optimized = await optimizeTrainingImageToBlob(input.file);
  const uploaded = await uploadTrainingMedia({
    bucket: 'training-images',
    file: optimized.blob,
    contentType: optimized.mimeType,
    folder: getCurrentTrainingMonthKey(),
    onProgress: input.onProgress,
  });

  const nextOrder = await nextTrainingDisplayOrder(client, 'training_images', {
    status: 'active',
  });

  const now = new Date().toISOString();
  const row: TrainingImageRecord = {
    id: createTrainingEntityId('timg'),
    title: input.title.trim(),
    description: input.description.trim(),
    storage_path: uploaded.path,
    public_url: uploaded.publicUrl,
    month_key: getCurrentTrainingMonthKey(),
    status: 'active',
    display_order: nextOrder,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('training_images')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return mapImage(data as TrainingImageRecord);
}

export type UpdateTrainingImageInput = {
  id: string;
  title?: string;
  description?: string;
  file?: File;
  onProgress?: UploadProgressCallback;
};

/** In-place update — replaces media on the same record when file is provided. */
export async function updateTrainingImage(
  input: UpdateTrainingImageInput,
): Promise<TrainingImageRecord> {
  const client = requireSupabase();
  const existing = await getTrainingImage(input.id);
  if (!existing) {
    throw new Error('Image not found.');
  }

  let storage_path = existing.storage_path;
  let public_url = existing.public_url;

  if (input.file) {
    const optimized = await optimizeTrainingImageToBlob(input.file);
    const uploaded = await uploadTrainingMedia({
      bucket: 'training-images',
      file: optimized.blob,
      contentType: optimized.mimeType,
      folder: existing.month_key || getCurrentTrainingMonthKey(),
      onProgress: input.onProgress,
    });
    const oldPath = existing.storage_path;
    storage_path = uploaded.path;
    public_url = uploaded.publicUrl;
    if (oldPath && oldPath !== storage_path) {
      await removeTrainingMedia('training-images', oldPath);
    }
  }

  const patch = {
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description:
      input.description !== undefined
        ? input.description.trim()
        : existing.description,
    storage_path,
    public_url,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('training_images')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single();
  if (error) throw error;
  return mapImage(data as TrainingImageRecord);
}

export async function deleteTrainingImage(id: string): Promise<void> {
  const client = requireSupabase();
  const existing = await getTrainingImage(id);
  const { error } = await client.from('training_images').delete().eq('id', id);
  if (error) throw error;
  if (existing?.storage_path) {
    await removeTrainingMedia('training-images', existing.storage_path);
  }
}

export async function restoreTrainingImage(
  id: string,
  target: TrainingRestoreTarget,
): Promise<TrainingImageRecord> {
  const client = requireSupabase();
  const existing = await getTrainingImage(id);
  if (!existing) throw new Error('Image not found.');
  const patch = {
    status: 'active' as const,
    month_key:
      target === 'current' ? getCurrentTrainingMonthKey() : existing.month_key,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('training_images')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapImage(data as TrainingImageRecord);
}

export async function countTrainingImages(
  status: 'active' | 'archived' = 'active',
): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('training_images')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw error;
  return count ?? 0;
}

export const trainingImagesRepository = {
  list: listTrainingImages,
  get: getTrainingImage,
  create: createTrainingImage,
  update: updateTrainingImage,
  delete: deleteTrainingImage,
  restore: restoreTrainingImage,
  count: countTrainingImages,
};

export type { TrainingCmsStats };
