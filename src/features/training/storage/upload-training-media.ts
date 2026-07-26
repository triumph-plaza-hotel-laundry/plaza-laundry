import { getSupabaseClient } from '@/lib/supabase/client';

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export type TrainingStorageBucket =
  | 'training-images'
  | 'training-videos'
  | 'training-lesson-media';

export type UploadProgressCallback = (percent: number) => void;

export type UploadedTrainingMedia = {
  bucket: TrainingStorageBucket;
  path: string;
  publicUrl: string;
};

function extensionForMime(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return map[mime] ?? fallback;
}

/**
 * Upload a file/blob to a Training Storage bucket with progress callbacks.
 * Uses XHR so upload progress is available (supabase-js fetch has no progress).
 */
export async function uploadTrainingMedia(options: {
  bucket: TrainingStorageBucket;
  file: Blob;
  fileNameHint?: string;
  contentType?: string;
  folder?: string;
  onProgress?: UploadProgressCallback;
}): Promise<UploadedTrainingMedia> {
  const client = requireSupabase();
  const {
    bucket,
    file,
    fileNameHint = 'upload',
    contentType = file.type || 'application/octet-stream',
    folder = 'uploads',
    onProgress,
  } = options;

  const ext = extensionForMime(
    contentType,
    fileNameHint.includes('.') ? fileNameHint.split('.').pop() || 'bin' : 'bin',
  );
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
  const path = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const {
    data: { session },
  } = await client.auth.getSession();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader(
      'Authorization',
      `Bearer ${session?.access_token || anonKey}`,
    );
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new Error(
          `Upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`,
        ),
      );
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(file);
  });

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return {
    bucket,
    path,
    publicUrl: data.publicUrl,
  };
}

export async function removeTrainingMedia(
  bucket: TrainingStorageBucket,
  path: string,
): Promise<void> {
  if (!path.trim()) return;
  const client = requireSupabase();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) {
    // Soft-fail: DB row update should still succeed if file already gone.
    console.warn('[training-storage] remove failed', path, error.message);
  }
}

export const TRAINING_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const TRAINING_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
