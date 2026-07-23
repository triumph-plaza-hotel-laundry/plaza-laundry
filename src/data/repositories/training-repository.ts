import {
  defaultTrainingState,
  normalizeLesson,
  normalizeVideo,
  createEmptyLesson,
  type TrainingLesson,
  type TrainingState,
  type TrainingVideo,
} from '@/data/training-content';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  TrainingLesson,
  TrainingState,
  TrainingVideo,
} from '@/data/training-content';

function normalizeTraining(
  parsed: unknown,
  seed: TrainingState,
): TrainingState {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const partial = parsed as Partial<TrainingState>;
  const legacyVideos = Array.isArray(partial.videos)
    ? partial.videos
        .map((item, index) => normalizeVideo(item, index))
        .filter((item): item is TrainingVideo => Boolean(item))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  let lessons = Array.isArray(partial.lessons)
    ? partial.lessons
        .map((item) => normalizeLesson(item))
        .filter((item): item is TrainingLesson => Boolean(item))
    : seed.lessons;

  // Migrate legacy top-level videos into the first lesson when needed.
  if (legacyVideos.length > 0) {
    if (lessons.length === 0) {
      lessons = [
        {
          ...createEmptyLesson(),
          title: 'فيديوهات التدريب',
          videos: legacyVideos.map((video, index) => ({
            ...video,
            displayOrder: index,
          })),
        },
      ];
    } else {
      const [first, ...rest] = lessons;
      if (first.videos.length === 0) {
        lessons = [
          {
            ...first,
            videos: legacyVideos.map((video, index) => ({
              ...video,
              displayOrder: index,
            })),
          },
          ...rest,
        ];
      }
    }
  }

  return {
    lessons,
    videos: [],
  };
}

const store = createLocalStore<TrainingState>({
  key: STORAGE_KEYS.training,
  seed: () => defaultTrainingState,
  normalize: normalizeTraining,
});

registerRepository(STORAGE_KEYS.training, store);

export const trainingRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  get training() {
    return store.getSnapshot();
  },
  addLesson(lesson: TrainingLesson) {
    const current = store.getSnapshot();
    store.replaceState({ ...current, lessons: [lesson, ...current.lessons] });
  },
  updateLesson(lessonId: string, next: TrainingLesson) {
    const current = store.getSnapshot();
    const oldValue = current.lessons.find((lesson) => lesson.id === lessonId);
    store.replaceState({
      ...current,
      lessons: current.lessons.map((lesson) =>
        lesson.id === lessonId ? next : lesson,
      ),
    });
    return oldValue;
  },
  deleteLesson(lessonId: string) {
    const current = store.getSnapshot();
    const oldValue = current.lessons.find((lesson) => lesson.id === lessonId);
    store.replaceState({
      ...current,
      lessons: current.lessons.filter((lesson) => lesson.id !== lessonId),
    });
    return oldValue;
  },
  addVideo(video: TrainingVideo) {
    const current = store.getSnapshot();
    store.replaceState({ ...current, videos: [video, ...current.videos] });
  },
  updateVideo(videoId: string, next: TrainingVideo) {
    const current = store.getSnapshot();
    const oldValue = current.videos.find((video) => video.id === videoId);
    store.replaceState({
      ...current,
      videos: current.videos.map((video) =>
        video.id === videoId ? next : video,
      ),
    });
    return oldValue;
  },
  deleteVideo(videoId: string) {
    const current = store.getSnapshot();
    const oldValue = current.videos.find((video) => video.id === videoId);
    store.replaceState({
      ...current,
      videos: current.videos.filter((video) => video.id !== videoId),
    });
    return oldValue;
  },
  replaceAll(next: TrainingState) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};
