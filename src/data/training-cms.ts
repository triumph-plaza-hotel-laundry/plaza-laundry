/** Shared types for the Training Management CMS (independent modules). */

export type TrainingCmsStatus = 'active' | 'archived';
export type TrainingLessonVisibility = 'visible' | 'hidden';
export type TrainingVideoSourceType = 'youtube' | 'mp4';

export type TrainingImageRecord = {
  id: string;
  title: string;
  description: string;
  storage_path: string;
  public_url: string;
  month_key: string;
  status: TrainingCmsStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TrainingVideoRecord = {
  id: string;
  title: string;
  description: string;
  source_type: TrainingVideoSourceType;
  media_url: string;
  storage_path: string;
  thumbnail_url: string;
  month_key: string;
  status: TrainingCmsStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TrainingLessonRecord = {
  id: string;
  title: string;
  content_html: string;
  month_key: string;
  status: TrainingCmsStatus;
  visibility: TrainingLessonVisibility;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TrainingMonthlyArchiveRecord = {
  archive_month: string;
  images_snapshot: TrainingImageRecord[];
  videos_snapshot: TrainingVideoRecord[];
  lessons_snapshot: TrainingLessonRecord[];
  archived_at: string;
};

export type TrainingCmsStats = {
  activeLessons: number;
  archivedLessons: number;
  activeImages: number;
  activeVideos: number;
  currentMonthLessons: number;
};

export type TrainingRestoreTarget = 'original' | 'current';

export type TrainingSearchHit =
  | { kind: 'lesson'; record: TrainingLessonRecord; archived: boolean }
  | { kind: 'image'; record: TrainingImageRecord; archived: boolean }
  | { kind: 'video'; record: TrainingVideoRecord; archived: boolean };
