import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Navigate } from 'react-router-dom';
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
import type { LaundryEmployee } from '@/data/laundry-employees';
import '@/features/admin/admin-editor.css';
import '@/features/employee-devices/admin-employee-devices.css';

export function AdminEmployeeDevicesPage() {
  const { t, language } = useLanguage();
  const { user, logAction } = useAuth();
  const { canManageDevices, isReady: permissionsReady } = useDevicePermissions();
  const { employees } = useEmployees();

  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [devicesReady, setDevicesReady] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [pairingToken, setPairingToken] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = 'admin-device-qr-reader';

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

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = employees.filter((employee) => employee.status === 'active');
    if (!query) {
      return active.slice(0, 12);
    }

    return active
      .filter((employee) => matchesEmployeeSearch(employee, query))
      .slice(0, 20);
  }, [employees, search]);

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
    if (!scannerOpen) {
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
  }, [scannerOpen, stopScanner, t]);

  const handlePair = async (replaceExisting: boolean) => {
    if (!user || !selectedEmployee) {
      setError(t('admin.employeeDevices.selectEmployeeFirst'));
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
      const linked = await pairDeviceFromSession({
        actor: user,
        pairingToken: token,
        laundryEmployeeId: selectedEmployee.id,
        laundryEmployeeNameEn: selectedEmployee.name.en,
        laundryEmployeeNameAr: selectedEmployee.name.ar,
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

      <section className="admin-editor-panel admin-editor-grid">
        <h2 className="admin-employee-devices__section-title">
          {t('admin.employeeDevices.pairSection')}
        </h2>

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

        <div className="admin-employee-devices__employee-list">
          {filteredEmployees.length === 0 ? (
            <p>{t('admin.employeeDevices.noEmployees')}</p>
          ) : (
            filteredEmployees.map((employee) => {
              const selected = employee.id === selectedEmployeeId;
              const label =
                language === 'ar' ? employee.name.ar : employee.name.en;
              return (
                <button
                  className={
                    selected
                      ? 'admin-employee-devices__employee is-selected'
                      : 'admin-employee-devices__employee'
                  }
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  type="button"
                >
                  <span>{label}</span>
                  <small>{employee.employeeId}</small>
                </button>
              );
            })
          )}
        </div>

        <div className="admin-editor-field">
          <label htmlFor="device-pairing-token">
            {t('admin.employeeDevices.pairingCode')}
          </label>
          <input
            id="device-pairing-token"
            onChange={(event) => setPairingToken(event.target.value)}
            placeholder={t('admin.employeeDevices.pairingCodePlaceholder')}
            value={pairingToken}
          />
        </div>

        <div className="admin-editor-actions-row">
          <button
            className="admin-editor-btn"
            onClick={() => setScannerOpen((open) => !open)}
            type="button"
          >
            {scannerOpen
              ? t('admin.employeeDevices.stopScan')
              : t('admin.employeeDevices.scanQr')}
          </button>
          <button
            className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
            disabled={isSaving || !selectedEmployee || !pairingToken.trim()}
            onClick={() => void handlePair(false)}
            type="button"
          >
            {t('admin.employeeDevices.pairDevice')}
          </button>
          <button
            className="admin-editor-btn"
            disabled={isSaving || !selectedEmployee || !pairingToken.trim()}
            onClick={() => void handlePair(true)}
            type="button"
          >
            {t('admin.employeeDevices.replaceDevice')}
          </button>
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
                const name =
                  language === 'ar'
                    ? device.laundryEmployeeNameAr ||
                      device.laundryEmployeeNameEn ||
                      device.laundryEmployeeId
                    : device.laundryEmployeeNameEn ||
                      device.laundryEmployeeNameAr ||
                      device.laundryEmployeeId;

                return (
                  <tr key={device.id}>
                    <td data-label={t('admin.employeeDevices.colEmployee')}>
                      {name}
                    </td>
                    <td data-label={t('admin.employeeDevices.colDevice')}>
                      {device.deviceLabel}
                      <div className="admin-employee-devices__player">
                        {device.onesignalPlayerId.slice(0, 12)}…
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
                          {t('admin.employeeDevices.removeDevice')}
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

function matchesEmployeeSearch(employee: LaundryEmployee, query: string) {
  return (
    employee.name.en.toLowerCase().includes(query) ||
    employee.name.ar.includes(query) ||
    employee.employeeId.toLowerCase().includes(query) ||
    employee.id.toLowerCase().includes(query) ||
    employee.jobTitle.en.toLowerCase().includes(query) ||
    employee.jobTitle.ar.includes(query)
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
