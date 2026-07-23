import { lazy, Suspense } from 'react';

const TrainingRichEditorInner = lazy(() =>
  import('@/features/training/editor/TrainingRichEditorInner').then(
    (module) => ({ default: module.TrainingRichEditorInner }),
  ),
);

type TrainingRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
};

export function TrainingRichEditor(props: TrainingRichEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="training-editor training-editor--loading" role="status">
          جاري تحميل المحرر…
        </div>
      }
    >
      <TrainingRichEditorInner {...props} />
    </Suspense>
  );
}
