export type TrainingVideoSource = 'youtube' | 'mp4';

export type TrainingVideo = {
  id: string;
  title: string;
  description: string;
  /**
   * Primary media URL / data URL. Historically named youtubeUrl;
   * also accepts direct MP4 URLs and uploaded MP4 data URLs.
   */
  youtubeUrl: string;
  duration: string;
  thumbnailUrl: string;
  displayOrder: number;
  active: boolean;
  sourceType: TrainingVideoSource;
};

export type TrainingLesson = {
  id: string;
  /** Arabic title — required to publish a lesson */
  title: string;
  /** Optional Arabic rich HTML (text, images, tables) */
  contentHtml: string;
  /** Optional videos attached to this lesson */
  videos: TrainingVideo[];
  lastUpdated: string;
};

export type TrainingState = {
  lessons: TrainingLesson[];
  /**
   * Legacy top-level videos (pre per-lesson videos).
   * Kept for save/load compatibility; migrated into lessons on normalize.
   */
  videos: TrainingVideo[];
};

/** Read Arabic text from a plain string or legacy `{ en, ar }` object. */
export function pickArabicText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const record = value as { ar?: unknown; en?: unknown };
    if (typeof record.ar === 'string' && record.ar.trim()) {
      return record.ar;
    }
    if (typeof record.en === 'string') {
      return record.en;
    }
  }
  return '';
}

export function detectVideoSource(url: string): TrainingVideoSource {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) {
    return 'youtube';
  }
  if (
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.includes('youtube-nocookie.com')
  ) {
    return 'youtube';
  }
  if (
    trimmed.endsWith('.mp4') ||
    trimmed.endsWith('.webm') ||
    trimmed.endsWith('.ogg') ||
    trimmed.includes('.mp4?') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:video')
  ) {
    return 'mp4';
  }
  return 'youtube';
}

/** True when HTML has no visible text and no media/table nodes. */
export function isTrainingContentEmpty(html: string): boolean {
  const trimmed = (html || '').trim();
  if (!trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>') {
    return true;
  }
  if (/<(img|table|iframe|video|figure|ul|ol|blockquote|hr)\b/i.test(trimmed)) {
    return false;
  }
  const plain = trimmed
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
  return plain.length === 0;
}

export function lessonHasVideos(lesson: TrainingLesson): boolean {
  return lesson.videos.some(
    (video) => video.active !== false && Boolean(video.youtubeUrl.trim()),
  );
}

export function lessonIsPublishable(lesson: TrainingLesson): boolean {
  return lesson.title.trim().length > 0;
}

export function createEmptyVideo(order = 0): TrainingVideo {
  return {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    description: '',
    youtubeUrl: '',
    duration: '',
    thumbnailUrl: '',
    displayOrder: order,
    active: true,
    sourceType: 'youtube',
  };
}

export function createEmptyLesson(): TrainingLesson {
  return {
    id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    contentHtml: '',
    videos: [],
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}

export function normalizeVideo(raw: unknown, index = 0): TrainingVideo | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as Partial<TrainingVideo> & {
    videoUrl?: string;
    title?: unknown;
    description?: unknown;
  };
  if (typeof item.id !== 'string') {
    return null;
  }
  const youtubeUrl =
    (typeof item.youtubeUrl === 'string' && item.youtubeUrl) ||
    (typeof item.videoUrl === 'string' && item.videoUrl) ||
    '';
  const sourceType =
    item.sourceType === 'mp4' || item.sourceType === 'youtube'
      ? item.sourceType
      : detectVideoSource(youtubeUrl);

  return {
    id: item.id,
    title: pickArabicText(item.title),
    description: pickArabicText(item.description),
    youtubeUrl,
    duration: typeof item.duration === 'string' ? item.duration : '',
    thumbnailUrl:
      typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : '',
    displayOrder:
      typeof item.displayOrder === 'number' && Number.isFinite(item.displayOrder)
        ? item.displayOrder
        : index,
    active: typeof item.active === 'boolean' ? item.active : true,
    sourceType,
  };
}

export function normalizeLesson(raw: unknown): TrainingLesson | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as Partial<TrainingLesson> & {
    title?: unknown;
    contentHtml?: unknown;
    videos?: unknown;
  };
  if (typeof item.id !== 'string') {
    return null;
  }
  const videos = Array.isArray(item.videos)
    ? item.videos
        .map((video, index) => normalizeVideo(video, index))
        .filter((video): video is TrainingVideo => Boolean(video))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((video, index) => ({ ...video, displayOrder: index }))
    : [];

  return {
    id: item.id,
    title: pickArabicText(item.title),
    contentHtml: pickArabicText(item.contentHtml),
    videos,
    lastUpdated:
      typeof item.lastUpdated === 'string'
        ? item.lastUpdated
        : new Date().toISOString().slice(0, 10),
  };
}

/** Empty by default — no demo / sample content. */
export const defaultTrainingState: TrainingState = {
  lessons: [],
  videos: [],
};
