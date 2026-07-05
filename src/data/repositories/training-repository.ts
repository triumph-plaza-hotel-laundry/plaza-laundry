import {
  defaultTrainingState,
  type TrainingLesson,
  type TrainingState,
  type TrainingVideo,
} from '@/data/training-content';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type { TrainingLesson, TrainingState, TrainingVideo } from '@/data/training-content';

function normalizeTraining(parsed: unknown, seed: TrainingState): TrainingState {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const partial = parsed as Partial<TrainingState>;
  return {
    lessons: partial.lessons ?? seed.lessons,
    videos: partial.videos ?? seed.videos,
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
      lessons: current.lessons.map((lesson) => (lesson.id === lessonId ? next : lesson)),
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
      videos: current.videos.map((video) => (video.id === videoId ? next : video)),
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
