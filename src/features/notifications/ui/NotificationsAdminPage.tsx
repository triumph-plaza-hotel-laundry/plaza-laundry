import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { toDataURL as qrToDataUrl } from 'qrcode';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { employeesRepository } from '@/data/repositories/employees-repository';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminPermissionDenied } from '@/features/admin/components/AdminPermissionDenied';
import {
  listActiveDevices,
  subscribeDevices,
  unlinkDevice,
} from '@/features/notifications/devices';
import {
  encodeLinkPayload,
  issueLinkTicket,
} from '@/features/notifications/pairing';
import { sendTestNotification } from '@/features/notifications/send';
import type { NotificationDevice } from '@/features/notifications/shared/types';
import { NotificationEmployeePicker } from '@/features/notifications/ui/NotificationEmployeePicker';
import { sortNotificationEmployees } from '@/features/notifications/ui/notification-employee-order';
import {
  isBooleanSettingValue,
  NotificationToggle,
  settingValueAsBool,
} from '@/features/notifications/ui/NotificationToggle';
import { useAuth, useEmployees, useLanguage } from '@/hooks';
import { useSpecialAdminPermissions } from '@/hooks/useSpecialAdminPermissions';
import '@/features/admin/admin-editor.css';
import '@/features/admin/admin-permission-denied.css';
import '@/features/notifications/ui/notifications-admin.css';

type HubTab = 'devices' | 'health' | 'diagnostics' | 'settings' | 'audit';

type Props = {
  initialTab?: HubTab;
};

