import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import {
  collectHealthReport,
  type HealthReport,
  type HealthStatus,
} from '@/lib/notification-platform';
import { runRecoveryPass } from '@/lib/notification-platform/self-healing-engine';
import { useLanguage } from '@/hooks';
import '@/features/admin/admin-notification-diagnostics.css';

function statusClass(status: HealthStatus): string {
  return `notif-diag__status notif-diag__status--${status}`;
}

export function AdminNotificationDiagnosticsPage() {
  const { t } = useLanguage();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await collectHealthReport();
      setReport(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to collect health report',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRecover = async () => {
    setRecovering(true);
    try {
      await runRecoveryPass('manual');
      await refresh();
    } finally {
      setRecovering(false);
    }
  };

  return (
    <section className="notif-diag" aria-label={t('admin.dashboard.notificationDiagnostics')}>
      <header className="notif-diag__header">
        <Activity aria-hidden className="notif-diag__icon" size={28} />
        <div>
          <h1 className="notif-diag__title">
            {t('admin.dashboard.notificationDiagnostics')}
          </h1>
          <p className="notif-diag__subtitle">
            {t('admin.dashboard.notificationDiagnosticsDesc')}
          </p>
        </div>
        <div className="notif-diag__actions">
          <button
            className="notif-diag__btn"
            disabled={loading || recovering}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="notif-diag__btn notif-diag__btn--primary"
            disabled={loading || recovering}
            onClick={() => void onRecover()}
            type="button"
          >
            Run recovery
          </button>
        </div>
      </header>

      {error ? <p className="notif-diag__error">{error}</p> : null}

      {report ? (
        <>
          <div className="notif-diag__overall">
            <span className={statusClass(report.overall)}>{report.overall}</span>
            <span>
              Collected {new Date(report.collectedAt).toLocaleString()} · Engine{' '}
              {report.engineRunning ? 'running' : 'stopped'} · Platform{' '}
              {report.platformEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>

          <div className="notif-diag__grid">
            {report.components.map((component) => (
              <article className="notif-diag__card" key={component.id}>
                <header className="notif-diag__card-head">
                  <h2>{component.id.replace(/_/g, ' ')}</h2>
                  <span className={statusClass(component.status)}>
                    {component.status}
                  </span>
                </header>
                <p>{component.message}</p>
                <dl className="notif-diag__meta">
                  <div>
                    <dt>Last repair</dt>
                    <dd>
                      {component.lastRepair
                        ? new Date(component.lastRepair).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Last sync</dt>
                    <dd>
                      {component.lastSync
                        ? new Date(component.lastSync).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <section className="notif-diag__events">
            <h2>Recent platform events</h2>
            {report.recentEvents.length === 0 ? (
              <p>No events recorded yet.</p>
            ) : (
              <ul>
                {report.recentEvents.map((event, index) => (
                  <li key={event.id ?? `${event.createdAt}-${index}`}>
                    <span className={`notif-diag__sev notif-diag__sev--${event.severity}`}>
                      {event.severity}
                    </span>
                    <span className="notif-diag__event-cat">{event.category}</span>
                    <span>{event.message}</span>
                    {event.createdAt ? (
                      <time dateTime={event.createdAt}>
                        {new Date(event.createdAt).toLocaleString()}
                      </time>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : loading ? (
        <p>Loading diagnostics…</p>
      ) : null}
    </section>
  );
}
