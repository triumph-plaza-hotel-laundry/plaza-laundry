-- Training Management CMS: independent images / videos / lessons + monthly archives.
-- Never hard-deletes archived history. Month keys use Africa/Cairo calendar months.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.training_images (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  public_url TEXT NOT NULL DEFAULT '',
  month_key TEXT NOT NULL
    CHECK (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_images_status_order
  ON public.training_images (status, display_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_images_month
  ON public.training_images (month_key, status);

CREATE TABLE IF NOT EXISTS public.training_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'youtube'
    CHECK (source_type IN ('youtube', 'mp4')),
  media_url TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  month_key TEXT NOT NULL
    CHECK (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_videos_status_order
  ON public.training_videos (status, display_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_videos_month
  ON public.training_videos (month_key, status);

CREATE TABLE IF NOT EXISTS public.training_lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  month_key TEXT NOT NULL
    CHECK (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'visible'
    CHECK (visibility IN ('visible', 'hidden')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_month_status
  ON public.training_lessons (month_key, status, display_order);
CREATE INDEX IF NOT EXISTS idx_training_lessons_visibility
  ON public.training_lessons (visibility, status);

CREATE TABLE IF NOT EXISTS public.training_monthly_archives (
  archive_month TEXT PRIMARY KEY
    CHECK (archive_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  images_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  videos_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  lessons_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_monthly_archives_archived_at
  ON public.training_monthly_archives (archived_at DESC);

ALTER TABLE public.training_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_monthly_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_images_all ON public.training_images;
DROP POLICY IF EXISTS training_videos_all ON public.training_videos;
DROP POLICY IF EXISTS training_lessons_all ON public.training_lessons;
DROP POLICY IF EXISTS training_monthly_archives_all ON public.training_monthly_archives;

CREATE POLICY training_images_all ON public.training_images
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY training_videos_all ON public.training_videos
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY training_lessons_all ON public.training_lessons
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY training_monthly_archives_all ON public.training_monthly_archives
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'training-images',
    'training-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
  ),
  (
    'training-videos',
    'training-videos',
    true,
    104857600,
    ARRAY['video/mp4', 'video/webm', 'video/quicktime']
  ),
  (
    'training-lesson-media',
    'training-lesson-media',
    true,
    20971520,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'video/mp4']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS training_images_storage_select ON storage.objects;
DROP POLICY IF EXISTS training_images_storage_insert ON storage.objects;
DROP POLICY IF EXISTS training_images_storage_update ON storage.objects;
DROP POLICY IF EXISTS training_images_storage_delete ON storage.objects;
DROP POLICY IF EXISTS training_videos_storage_select ON storage.objects;
DROP POLICY IF EXISTS training_videos_storage_insert ON storage.objects;
DROP POLICY IF EXISTS training_videos_storage_update ON storage.objects;
DROP POLICY IF EXISTS training_videos_storage_delete ON storage.objects;
DROP POLICY IF EXISTS training_lesson_media_storage_select ON storage.objects;
DROP POLICY IF EXISTS training_lesson_media_storage_insert ON storage.objects;
DROP POLICY IF EXISTS training_lesson_media_storage_update ON storage.objects;
DROP POLICY IF EXISTS training_lesson_media_storage_delete ON storage.objects;

CREATE POLICY training_images_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'training-images');
CREATE POLICY training_images_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'training-images');
CREATE POLICY training_images_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'training-images') WITH CHECK (bucket_id = 'training-images');
CREATE POLICY training_images_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'training-images');

CREATE POLICY training_videos_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'training-videos');
CREATE POLICY training_videos_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'training-videos');
CREATE POLICY training_videos_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'training-videos') WITH CHECK (bucket_id = 'training-videos');
CREATE POLICY training_videos_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'training-videos');

CREATE POLICY training_lesson_media_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'training-lesson-media');
CREATE POLICY training_lesson_media_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'training-lesson-media');
CREATE POLICY training_lesson_media_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'training-lesson-media')
  WITH CHECK (bucket_id = 'training-lesson-media');
CREATE POLICY training_lesson_media_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'training-lesson-media');

-- ---------------------------------------------------------------------------
-- Month helpers + archive (Africa/Cairo)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.training_current_month_key()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char((now() AT TIME ZONE 'Africa/Cairo'), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.training_previous_month_key()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(
    ((now() AT TIME ZONE 'Africa/Cairo')::date - INTERVAL '1 month'),
    'YYYY-MM'
  );
$$;

CREATE OR REPLACE FUNCTION public.archive_training_previous_month()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := public.training_previous_month_key();
  v_images JSONB;
  v_videos JSONB;
  v_lessons JSONB;
  v_img_count INT;
  v_vid_count INT;
  v_les_count INT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.training_monthly_archives WHERE archive_month = v_month
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyArchived', true,
      'archiveMonth', v_month
    );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.display_order, t.created_at), '[]'::jsonb),
         COUNT(*)
    INTO v_images, v_img_count
  FROM public.training_images t
  WHERE t.month_key = v_month AND t.status = 'active';

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.display_order, t.created_at), '[]'::jsonb),
         COUNT(*)
    INTO v_videos, v_vid_count
  FROM public.training_videos t
  WHERE t.month_key = v_month AND t.status = 'active';

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.display_order, t.created_at), '[]'::jsonb),
         COUNT(*)
    INTO v_lessons, v_les_count
  FROM public.training_lessons t
  WHERE t.month_key = v_month AND t.status = 'active';

  IF v_img_count = 0 AND v_vid_count = 0 AND v_les_count = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'skippedEmpty', true,
      'archiveMonth', v_month
    );
  END IF;

  INSERT INTO public.training_monthly_archives (
    archive_month, images_snapshot, videos_snapshot, lessons_snapshot, archived_at
  ) VALUES (
    v_month, v_images, v_videos, v_lessons, now()
  )
  ON CONFLICT (archive_month) DO NOTHING;

  UPDATE public.training_images
  SET status = 'archived', updated_at = now()
  WHERE month_key = v_month AND status = 'active';

  UPDATE public.training_videos
  SET status = 'archived', updated_at = now()
  WHERE month_key = v_month AND status = 'active';

  UPDATE public.training_lessons
  SET status = 'archived', updated_at = now()
  WHERE month_key = v_month AND status = 'active';

  RETURN jsonb_build_object(
    'ok', true,
    'archiveMonth', v_month,
    'images', v_img_count,
    'videos', v_vid_count,
    'lessons', v_les_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_training_previous_month() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.training_current_month_key() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.training_previous_month_key() TO anon, authenticated, service_role;

-- Schedule: 00:15 Africa/Cairo on the 1st of each month (idempotent).
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('training-month-archive');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'training-month-archive',
    '15 0 1 * *',
    $cron$SELECT public.archive_training_previous_month();$cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule for training-month-archive skipped: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
