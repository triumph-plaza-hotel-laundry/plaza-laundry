import { getCurrentTrainingMonthKey } from '@/features/training/cms/month-key';
import { createTrainingLesson } from '@/data/repositories/training-lessons-repository';
import { trainingRepository } from '@/data/repositories/training-repository';
import { isTrainingContentEmpty } from '@/data/training-content';

const FLAG = 'tpl-training-cms-migrated-v1';

/**
 * One-time import of legacy tpl-training JSON lesson into training_lessons.
 */
export async function migrateLegacyTrainingIfNeeded(): Promise<boolean> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(FLAG)) {
    return false;
  }

  try {
    await trainingRepository.hydrate();
  } catch {
    // ignore hydrate failures
  }

  const legacy = trainingRepository.training;
  const lesson = legacy.lessons?.[0];
  if (!lesson || !lesson.title.trim()) {
    localStorage.setItem(FLAG, '1');
    return false;
  }

  if (
    isTrainingContentEmpty(lesson.contentHtml) &&
    !(lesson.videos?.length > 0)
  ) {
    localStorage.setItem(FLAG, '1');
    return false;
  }

  let html = lesson.contentHtml || '';
  if (lesson.videos?.length) {
    const links = lesson.videos
      .map((v) => `<p><a href="${v.youtubeUrl}">${v.title || 'Video'}</a></p>`)
      .join('');
    html = `${html}<hr/><h3>Legacy videos</h3>${links}`;
  }

  await createTrainingLesson({
    title: lesson.title.trim(),
    contentHtml: html,
    monthKey: getCurrentTrainingMonthKey(),
    visibility: 'visible',
  });

  localStorage.setItem(FLAG, '1');
  return true;
}
