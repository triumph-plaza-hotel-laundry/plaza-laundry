import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  cancelPendingPairingSessionsForPlayer,
  encodePairingPayload,
  ensureFreshPairingSession,
  getActiveLinkedDeviceByPlayerId,
  getPairingSessionByToken,
  subscribePairingSession,
} from '@/features/employee-devices/device-pairing-service';
import { writeLocalDeviceLink } from '@/features/employee-devices/local-device-link';
import {
  formatPairingDiagnosticReport,
  PairingPrepareError,
  prepareDeviceForPairing,
  type PairingDiagnosticReport,
} from '@/features/employee-devices/onesignal-pairing';
import { useLanguage } from '@/hooks';
import { useThisDeviceLinkStatus } from '@/hooks/useThisDeviceLinkStatus';
import '@/features/employee-devices/employee-device-pairing.css';

type PairingUiState =
  | 'preparing'
  | 'ready'
  | 'success'
  | 'already-linked'
  | 'error';

export function EmployeeDevicePairingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isLinked, isReady: linkReady } = useThisDeviceLinkStatus();
  const [uiState, setUiState] = useState<PairingUiState>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState('Starting…');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const successHandled = useRef(false);

  useEffect(() => {
    if (!linkReady) {
      return;
    }

    if (isLinked) {
      // After a just-completed pairing, keep the success screen until redirect.
      if (!successHandled.current) {
        setUiState('already-linked');
        setQrDataUrl(null);
      }
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let pollTimer: number | undefined;

    const applyReport = (report: PairingDiagnosticReport | null | undefined) => {
      if (!report) {
        setDiagnostic(null);
        return;
      }
      setDiagnostic(formatPairingDiagnosticReport(report));
    };

    const handleSuccess = (session: {
      id?: string;
      status: string;
      onesignalPlayerId: string;
      laundryEmployeeId: string | null;
      completedAt: string | null;
    }) => {
      if (session.status !== 'completed' || successHandled.current) {
        return;
      }

      successHandled.current = true;
      writeLocalDeviceLink({
        linked: true,
        onesignalPlayerId: session.onesignalPlayerId,
        laundryEmployeeId: session.laundryEmployeeId,
        pairedAt: session.completedAt ?? new Date().toISOString(),
      });
      setQrDataUrl(null);
      setUiState('success');

      void cancelPendingPairingSessionsForPlayer(
        session.onesignalPlayerId,
        session.id,
      );

      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    };

    const start = async () => {
      setUiState('preparing');
      setError(null);
      setDiagnostic(null);
      setQrDataUrl(null);
      setStatusStep('Preparing OneSignal (shared production instance)…');
      successHandled.current = false;

      try {
        setStatusStep('Waiting for shared OneSignal + subscription id…');
        const prepared = await prepareDeviceForPairing();
        if (cancelled) {
          return;
        }

        applyReport(prepared.report);

        setStatusStep('Creating pairing session…');
        // Reuse a valid unused session or mint a fresh one — never leave employee blocked.
        const session = await ensureFreshPairingSession({
          onesignalPlayerId: prepared.onesignalPlayerId,
          deviceLabel: prepared.deviceLabel,
        });

        if (cancelled) {
          return;
        }

        setStatusStep('Generating QR…');
        const payload = encodePairingPayload(session.pairingToken);
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
          color: {
            dark: '#1a1510',
            light: '#f7f1e6',
          },
        });

        if (cancelled) {
          return;
        }

        setQrDataUrl(dataUrl);
        setUiState('ready');

        unsubscribe = subscribePairingSession(
          session.pairingToken,
          handleSuccess,
        );

        pollTimer = window.setInterval(() => {
          void getPairingSessionByToken(session.pairingToken).then((next) => {
            if (next) {
              handleSuccess(next);
            }
          });

          // Session realtime can lag; also succeed when the linked-device row appears.
          void getActiveLinkedDeviceByPlayerId(prepared.onesignalPlayerId).then(
            (device) => {
              if (!device || successHandled.current) {
                return;
              }
              console.info('[device-pairing] ▶ linked device detected via poll', {
                deviceId: device.id,
                employeeId: device.laundryEmployeeId,
              });
              handleSuccess({
                id: session.id,
                status: 'completed',
                onesignalPlayerId: device.onesignalPlayerId,
                laundryEmployeeId: device.laundryEmployeeId,
                completedAt: device.pairedAt,
              });
            },
          );
        }, 2500);
      } catch (caught) {
        if (cancelled) {
          return;
        }

        if (caught instanceof PairingPrepareError) {
          applyReport(caught.report);
          setError(caught.message);
        } else {
          setDiagnostic(null);
          setError(
            caught instanceof Error
              ? caught.message
              : t('devicePairing.prepareFailed'),
          );
        }
        setUiState('error');
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, [isLinked, linkReady, navigate, t]);

  return (
    <section className="employee-device-pairing" aria-live="polite">
      <header className="employee-device-pairing__header">
        <p className="employee-device-pairing__eyebrow">
          {t('devicePairing.eyebrow')}
        </p>
        <h1 className="employee-device-pairing__title">
          {t('nav.devicePairing')}
        </h1>
      </header>

      {uiState === 'preparing' ? (
        <div className="employee-device-pairing__status-block">
          <p className="employee-device-pairing__status">
            {t('devicePairing.preparing')}
          </p>
          <p className="employee-device-pairing__step">{statusStep}</p>
        </div>
      ) : null}

      {uiState === 'ready' && qrDataUrl ? (
        <div className="employee-device-pairing__card">
          <img
            alt={t('devicePairing.qrAlt')}
            className="employee-device-pairing__qr"
            src={qrDataUrl}
          />
          <p className="employee-device-pairing__instruction">
            {t('devicePairing.showQr')}
          </p>
        </div>
      ) : null}

      {uiState === 'success' ? (
        <div className="employee-device-pairing__success" role="status">
          <p>{t('devicePairing.success')}</p>
        </div>
      ) : null}

      {uiState === 'already-linked' ? (
        <div className="employee-device-pairing__success" role="status">
          <p>{t('devicePairing.alreadyLinked')}</p>
          <button
            className="employee-device-pairing__retry"
            onClick={() => navigate('/', { replace: true })}
            type="button"
          >
            {t('common.back')}
          </button>
        </div>
      ) : null}

      {uiState === 'error' ? (
        <div className="employee-device-pairing__error" role="alert">
          <p>{error ?? t('devicePairing.prepareFailed')}</p>
          {diagnostic ? (
            <pre className="employee-device-pairing__diagnostic">{diagnostic}</pre>
          ) : null}
          <button
            className="employee-device-pairing__retry"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t('devicePairing.retry')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
