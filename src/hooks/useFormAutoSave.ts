import { useCallback, useEffect, useRef, useState } from 'react';

export type FormSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useFormAutoSave(flush: () => Promise<void>) {
  const [status, setStatus] = useState<FormSaveStatus>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const commit = useCallback(
    async (action: () => void) => {
      action();
      setStatus('saving');

      try {
        await flush();
        setStatus('saved');

        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(() => setStatus('idle'), 2500);
      } catch {
        setStatus('error');
      }
    },
    [flush],
  );

  return { status, commit };
}
