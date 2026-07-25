import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  claimDevice,
  parseLinkPayload,
} from '@/features/notifications/pairing';
import {
  writeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';
import {
  PairingPrepareError,
  formatPairingDiagnosticReport,
  prepareDeviceForPairing,
} from '@/features/employee-devices/onesignal-pairing';
import { useLanguage } from '@/hooks';
import { useThisDeviceLinkStatus } from '@/hooks/useThisDeviceLinkStatus';
import '@/features/employee-devices/employee-device-pairing.css';

type UiState = 'preparing' | 'scanning' | 'claiming' | 'success' | 'already-linked' | 'error';

/**
 * Employee phone pairing gate.
 * Visible only when this device is not linked. Admin shows QR; phone scans.
 */
export function EmployeeDevicePairingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isLinked, isReady: linkReady } = useThisDeviceLinkStatus();
  const [uiState, setUiState] = useState<UiState>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState('Starting…');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const claimingRef = useRef(false);
  const successHandled = useRef(false);
  const scannerRegionId = 'employee-link-qr-reader';

  useEffect(() => {
    if (!linkReady) return;
    if (isLinked && !successHandled.current) {
      setUiState('already-linked');
    }
  }, [isLinked, linkReady]);

  useEffect(() => {
    if (!linkReady || isLinked) return;

    let cancelled = false;

    const start = async () => {
      setUiState('preparing');
      setError(null);
      setStatusStep('Preparing OneSignal…');
      try {
        const prepared = await prepareDeviceForPairing();
        if (cancelled) return;
        setPlayerId(prepared.onesignalPlayerId);
        setDiagnostic(formatPairingDiagnosticReport(prepared.report));
        setUiState('scanning');
        setStatusStep('Scan the Admin QR code');
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof PairingPrepareError) {
          setDiagnostic(formatPairingDiagnosticReport(caught.report));
          setError(caught.message);
        } else {
          setError(caught instanceof Error ? caught.message : 'Prepare failed');
        }
        setUiState('error');
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [isLinked, linkReady]);

  useEffect(() => {
    if (uiState !== 'scanning' || !playerId) return;

    let disposed = false;
    const scanner = new Html5Qrcode(scannerRegionId);
    scannerRef.current = scanner;

    const onScan = async (decoded: string) => {
      if (claimingRef.current || successHandled.current) return;
      const payload = parseLinkPayload(decoded);
      if (!payload) {
        setError('Unrecognized QR — ask Admin for a Notifications link QR');
        return;
      }
      claimingRef.current = true;
      setUiState('claiming');
      setStatusStep('Linking device…');
      try {
        await scanner.stop().catch(() => undefined);
      } catch {
        /* ignore */
      }

      try {
        const result = await claimDevice({
          token: payload.token,
          playerId,
          deviceId: 'web',
          deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'web',
          browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          operatingSystem: typeof navigator !== 'undefined' ? navigator.platform : undefined,
        });
        successHandled.current = true;
        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: result.playerId,
          laundryEmployeeId: result.employeeId,
          pairedAt: new Date().toISOString(),
        });
        setUiState('success');
        window.setTimeout(() => navigate('/', { replace: true }), 1600);
      } catch (caught) {
        claimingRef.current = false;
        setError(caught instanceof Error ? caught.message : 'Claim failed');
        setUiState('error');
      }
    };

    void scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (!disposed) void onScan(text);
        },
        () => undefined,
      )
      .catch((err: unknown) => {
        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : 'Camera unavailable — paste the ticket token below',
          );
        }
      });

    return () => {
      disposed = true;
      void scanner.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [uiState, playerId, navigate]);

  const submitManual = async () => {
    if (!playerId || claimingRef.current) return;
    const payload = parseLinkPayload(manualToken.trim());
    if (!payload) {
      setError('Invalid token');
      return;
    }
    claimingRef.current = true;
    setUiState('claiming');
    try {
      const result = await claimDevice({
        token: payload.token,
        playerId,
        deviceId: 'web',
        deviceName: 'manual-entry',
      });
      successHandled.current = true;
      writeLocalDeviceLink({
        linked: true,
        onesignalPlayerId: result.playerId,
        laundryEmployeeId: result.employeeId,
        pairedAt: new Date().toISOString(),
      });
      setUiState('success');
      window.setTimeout(() => navigate('/', { replace: true }), 1600);
    } catch (caught) {
      claimingRef.current = false;
      setError(caught instanceof Error ? caught.message : 'Claim failed');
      setUiState('error');
    }
  };

  if (!linkReady) {
    return (
      <div className="employee-device-pairing">
        <p>Checking link status…</p>
      </div>
    );
  }

  if (uiState === 'already-linked') {
    return (
      <div className="employee-device-pairing">
        <h1>{t('pairing.alreadyLinked' as never) || 'Device already linked'}</h1>
        <p>This phone is linked. The pairing page is hidden until Admin unlinks.</p>
        <button type="button" onClick={() => navigate('/', { replace: true })}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="employee-device-pairing">
      <h1>Link this device</h1>
      <p className="employee-device-pairing__lead">
        Ask Admin to open Notifications → Generate QR for your name, then scan it here.
      </p>
      <p className="employee-device-pairing__step">{statusStep}</p>

      {uiState === 'scanning' || uiState === 'claiming' ? (
        <div id={scannerRegionId} className="employee-device-pairing__scanner" />
      ) : null}

      {uiState === 'success' ? (
        <p className="employee-device-pairing__success">Linked successfully. Opening app…</p>
      ) : null}

      {error ? <p className="employee-device-pairing__error">{error}</p> : null}
      {diagnostic ? (
        <pre className="employee-device-pairing__diag">{diagnostic}</pre>
      ) : null}

      {(uiState === 'scanning' || uiState === 'error') && playerId ? (
        <div className="employee-device-pairing__manual">
          <label>
            Or paste ticket token
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="token or QR JSON"
            />
          </label>
          <button type="button" onClick={() => void submitManual()}>
            Claim
          </button>
        </div>
      ) : null}
    </div>
  );
}
