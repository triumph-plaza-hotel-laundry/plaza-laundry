import { useCallback, useEffect, useState } from 'react';
import {
  PUSH_PIPELINE_STAGES,
  clearPushTrace,
  loadPushTraceReport,
  subscribePushTraceLive,
  type PushPipelineAnalysis,
  type PushTraceEntry,
} from '@/lib/onesignal/push-trace';
import '@/features/employee-devices/push-client-trace-panel.css';

function formatDetail(detail: unknown): string {
  if (detail == null) return '';
  try {
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function PushClientTracePanel() {
  const [entries, setEntries] = useState<PushTraceEntry[]>([]);
  const [analysis, setAnalysis] = useState<PushPipelineAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const report = await loadPushTraceReport();
      setEntries(report.entries.slice(-80).reverse());
      setAnalysis(report.analysis);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load logs');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = subscribePushTraceLive(() => {
      void refresh();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const poll = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(poll);
    };
  }, [refresh]);

  const onClear = async () => {
    setBusy(true);
    try {
      await clearPushTrace();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Clear failed');
    } finally {
      setBusy(false);
    }
  };

  const seen = analysis?.seen ?? {};

  return (
    <section className="push-client-trace" aria-label="Push client logs">
      <div className="push-client-trace__header">
        <h2 className="push-client-trace__title">
          Push client logs (Realme SW test)
        </h2>
        <div className="push-client-trace__actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh
          </button>
          <button type="button" disabled={busy} onClick={() => void onClear()}>
            Clear
          </button>
        </div>
      </div>

      <p className="push-client-trace__help">
        1) Open this page → Refresh. 2) Background the app (home button). 3)
        Admin sends a test push. 4) Return here and Refresh. Stages below show
        where the OS notification path stops on this phone.
      </p>

      {error ? <p className="push-client-trace__error">{error}</p> : null}

      {analysis ? (
        <div className="push-client-trace__verdict">
          <p>
            <strong>Stop:</strong>{' '}
            {analysis.stoppedAt ? analysis.stoppedAt : 'none (SW display path OK)'}
          </p>
          <p>{analysis.note}</p>
        </div>
      ) : null}

      <ul className="push-client-trace__stages">
        {PUSH_PIPELINE_STAGES.map((stage) => {
          const count = seen[stage] ?? 0;
          const ok = count > 0;
          return (
            <li
              key={stage}
              className={
                ok
                  ? 'push-client-trace__stage push-client-trace__stage--ok'
                  : 'push-client-trace__stage push-client-trace__stage--miss'
              }
            >
              <span>{ok ? '✓' : '○'}</span>
              <code>{stage}</code>
              <span>×{count}</span>
            </li>
          );
        })}
        {(seen['showNotification-threw'] ?? 0) > 0 ? (
          <li className="push-client-trace__stage push-client-trace__stage--err">
            <span>!</span>
            <code>showNotification-threw</code>
            <span>×{seen['showNotification-threw']}</span>
          </li>
        ) : null}
      </ul>

      <ol className="push-client-trace__list">
        {entries.length === 0 ? (
          <li className="push-client-trace__empty">No local logs yet.</li>
        ) : (
          entries.map((entry, index) => (
            <li key={`${entry.at}-${entry.stage}-${index}`}>
              <div className="push-client-trace__row">
                <time dateTime={entry.at}>{entry.at.slice(11, 19)}</time>
                <code>{entry.stage}</code>
                <span className="push-client-trace__src">
                  {entry.source ?? '—'}
                </span>
              </div>
              {entry.detail != null ? (
                <pre className="push-client-trace__detail">
                  {formatDetail(entry.detail)}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
