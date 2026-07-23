import { useMemo } from 'react';
import { sanitizeTrainingHtml } from '@/features/training/sanitize';

type TrainingLessonContentProps = {
  html: string;
};

export function TrainingLessonContent({ html }: TrainingLessonContentProps) {
  const safeHtml = useMemo(() => sanitizeTrainingHtml(html), [html]);

  return (
    <div
      className="training-rich"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
