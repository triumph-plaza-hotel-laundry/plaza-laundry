import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  claimDevice,
  parseLinkPayload,
} from '@/features/notifications/pairing';
import { writeLocalDeviceLink } from '@/features/notifications/pairing/local-device-link';
import { resetThisDevicePushSubscription } from '@/features/notifications/devices/reset-this-device-push';
import { ensureEmployeeOneSignalIdentity } from '@/lib/onesignal';
import {
  PairingPrepareError,
  formatPairingDiagnosticReport,
  prepareDeviceForPairing,
} from '@/features/employee-devices/onesignal-pairing';
import { useLanguage } from '@/hooks';
import { useThisDeviceLinkStatus } from '@/hooks/useThisDeviceLinkStatus';
import { PushClientTracePanel } from '@/features/employee-devices/PushClientTracePanel';
import { installPushTraceClient } from '@/lib/onesignal';
import '@/features/employee-devices/employee-device-pairing.css';

type UiState =
  | 'preparing'
  | 'ready'
  | 'claiming'
  | 'success'
  | 'already-linked'
  | 'resetting'
  | 'error';
/**
 * Employee phone pairing gate.
 * Primary path: Admin QR encodes an HTTPS URL; phone camera opens this page
 * with ?token=… then this device claims automatically (no in-app scanner).
 */
