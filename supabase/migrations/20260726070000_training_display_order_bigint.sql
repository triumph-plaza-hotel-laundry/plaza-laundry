-- display_order used Date.now() ms timestamps which overflow INTEGER.
ALTER TABLE public.training_lessons
  ALTER COLUMN display_order TYPE BIGINT;
ALTER TABLE public.training_images
  ALTER COLUMN display_order TYPE BIGINT;
ALTER TABLE public.training_videos
  ALTER COLUMN display_order TYPE BIGINT;
