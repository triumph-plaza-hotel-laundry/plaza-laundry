import { useCallback } from 'react';
import {
  trainingRepository,
  type TrainingLesson,
  type TrainingVideo,
} from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useTrainingStorage() {
  const training = useSyncStore(trainingRepository);
  const { assertCan, logAction } = useAuth();

  const addLesson = useCallback(
    (lesson: TrainingLesson) => {
      assertCan('training', 'create');
      trainingRepository.addLesson(lesson);
      logAction({
        action: 'training.createLesson',
        page: 'training',
        newValue: lesson,
      });
    },
    [assertCan, logAction],
  );

  const updateLesson = useCallback(
    (lessonId: string, next: TrainingLesson) => {
      assertCan('training', 'update');
      const oldValue = trainingRepository.updateLesson(lessonId, next);
      logAction({
        action: 'training.updateLesson',
        page: 'training',
        oldValue,
        newValue: next,
      });
    },
    [assertCan, logAction],
  );

  const deleteLesson = useCallback(
    (lessonId: string) => {
      assertCan('training', 'delete');
      const oldValue = trainingRepository.deleteLesson(lessonId);
      logAction({
        action: 'training.deleteLesson',
        page: 'training',
        oldValue,
      });
    },
    [assertCan, logAction],
  );

  const addVideo = useCallback(
    (video: TrainingVideo) => {
      assertCan('training', 'create');
      trainingRepository.addVideo(video);
      logAction({
        action: 'training.createVideo',
        page: 'training',
        newValue: video,
      });
    },
    [assertCan, logAction],
  );

  const updateVideo = useCallback(
    (videoId: string, next: TrainingVideo) => {
      assertCan('training', 'update');
      const oldValue = trainingRepository.updateVideo(videoId, next);
      logAction({
        action: 'training.updateVideo',
        page: 'training',
        oldValue,
        newValue: next,
      });
    },
    [assertCan, logAction],
  );

  const deleteVideo = useCallback(
    (videoId: string) => {
      assertCan('training', 'delete');
      const oldValue = trainingRepository.deleteVideo(videoId);
      logAction({ action: 'training.deleteVideo', page: 'training', oldValue });
    },
    [assertCan, logAction],
  );

  return {
    training,
    addLesson,
    updateLesson,
    deleteLesson,
    addVideo,
    updateVideo,
    deleteVideo,
  };
}
