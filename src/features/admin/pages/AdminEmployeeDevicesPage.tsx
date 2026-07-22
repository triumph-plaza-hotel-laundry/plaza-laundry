import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Navigate } from 'react-router-dom';
import { employeesRepository } from '@/data/repositories/employees-repository';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  listLinkedDevices,
  pairDeviceFromSession,
  parsePairingPayload,
  removeLinkedDevice,
  subscribeLinkedDevices,
  type LinkedDevice,
} from '@/features/employee-devices/device-pairing-service';
import { useAuth, useEmployees, useLanguage } from '@/hooks';
import { useDevicePermissions } from '@/hooks/useDevicePermissions';
import '@/features/admin/admin-editor.css';
import '@/features/employee-devices/admin-employee-devices.css';

/**
 * Admin Employee Device Pairing.
 * Employee rows always come from the shared Employees repository
 * (Supabase `app_data_documents` / Employees module) — never a local copy.
 */
export function AdminEmployeeDevicesPage() {
  const { t, language } = useLanguage();
  const { user, logAction } = useAuth();
  const { canManageDevices, isReady: permissionsReady } = useDevicePermissions();
  // Single source of truth: same live store as Admin → Employees.
  const { employees } = useEmployees();

  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [devicesReady, setDevicesReady] = useState(false);
  const [employeesSectionOpen, setEmployeesSectionOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [pairingToken, setPairingToken] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = 'admin-device-qr-reader';

  // Ensure Employees document is hydrated + realtime-bound from Supabase.
  useEffect(() => {
    void employeesRepository.hydrate();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void employeesRepository.reloadFromStorage();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const next = await listLinkedDevices();
      setDevices(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.employeeDevices.loadFailed'),
      );
    } finally {
      setDevicesReady(true);
    }
  }, [t]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  useEffect(() => subscribeLinkedDevices(() => void refreshDevices()), [
    refreshDevices,
  ]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === 'active'),
    [employees],
  );

  const employeeById = useMemo(() => {
    const map = new Map<string, LaundryEmployee>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    return map;
  }, [employees]);

  const activeDeviceByEmployeeId = useMemo(() => {
    const map = new Map<string, LinkedDevice>();
    for (const device of devices) {
      if (device.status === 'active') {
        map.set(device.laundryEmployeeId, device);
      }
    }
    return map;
  }, [devices]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeEmployees;
    }
    return activeEmployees.filter((employee) =>
      matchesEmployeeSearch(employee, query),
    );
  }, [activeEmployees, search]);

  // If the open employee is deleted/inactivated, close their panel safely.
  useEffect(() => {
    if (!openEmployeeId) {
      return;
    }
    const stillListed = activeEmployees.some(
      (employee) => employee.id === openEmployeeId,
    );
    if (!stillListed) {
      setOpenEmployeeId(null);
      setScannerOpen(false);
      setPairingToken('');
      setScannerError(null);
    }
  }, [activeEmployees, openEmployeeId]);

  const activeDevices = useMemo(
    () => devices.filter((device) => device.status === 'active'),
    [devices],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) {
      return;
    }

    try {
      if ((scanner as { isScanning?: boolean }).isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Camera may already be released.
    }
  }, []);

  useEffect(() => {
    if (!scannerOpen || !openEmployeeId) {
      return;
    }

    let cancelled = false;
    const scanner = new Html5Qrcode(scannerRegionId);
    scannerRef.current = scanner;
    setScannerError(null);

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const token = parsePairingPayload(decoded);
            if (!token) {
              setScannerError(t('admin.employeeDevices.invalidQr'));
              return;
            }
            setPairingToken(token);
            setScannerOpen(false);
            setMessage(t('admin.employeeDevices.qrCaptured'));
          },
          () => {
            // Ignore frame-level scan misses.
          },
        );
      } catch (caught) {
        if (!cancelled) {
          setScannerError(
            caught instanceof Error
              ? caught.message
              : t('admin.employeeDevices.cameraFailed'),
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [scannerOpen, openEmployeeId, stopScanner, t]);

  const toggleEmployee = (employeeId: string) => {
    setOpenEmployeeId((current) => {
      const next = current === employeeId ? null : employeeId;
      if (next !== current) {
        setScannerOpen(false);
        setPairingToken('');
        setScannerError(null);
      }
      return next;
    });
  };

  const handlePair = async (
    employee: LaundryEmployee,
    replaceExisting: boolean,
  ) => {
    if (!user) {
      return;
    }

    const token = parsePairingPayload(pairingToken);
    if (!token) {
      setError(t('admin.employeeDevices.invalidQr'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      // Names always taken from live Employees record at pair time.
      const linked = await pairDeviceFromSession({
        actor: user,
        pairingToken: token,
        laundryEmployeeId: employee.id,
        laundryEmployeeNameEn: employee.name.en,
        laundryEmployeeNameAr: employee.name.ar,
        replaceExisting,
      });
      logAction({
        action: replaceExisting
          ? 'admin.replaceEmployeeDevice'
          : 'admin.pairEmployeeDevice',
        page: 'admin/employee-devices',
        newValue: linked,
      });
      setMessage(
        replaceExisting
          ? t('admin.employeeDevices.replaced')
          : t('admin.employeeDevices.paired'),
      );
      setPairingToken('');
      setScannerOpen(false);
      await refreshDevices();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.employeeDevices.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (device: LinkedDevice) => {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await removeLinkedDevice({ actor: user, deviceId: device.id });
      logAction({
        action: 'admin.removeEmployeeDevice',
        page: 'admin/employee-devices',
        oldValue: device,
      });
      setMessage(t('admin.employeeDevices.removed'));
      await refreshDevices();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.employeeDevices.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (permissionsReady && !canManageDevices) {
    return <Navigate replace to="/admin" />;
  }

  return (
    <section className="admin-employee-devices admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.employeeDevices.subtitle')}
        titleAr="إدارة أجهزة الموظفين"
        titleEn="Employee Device Management"
      />

      {error ? (
        <p className="admin-settings-message admin-settings-message--error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="admin-settings-message admin-settings-message--success">
          {message}
        </p>
      ) : null}

      <section className="admin-editor-panel">
        <article
          className={
            employeesSectionOpen
              ? 'admin-employee-devices__section-accordion is-open'
              : 'admin-employee-devices__section-accordion'
          }
        >
          <button
            aria-controls="employee-devices-employees-panel"
            aria-expanded={employeesSectionOpen}
            className="admin-employee-devices__section-trigger"
            onClick={() => setEmployeesSectionOpen((open) => !open)}
            type="button"
          >
            <span className="admin-employee-devices__section-title-row">
              <span className="admin-employee-devices__section-title">
                {t('admin.employeeDevices.employeesAccordion')}
              </span>
              <span className="admin-employee-devices__section-count">
                {activeEmployees.length}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="admin-employee-devices__chevron"
              size={18}
              strokeWidth={1.75}
            />
          </button>

          {employeesSectionOpen ? (
            <div
              className="admin-employee-devices__section-panel"
              id="employee-devices-employees-panel"
            >
              <div className="admin-editor-field">
                <label htmlFor="device-employee-search">
                  {t('admin.employeeDevices.searchEmployee')}
                </label>
                <input
                  id="device-employee-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.employeeDevices.searchPlaceholder')}
                  type="search"
                  value={search}
                />
              </div>

              <div className="admin-employee-devices__accordion" role="list">
                {filteredEmployees.length === 0 ? (
                  <p>{t('admin.employeeDevices.noEmployees')}</p>
                ) : (
                  filteredEmployees.map((employee) => {
                    const isOpen = openEmployeeId === employee.id;
                    const name =
                      language === 'ar' ? employee.name.ar : employee.name.en;
                    const department =
                      language === 'ar'
                        ? employee.department.ar
                        : employee.department.en;
                    const jobTitle =
                      language === 'ar'
                        ? employee.jobTitle.ar
                        : employee.jobTitle.en;
                    const linked =
                      activeDeviceByEmployeeId.get(employee.id) ?? null;
                    const pairingStatus = linked
                      ? t('admin.employeeDevices.statusPaired')
                      : t('admin.employeeDevices.statusUnpaired');

                    return (
                      <article
                        className={
                          isOpen
                            ? 'admin-employee-devices__item is-open'
                            : 'admin-employee-devices__item'
                        }
                        key={employee.id}
                        role="listitem"
                      >
                        <button
                          aria-controls={`employee-device-panel-${employee.id}`}
                          aria-expanded={isOpen}
                          className="admin-employee-devices__item-trigger"
                          onClick={() => toggleEmployee(employee.id)}
                          type="button"
                        >
                          <span className="admin-employee-devices__item-main">
                            <span className="admin-employee-devices__item-name">
                              {name}
                            </span>
                            <span className="admin-employee-devices__item-dept">
                              {department}
                            </span>
                          </span>
                          <span
                            className={
                              linked
                                ? 'admin-employee-devices__badge is-paired'
                                : 'admin-employee-devices__badge'
                            }
                          >
                            {pairingStatus}
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className="admin-employee-devices__chevron"
                            size={18}
                            strokeWidth={1.75}
                          />
                        </button>

                        {isOpen ? (
                          <div
                            className="admin-employee-devices__item-panel"
                            id={`employee-device-panel-${employee.id}`}
                          >
                            <div className="admin-employee-devices__detail-grid">
                              <div>
                                <h3 className="admin-employee-devices__panel-title">
                                  {t('admin.employeeDevices.employeeDetails')}
                                </h3>
                                <dl className="admin-employee-devices__details">
                                  <div>
                                    <dt>
                                      {t('admin.employeeDevices.colEmployee')}
                                    </dt>
                                    <dd>{name}</dd>
                                  </div>
                                  <div>
                                    <dt>
                                      {t('admin.employeeDevices.department')}
                                    </dt>
                                    <dd>{department}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('admin.editor.jobEn')}</dt>
                                    <dd>{jobTitle}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('admin.editor.employeeId')}</dt>
                                    <dd>{employee.employeeId}</dd>
                                  </div>
                                  {employee.phone ? (
                                    <div>
                                      <dt>{t('admin.editor.phone')}</dt>
                                      <dd>{employee.phone}</dd>
                                    </div>
                                  ) : null}
                                </dl>
                              </div>

                              <div>
                                <h3 className="admin-employee-devices__panel-title">
                                  {t('admin.employeeDevices.deviceInfo')}
                                </h3>
                                {linked ? (
                                  <dl className="admin-employee-devices__details">
                                    <div>
                                      <dt>
                                        {t('admin.employeeDevices.colDevice')}
                                      </dt>
                                      <dd>{linked.deviceLabel}</dd>
                                    </div>
                                    <div>
                                      <dt>
                                        {t('admin.employeeDevices.colStatus')}
                                      </dt>
                                      <dd>{statusLabel(linked.status, t)}</dd>
                                    </div>
                                    <div>
                                      <dt>
                                        {t('admin.employeeDevices.colPairedAt')}
                                      </dt>
                                      <dd>
                                        {formatDate(linked.pairedAt, language)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>OneSignal</dt>
                                      <dd className="admin-employee-devices__player">
                                        {linked.onesignalPlayerId}
                                      </dd>
                                    </div>
                                  </dl>
                                ) : (
                                  <p className="admin-employee-devices__empty-device">
                                    {t(
                                      'admin.employeeDevices.noDeviceForEmployee',
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="admin-employee-devices__pair-controls">
                              <div className="admin-editor-field">
                                <label
                                  htmlFor={`device-pairing-token-${employee.id}`}
                                >
                                  {t('admin.employeeDevices.pairingCode')}
                                </label>
                                <input
                                  id={`device-pairing-token-${employee.id}`}
                                  onChange={(event) =>
                                    setPairingToken(event.target.value)
                                  }
                                  placeholder={t(
                                    'admin.employeeDevices.pairingCodePlaceholder',
                                  )}
                                  value={pairingToken}
                                />
                              </div>

                              <div className="admin-editor-actions-row">
                                <button
                                  className="admin-editor-btn"
                                  onClick={() =>
                                    setScannerOpen((open) => !open)
                                  }
                                  type="button"
                                >
                                  {scannerOpen
                                    ? t('admin.employeeDevices.stopScan')
                                    : t('admin.employeeDevices.scanQr')}
                                </button>
                                <button
                                  className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
                                  disabled={isSaving || !pairingToken.trim()}
                                  onClick={() =>
                                    void handlePair(employee, false)
                                  }
                                  type="button"
                                >
                                  {t('admin.employeeDevices.pairDevice')}
                                </button>
                                <button
                                  className="admin-editor-btn"
                                  disabled={isSaving || !pairingToken.trim()}
                                  onClick={() =>
                                    void handlePair(employee, true)
                                  }
                                  type="button"
                                >
                                  {t('admin.employeeDevices.replaceDevice')}
                                </button>
                                {linked ? (
                                  <button
                                    className="admin-editor-btn admin-editor-btn--danger"
                                    disabled={isSaving}
                                    onClick={() => void handleRemove(linked)}
                                    type="button"
                                  >
                                    {t('admin.employeeDevices.unpairDevice')}
                                  </button>
                                ) : null}
                              </div>

                              {scannerOpen ? (
                                <div className="admin-employee-devices__scanner">
                                  <div id={scannerRegionId} />
                                  {scannerError ? (
                                    <p className="admin-settings-message admin-settings-message--error">
                                      {scannerError}
                                    </p>
                                  ) : (
                                    <p>{t('admin.employeeDevices.scanHint')}</p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="admin-editor-panel">
        <h2 className="admin-employee-devices__section-title">
          {t('admin.employeeDevices.linkedSection')}
        </h2>

        {!devicesReady ? (
          <p>{t('common.loading')}</p>
        ) : activeDevices.length === 0 ? (
          <p>{t('admin.employeeDevices.noDevices')}</p>
        ) : (
          <table className="admin-editor-table admin-editor-table--responsive">
            <thead>
              <tr>
                <th>{t('admin.employeeDevices.colEmployee')}</th>
                <th>{t('admin.employeeDevices.colDevice')}</th>
                <th>{t('admin.employeeDevices.colStatus')}</th>
                <th>{t('admin.employeeDevices.colPairedAt')}</th>
                <th>{t('admin.employeeDevices.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const live = employeeById.get(device.laundryEmployeeId);
                const orphaned = !live || live.status !== 'active';
                const name = resolveLinkedEmployeeLabel(
                  device,
                  live,
                  language,
                );

                return (
                  <tr key={device.id}>
                    <td data-label={t('admin.employeeDevices.colEmployee')}>
                      {name}
                      {orphaned ? (
                        <div className="admin-employee-devices__orphan-note">
                          {t('admin.employeeDevices.orphanedDevice')}
                        </div>
                      ) : null}
                    </td>
                    <td data-label={t('admin.employeeDevices.colDevice')}>
                      {device.deviceLabel}
                      <div className="admin-employee-devices__player">
                        {device.onesignalPlayerId}
                      </div>
                    </td>
                    <td data-label={t('admin.employeeDevices.colStatus')}>
                      {statusLabel(device.status, t)}
                    </td>
                    <td data-label={t('admin.employeeDevices.colPairedAt')}>
                      {formatDate(device.pairedAt, language)}
                    </td>
                    <td data-label={t('admin.employeeDevices.colActions')}>
                      {device.status === 'active' ? (
                        <button
                          className="admin-editor-btn admin-editor-btn--danger"
                          disabled={isSaving}
                          onClick={() => void handleRemove(device)}
                          type="button"
                        >
                          {t('admin.employeeDevices.unpairDevice')}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function resolveLinkedEmployeeLabel(
  device: LinkedDevice,
  live: LaundryEmployee | undefined,
  language: string,
) {
  if (live) {
    return language === 'ar' ? live.name.ar : live.name.en;
  }

  if (language === 'ar') {
    return (
      device.laundryEmployeeNameAr ||
      device.laundryEmployeeNameEn ||
      device.laundryEmployeeId
    );
  }

  return (
    device.laundryEmployeeNameEn ||
    device.laundryEmployeeNameAr ||
    device.laundryEmployeeId
  );
}

function matchesEmployeeSearch(employee: LaundryEmployee, query: string) {
  return (
    employee.name.en.toLowerCase().includes(query) ||
    employee.name.ar.includes(query) ||
    employee.employeeId.toLowerCase().includes(query) ||
    employee.id.toLowerCase().includes(query) ||
    employee.jobTitle.en.toLowerCase().includes(query) ||
    employee.jobTitle.ar.includes(query) ||
    employee.department.en.toLowerCase().includes(query) ||
    employee.department.ar.includes(query)
  );
}

function statusLabel(
  status: LinkedDevice['status'],
  t: (key: import('@/types/language').TranslationKey) => string,
) {
  if (status === 'active') {
    return t('admin.employeeDevices.statusActive');
  }
  if (status === 'replaced') {
    return t('admin.employeeDevices.statusReplaced');
  }
  return t('admin.employeeDevices.statusRemoved');
}

function formatDate(value: string, language: string) {
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