export function NotificationsAdminPage({ initialTab = 'devices' }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { canManageEmployeeDevices, isReady: permissionsReady } =
    useSpecialAdminPermissions();
  const { employees } = useEmployees();
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [devices, setDevices] = useState<NotificationDevice[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrEmployeeId, setQrEmployeeId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLinkUrl, setQrLinkUrl] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const qrModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void employeesRepository.hydrate();
  }, []);

  const refresh = useCallback(async () => {
    try {
      setDevices(await listActiveDevices());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load devices');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeDevices(() => void refresh()), [refresh]);

  useEffect(() => {
    if (!qrDataUrl || !qrEmployeeId) return;
    qrModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [qrDataUrl, qrEmployeeId]);

  const activeByEmployee = useMemo(() => {
    const map = new Map<string, NotificationDevice>();
    for (const d of devices) {
      map.set(d.employeeId, d);
    }
    return map;
  }, [devices]);

  const allActiveEmployees = useMemo(
    () =>
      sortNotificationEmployees(
        employees.filter((e) => e.status === 'active'),
      ),
    [employees],
  );

  const activeEmployees = useMemo(
    () =>
      sortNotificationEmployees(
        allActiveEmployees.filter((e) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            e.id.toLowerCase().includes(q) ||
            e.name.en.toLowerCase().includes(q) ||
            e.name.ar.includes(search.trim())
          );
        }),
      ),
    [allActiveEmployees, search],
  );

  const linked = activeEmployees.filter((e) => activeByEmployee.has(e.id));
  const unlinked = activeEmployees.filter((e) => !activeByEmployee.has(e.id));

  if (!permissionsReady) {
    return null;
  }
  if (!canManageEmployeeDevices) {
    return <AdminPermissionDenied />;
  }

  const nameOf = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return id;
    return language === 'ar' ? emp.name.ar : emp.name.en;
  };

  const clearQrModal = () => {
    setQrEmployeeId(null);
    setQrDataUrl(null);
    setQrLinkUrl(null);
    setQrExpiresAt(null);
  };

  const onIssueQr = async (employeeId: string) => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    clearQrModal();
    try {
      const ticket = await issueLinkTicket(employeeId, user.id);
      if (!ticket.token?.trim()) {
        throw new Error('Link ticket RPC returned no token');
      }

      const pairingUrl = encodeLinkPayload(ticket.token);
      if (!pairingUrl.startsWith('http')) {
        throw new Error(`Invalid pairing URL: ${pairingUrl}`);
      }

      const dataUrl = await qrToDataUrl(pairingUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      if (!dataUrl?.startsWith('data:image')) {
        throw new Error('QR image generation returned an empty result');
      }

      // Open dialog only after image is ready so the condition never races.
      setQrLinkUrl(pairingUrl);
      setQrExpiresAt(ticket.expiresAt);
      setQrEmployeeId(employeeId);
      setQrDataUrl(dataUrl);
      setMessage(`QR ready for ${nameOf(employeeId)}`);
    } catch (caught) {
      clearQrModal();
      setError(caught instanceof Error ? caught.message : 'Failed to issue QR');
    } finally {
      setBusy(false);
    }
  };

  const onUnlink = async (employeeId: string) => {
    if (!window.confirm(`Unlink device for ${nameOf(employeeId)}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await unlinkDevice(employeeId, user?.id);
      if (qrEmployeeId === employeeId) {
        clearQrModal();
      }
      setMessage(`Unlinked ${nameOf(employeeId)}`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unlink failed');
    } finally {
      setBusy(false);
    }
  };

  const onTest = async (employeeId: string) => {
    setBusy(true);
    setError(null);
    try {
      await sendTestNotification({
        employeeId,
        adminId: user?.id,
      });
      setMessage(`Test sent to ${nameOf(employeeId)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Test send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-editor-page notif-admin">
      <AdminPageHeader
        titleEn="Notifications Center"
        titleAr="مركز الإشعارات"
        subtitle="Link devices, monitor health, diagnose, and configure — from desktop or phone"
      />

      <nav className="notif-admin__tabs" aria-label="Notifications modules">
        {(
          [
            ['devices', 'Devices'],
            ['health', 'Health'],
            ['diagnostics', 'Diagnostics'],
            ['settings', 'Settings'],
            ['audit', 'Audit'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              tab === id ? 'notif-admin__tab is-active' : 'notif-admin__tab'
            }
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message ? <p className="notif-admin__msg">{message}</p> : null}
      {error ? <p className="notif-admin__err">{error}</p> : null}

      {tab === 'devices' ? (
        <DevicesPanel
          linked={linked}
          unlinked={unlinked}
          activeByEmployee={activeByEmployee}
          nameOf={nameOf}
          search={search}
          setSearch={setSearch}
          busy={busy}
          qrEmployeeId={qrEmployeeId}
          qrDataUrl={qrDataUrl}
          qrLinkUrl={qrLinkUrl}
          qrExpiresAt={qrExpiresAt}
          qrModalRef={qrModalRef}
          onIssueQr={onIssueQr}
          onUnlink={onUnlink}
          onTest={onTest}
          onCloseQr={clearQrModal}
        />
      ) : null}

      {tab === 'health' ? (
        <HealthPanel
          adminId={user?.id}
          onMessage={setMessage}
          onError={setError}
        />
      ) : null}
      {tab === 'diagnostics' ? (
        <DiagnosticsPanel
          employees={allActiveEmployees}
          language={language === 'ar' ? 'ar' : 'en'}
          adminId={user?.id}
          onMessage={setMessage}
          onError={setError}
        />
      ) : null}
      {tab === 'settings' ? (
        <SettingsPanel
          adminId={user?.id}
          onMessage={setMessage}
          onError={setError}
        />
      ) : null}
      {tab === 'audit' ? (
        <AuditPanel
          onError={setError}
          onMessage={setMessage}
        />
      ) : null}
    </div>
  );
}

function DevicesPanel(props: {
  linked: { id: string }[];
  unlinked: { id: string }[];
  activeByEmployee: Map<string, NotificationDevice>;
  nameOf: (id: string) => string;
  search: string;
  setSearch: (v: string) => void;
  busy: boolean;
  qrEmployeeId: string | null;
  qrDataUrl: string | null;
  qrLinkUrl: string | null;
  qrExpiresAt: string | null;
  qrModalRef: RefObject<HTMLDivElement | null>;
  onIssueQr: (id: string) => void;
  onUnlink: (id: string) => void;
  onTest: (id: string) => void;
  onCloseQr: () => void;
}) {
  return (
    <section className="notif-admin__section">
      <input
        className="notif-admin__search"
        value={props.search}
        onChange={(e) => props.setSearch(e.target.value)}
        placeholder="Filter employee list…"
      />

      {props.qrDataUrl && props.qrEmployeeId ? (
        <div
          className="notif-admin__qr-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Scan to link ${props.nameOf(props.qrEmployeeId)}`}
        >
          <div className="notif-admin__qr-modal" ref={props.qrModalRef}>
            <h3>Scan to link — {props.nameOf(props.qrEmployeeId)}</h3>
            <img src={props.qrDataUrl} alt="Link QR code" />
            {props.qrExpiresAt ? (
              <p className="notif-admin__muted">
                Expires {new Date(props.qrExpiresAt).toLocaleString()}
              </p>
            ) : null}
            {props.qrLinkUrl ? (
              <p className="notif-admin__muted notif-admin__qr-link">
                {props.qrLinkUrl}
              </p>
            ) : null}
            <p className="notif-admin__muted">
              Employee scans this QR with their phone camera — it opens the
              pairing page and links automatically (no in-app scanner).
            </p>
            <button type="button" onClick={props.onCloseQr}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <h3>Unlinked ({props.unlinked.length})</h3>
      <ul className="notif-admin__list">
        {props.unlinked.map((e) => (
          <li key={e.id} className="notif-admin__row">
            <div>
              <strong>{props.nameOf(e.id)}</strong>
              <span className="notif-admin__muted">{e.id}</span>
            </div>
            <div className="notif-admin__actions">
              <button
                type="button"
                disabled={props.busy}
                onClick={() => props.onIssueQr(e.id)}
              >
                Generate QR
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h3>Linked ({props.linked.length})</h3>
      <ul className="notif-admin__list">
        {props.linked.map((e) => {
          const device = props.activeByEmployee.get(e.id);
          return (
            <li key={e.id} className="notif-admin__row">
              <div>
                <strong>{props.nameOf(e.id)}</strong>
                <span className="notif-admin__muted">{e.id}</span>
                {device ? (
                  <span className="notif-admin__muted">
                    {device.deviceName || device.deviceId} · {device.playerId.slice(0, 12)}…
                  </span>
                ) : null}
              </div>
              <div className="notif-admin__actions">
                <button
                  type="button"
                  disabled={props.busy}
                  onClick={() => props.onTest(e.id)}
                >
                  Test
                </button>
                <button
                  type="button"
                  disabled={props.busy}
                  onClick={() => props.onIssueQr(e.id)}
                >
                  Relink QR
                </button>
                <button
                  type="button"
                  disabled={props.busy}
                  className="is-danger"
                  onClick={() => props.onUnlink(e.id)}
                >
                  Unlink
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HealthPanel(props: {
  adminId?: string;
  onMessage: (m: string | null) => void;
  onError: (m: string | null) => void;
}) {
  const [overall, setOverall] = useState('unknown');
  const [reports, setReports] = useState<
    Awaited<ReturnType<typeof import('@/features/notifications/health').runHealthProbes>>['reports']
  >([]);
  const [autoRepairs, setAutoRepairs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { getLatestHealthSnapshots } = await import(
      '@/features/notifications/health'
    );
    const snaps = await getLatestHealthSnapshots();
    setReports(snaps);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setBusy(true);
    props.onError(null);
    try {
      const { runHealthProbes } = await import('@/features/notifications/health');
      const result = await runHealthProbes(props.adminId);
      setOverall(result.overall);
      setReports(result.reports);
      setAutoRepairs(result.autoRepairs);
      props.onMessage(
        result.autoRepairs.length
          ? `Health refreshed · ${result.autoRepairs.join('; ')}`
          : 'Health refreshed',
      );
    } catch (caught) {
      props.onError(caught instanceof Error ? caught.message : 'Health probe failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="notif-admin__section">
      <div className="notif-admin__toolbar">
        <span className={`notif-admin__badge is-${overall}`}>
          Overall: {overall}
        </span>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          Refresh Health
        </button>
      </div>
      {autoRepairs.length > 0 ? (
        <p className="notif-admin__muted">Safe auto-repairs: {autoRepairs.join('; ')}</p>
      ) : null}
      <ul className="notif-admin__list">
        {reports.map((r) => (
          <li key={r.component} className="notif-admin__row">
            <div>
              <strong>{r.component}</strong>
              <span className={`notif-admin__badge is-${r.status}`}>{r.status}</span>
              <span className="notif-admin__muted">{r.message}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DiagnosticsPanel(props: {
  employees: LaundryEmployee[];
  language: 'ar' | 'en';
  adminId?: string;
  onMessage: (m: string | null) => void;
  onError: (m: string | null) => void;
}) {
  const [employeeId, setEmployeeId] = useState(props.employees[0]?.id ?? '');
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof import('@/features/notifications/diagnostics').getEmployeeDiagnosticProfile>
  > | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!employeeId && props.employees[0]?.id) {
      setEmployeeId(props.employees[0].id);
    }
  }, [employeeId, props.employees]);

  const load = async (id: string) => {
    if (!id) return;
    setBusy(true);
    props.onError(null);
    try {
      const { getEmployeeDiagnosticProfile } = await import(
        '@/features/notifications/diagnostics'
      );
      setProfile(await getEmployeeDiagnosticProfile(id));
    } catch (caught) {
      props.onError(caught instanceof Error ? caught.message : 'Diagnostics failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (employeeId) void load(employeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const run = async (action: 'refresh_status' | 'unlink' | 'export_report') => {
    if (!employeeId) return;
    setBusy(true);
    try {
      const mod = await import('@/features/notifications/diagnostics');
      const { exportEntriesAsJson } = await import('@/features/notifications/audit');
      if (action === 'export_report') {
        const p = await mod.getEmployeeDiagnosticProfile(employeeId);
        exportEntriesAsJson([p], `diagnostics-${employeeId}.json`);
        props.onMessage('Report exported');
        return;
      }
      const result = await mod.runDiagnosticAction({
        action,
        employeeId,
        adminId: props.adminId,
      });
      setProfile(result.profile ?? null);
      props.onMessage(result.message);
    } catch (caught) {
      props.onError(caught instanceof Error ? caught.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="notif-admin__section">
      <NotificationEmployeePicker
        employees={props.employees}
        language={props.language}
        value={employeeId}
        onChange={setEmployeeId}
        disabled={busy}
        label="Employee"
      />
      <div className="notif-admin__actions">
        <button type="button" disabled={busy || !employeeId} onClick={() => void run('refresh_status')}>
          Refresh
        </button>
        <button type="button" disabled={busy || !employeeId} onClick={() => void run('unlink')}>
          Unlink
        </button>
        <button type="button" disabled={busy || !employeeId} onClick={() => void run('export_report')}>
          Export
        </button>
      </div>
      {profile ? (
        <div className="notif-admin__profile">
          <p>
            Linked: <strong>{profile.linked ? 'Yes' : 'No'}</strong>
          </p>
          {profile.device ? (
            <p className="notif-admin__muted">
              Player {profile.device.playerId} · {profile.device.deviceName || profile.device.deviceId}
            </p>
          ) : null}
          <ul>
            {profile.issues.map((issue) => (
              <li key={issue.code}>
                <span className={`notif-admin__badge is-${issue.severity}`}>
                  {issue.status}
                </span>{' '}
                {issue.cause} — {issue.recommendedFix}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function SettingsPanel(props: {
  adminId?: string;
  onMessage: (m: string | null) => void;
  onError: (m: string | null) => void;
}) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { getNotificationSettings } = await import(
        '@/features/notifications/settings'
      );
      setSettings(await getNotificationSettings());
    })();
  }, []);

  const save = async (key: string, value: string) => {
    setBusy(true);
    props.onError(null);
    try {
      const { updateNotificationSetting } = await import(
        '@/features/notifications/settings'
      );
      await updateNotificationSetting(key, value, props.adminId);
      setSettings((prev) => ({ ...prev, [key]: value }));
      props.onMessage(`Saved ${key}`);
    } catch (caught) {
      props.onError(caught instanceof Error ? caught.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleBoolean = async (key: string, next: boolean) => {
    const label = next ? 'ON' : 'OFF';
    const confirmed = window.confirm(
      `Turn ${key} ${label}?`,
    );
    if (!confirmed) {
      return;
    }
    await save(key, next ? 'true' : 'false');
  };

  return (
    <section className="notif-admin__section">
      <p className="notif-admin__muted">
        Operational settings — change here instead of hardcoding.
      </p>
      <ul className="notif-admin__list">
        {Object.entries(settings).map(([key, value]) => {
          const isBoolean = isBooleanSettingValue(value);
          const labelId = `notif-setting-${key}`;

          return (
            <li
              key={key}
              className={`notif-admin__row notif-admin__row--settings${
                isBoolean ? ' notif-admin__row--toggle' : ''
              }`}
            >
              <div className="notif-admin__setting-meta">
                <span className="notif-admin__setting-name" id={labelId}>
                  {key}
                </span>
              </div>

              {isBoolean ? (
                <NotificationToggle
                  checked={settingValueAsBool(value)}
                  disabled={busy}
                  labelledBy={labelId}
                  onChange={(next) => void toggleBoolean(key, next)}
                />
              ) : (
                <>
                  <label className="notif-admin__setting-input-wrap">
                    <span className="notif-admin__sr-only">{key}</span>
                    <input
                      value={value}
                      disabled={busy}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(key, settings[key] ?? value)}
                  >
                    Save
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AuditPanel(props: {
  onError: (m: string | null) => void;
  onMessage: (m: string | null) => void;
}) {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof import('@/features/notifications/audit').listAuditLog>>
  >([]);
  const [history, setHistory] = useState<
    Awaited<
      ReturnType<typeof import('@/features/notifications/audit').listDiagnosticsHistory>
    >
  >([]);
  const [busy, setBusy] = useState(false);

  const refreshAudit = async () => {
    const audit = await import('@/features/notifications/audit');
    setRows(await audit.listAuditLog({ limit: 80 }));
  };

  useEffect(() => {
    void (async () => {
      try {
        const audit = await import('@/features/notifications/audit');
        setRows(await audit.listAuditLog({ limit: 80 }));
        setHistory(await audit.listDiagnosticsHistory({ limit: 80 }));
      } catch (caught) {
        props.onError(caught instanceof Error ? caught.message : 'Audit load failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportAll = async () => {
    const { exportEntriesAsJson } = await import('@/features/notifications/audit');
    exportEntriesAsJson(
      [{ audit: rows, diagnostics: history }],
      'notification-audit.json',
    );
  };

  const deleteOne = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this audit log entry?',
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    props.onError(null);
    try {
      const audit = await import('@/features/notifications/audit');
      await audit.deleteAuditLogEntry(id);
      await refreshAudit();
      props.onMessage('Audit log entry deleted.');
    } catch (caught) {
      props.onError(
        caught instanceof Error ? caught.message : 'Failed to delete audit entry',
      );
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    const confirmed = window.confirm(
      'This will permanently delete all audit log entries. Continue?',
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    props.onError(null);
    try {
      const audit = await import('@/features/notifications/audit');
      await audit.clearAuditLog();
      await refreshAudit();
      props.onMessage('Audit log cleared.');
    } catch (caught) {
      props.onError(
        caught instanceof Error ? caught.message : 'Failed to clear audit log',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="notif-admin__section">
      <div className="notif-admin__toolbar">
        <button type="button" disabled={busy} onClick={() => void exportAll()}>
          Export report
        </button>
        <button
          type="button"
          className="is-danger"
          disabled={busy || rows.length === 0}
          onClick={() => void clearAll()}
        >
          Clear Audit Log
        </button>
      </div>
      <h3>Audit log</h3>
      {rows.length === 0 ? (
        <p className="notif-admin__muted">No audit log entries.</p>
      ) : (
        <ul className="notif-admin__list">
          {rows.map((r) => (
            <li key={r.id} className="notif-admin__row">
              <div>
                <strong>{r.action}</strong>{' '}
                <span
                  className={`notif-admin__badge is-${
                    r.result === 'ok' ? 'healthy' : 'critical'
                  }`}
                >
                  {r.result}
                </span>
                <span className="notif-admin__muted">
                  {r.targetEmployeeId ?? '—'} ·{' '}
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="notif-admin__actions">
                <button
                  type="button"
                  className="is-danger"
                  disabled={busy}
                  onClick={() => void deleteOne(r.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h3>Diagnostics history</h3>
      <ul className="notif-admin__list">
        {history.map((r) => (
          <li key={r.id} className="notif-admin__row">
            <div>
              <strong>{r.issueCode}</strong>
              <span className="notif-admin__muted">
                {r.message} · {new Date(r.createdAt).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