export function EmployeeDevicePairingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLinked, isReady: linkReady, refresh } = useThisDeviceLinkStatus();
  const [uiState, setUiState] = useState<UiState>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState('Starting…');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [resetSummary, setResetSummary] = useState<string | null>(null);
  const claimingRef = useRef(false);
  const successHandled = useRef(false);
  const autoClaimStarted = useRef(false);

  const urlToken =
    searchParams.get('token')?.trim() || searchParams.get('t')?.trim() || '';

  useEffect(() => {
    if (!linkReady) return;
    if (isLinked && !successHandled.current) {
      setUiState('already-linked');
    }
  }, [isLinked, linkReady]);

  useEffect(() => {
    if (!isLinked) return;
    void installPushTraceClient();
  }, [isLinked]);

  useEffect(() => {
    if (!linkReady || isLinked) return;

    let cancelled = false;

    const start = async () => {
      setUiState('preparing');
      setError(null);
      setStatusStep('Preparing notifications…');
      try {
        const prepared = await prepareDeviceForPairing();
        if (cancelled) return;
        setPlayerId(prepared.onesignalPlayerId);
        setDiagnostic(formatPairingDiagnosticReport(prepared.report));
        setUiState('ready');
        setStatusStep(
          urlToken
            ? 'Link ticket found — finishing…'
            : 'Open the Admin QR with this phone’s camera, or paste a token below.',
        );
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
  }, [isLinked, linkReady, urlToken]);

  const runClaim = async (rawToken: string, onesignalPlayerId: string) => {
    if (claimingRef.current || successHandled.current) return;
    const payload = parseLinkPayload(rawToken);
    if (!payload) {
      setError('Invalid pairing link or token');
      setUiState('error');
      return;
    }

    claimingRef.current = true;
    setUiState('claiming');
    setStatusStep('Linking device…');
    setError(null);

    try {
      const result = await claimDevice({
        token: payload.token,
        playerId: onesignalPlayerId,
        deviceId: 'web',
        deviceName:
          typeof navigator !== 'undefined'
            ? navigator.userAgent.slice(0, 80)
            : 'web',
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        operatingSystem:
          typeof navigator !== 'undefined' ? navigator.platform : undefined,
      });
      successHandled.current = true;
      writeLocalDeviceLink({
        linked: true,
        onesignalPlayerId: result.playerId,
        laundryEmployeeId: result.employeeId,
        pairedAt: new Date().toISOString(),
      });
      // Bind OneSignal User to employee:<id> — never admin:primary-admin-kamel.
      void ensureEmployeeOneSignalIdentity(result.employeeId).catch((error) => {
        console.warn('[device-link] employee OneSignal identity bind failed', error);
      });
      console.info('[device-link] claim wrote local link', {
        employeeId: result.employeeId,
        playerId: result.playerId,
      });
      setUiState('success');
      window.setTimeout(() => navigate('/', { replace: true }), 1600);
    } catch (caught) {
      claimingRef.current = false;
      autoClaimStarted.current = false;
      setError(caught instanceof Error ? caught.message : 'Claim failed');
      setUiState('error');
    }
  };

  useEffect(() => {
    if (uiState !== 'ready' || !playerId || !urlToken) return;
    if (autoClaimStarted.current || claimingRef.current || successHandled.current) {
      return;
    }
    autoClaimStarted.current = true;
    void runClaim(urlToken, playerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState, playerId, urlToken]);

  const submitManual = async () => {
    if (!playerId) return;
    await runClaim(manualToken.trim(), playerId);
  };

  const onResetThisDevice = async () => {
    if (
      !window.confirm(
        'Reset push notifications on THIS phone only?\n\nOther employees’ devices will not be changed. You will stay linked to the same employee with a new subscription.',
      )
    ) {
      return;
    }

    setUiState('resetting');
    setError(null);
    setResetSummary(null);
    setStatusStep('Resetting this phone’s push subscription…');

    try {
      const result = await resetThisDevicePushSubscription();
      setResetSummary(
        `Reset OK. Employee ${result.employeeId}\nOld: ${result.oldPlayerId}\nNew: ${result.newPlayerId}`,
      );
      setStatusStep('Push subscription reset. Send a test notification next.');
      await refresh();
      setUiState('already-linked');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Push reset failed');
      setUiState('already-linked');
    }
  };

  if (!linkReady) {
    return (
      <div className="employee-device-pairing">
        <p>Checking link status…</p>
      </div>
    );
  }

  if (uiState === 'already-linked' || uiState === 'resetting') {
    return (
      <div className="employee-device-pairing">
        <h1>{t('pairing.alreadyLinked' as never) || 'Device already linked'}</h1>
        <p>
          This phone is linked. If notifications never appear on this phone
          only, reset the push subscription here — other devices are untouched.
        </p>
        {resetSummary ? (
          <pre className="employee-device-pairing__diag">{resetSummary}</pre>
        ) : null}
        {error ? <p className="employee-device-pairing__error">{error}</p> : null}
        {uiState === 'resetting' ? (
          <p className="employee-device-pairing__step">{statusStep}</p>
        ) : null}
        <PushClientTracePanel />
        <button
          type="button"
          disabled={uiState === 'resetting'}
          onClick={() => void onResetThisDevice()}
        >
          {uiState === 'resetting'
            ? 'Resetting…'
            : 'Reset push on this phone only'}
        </button>
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
        Ask Admin to open Notifications → Generate QR for your name. Scan that
        QR with this phone’s built-in camera — it opens this page and links
        automatically.
      </p>
      <p className="employee-device-pairing__step">{statusStep}</p>

      {uiState === 'success' ? (
        <p className="employee-device-pairing__success">
          Linked successfully. Opening app…
        </p>
      ) : null}

      {error ? <p className="employee-device-pairing__error">{error}</p> : null}
      {diagnostic ? (
        <pre className="employee-device-pairing__diag">{diagnostic}</pre>
      ) : null}

      {(uiState === 'ready' || uiState === 'error') && playerId && !urlToken ? (
        <div className="employee-device-pairing__manual">
          <label>
            Or paste pairing link / token
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="https://…/employee-device-pairing?token=… or token"
            />
          </label>
          <button type="button" onClick={() => void submitManual()}>
            Claim
          </button>
        </div>
      ) : null}

      {uiState === 'error' && urlToken && playerId ? (
        <button
          type="button"
          className="employee-device-pairing__retry"
          onClick={() => {
            claimingRef.current = false;
            autoClaimStarted.current = false;
            void runClaim(urlToken, playerId);
          }}
        >
          Retry link
        </button>
      ) : null}
    </div>
  );
}
