import { useCallback, useEffect, useState } from 'react';

export type TrainingToastState = {
  message: string;
  tone: 'success' | 'error';
} | null;

export function useTrainingToast(durationMs = 3200) {
  const [toast, setToast] = useState<TrainingToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs]);

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    setToast({ message, tone });
  }, []);

  return { toast, showToast, clearToast: () => setToast(null) };
}

export function TrainingCmsToast({ toast }: { toast: TrainingToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`training-cms-toast training-cms-toast--${toast.tone}`}
      role="status"
    >
      {toast.message}
    </div>
  );
}
