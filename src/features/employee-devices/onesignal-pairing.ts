import OneSignal from 'react-onesignal';
import {
  bootstrapOneSignalWebPush,
  ensureOneSignalInitialized,
} from '@/lib/onesignal';
import { onesignalConfig } from '@/lib/onesignal/config';

const LOG_PREFIX = '[device-pairing]';
const PREPARE_DEADLINE_MS = 10_000;

export type PairingDiagnosticReport = {
  onesignalInitialized: 'Yes' | 'No';
  notificationPermission: NotificationPermission | 'unavailable';
  subscriptionExists: 'Yes' | 'No';
  playerId: string | null;
  currentStep: string;
  pendingPromise: string | null;
  configured: boolean;
  pushSupported: boolean | null;
  optedIn: boolean | null;
  elapsedMs: number;
};

export class PairingPrepareError extends Error {
  readonly report: PairingDiagnosticReport;

  constructor(message: string, report: PairingDiagnosticReport) {
    super(message);
    this.name = 'PairingPrepareError';
    this.report = report;
  }
}

type PushSubscriptionChangeEvent = {
  current?: { id?: string | null };
};

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'web';
  }

  const ua = navigator.userAgent;
  const isIpad =
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTablet = isIpad || /Tablet|Android(?!.*Mobile)/i.test(ua);
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile/i.test(ua);

  if (isTablet) {
    return 'tablet-web';
  }

  if (isMobile) {
    return 'mobile-web';
  }

  return 'desktop-web';
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function logStep(step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info(`${LOG_PREFIX} ▶ ${step}`, detail);
    return;
  }
  console.info(`${LOG_PREFIX} ▶ ${step}`);
}

function readExistingPlayerId(): string | null {
  try {
    const id = OneSignal.User.PushSubscription.id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

function readNativePermission(): NotificationPermission | 'unavailable' {
  if (typeof Notification !== 'undefined') {
    return Notification.permission;
  }
  try {
    return OneSignal.Notifications.permissionNative;
  } catch {
    return 'unavailable';
  }
}

function isSharedSdkReachable(): boolean {
  try {
    void OneSignal.Notifications.isPushSupported();
    return true;
  } catch {
    return false;
  }
}

function readPushSupported(): boolean | null {
  try {
    return OneSignal.Notifications.isPushSupported();
  } catch {
    return null;
  }
}

function readOptedIn(): boolean | null {
  try {
    return Boolean(OneSignal.User.PushSubscription.optedIn);
  } catch {
    return null;
  }
}

function buildReport(
  currentStep: string,
  pendingPromise: string | null,
  startedAt: number,
): PairingDiagnosticReport {
  const playerId = readExistingPlayerId();
  return {
    onesignalInitialized: isSharedSdkReachable() ? 'Yes' : 'No',
    notificationPermission: readNativePermission(),
    subscriptionExists: playerId ? 'Yes' : 'No',
    playerId,
    currentStep,
    pendingPromise,
    configured: onesignalConfig.isConfigured,
    pushSupported: readPushSupported(),
    optedIn: readOptedIn(),
    elapsedMs: Date.now() - startedAt,
  };
}

export function formatPairingDiagnosticReport(
  report: PairingDiagnosticReport,
): string {
  return [
    '========== PAIRING DIAGNOSTIC REPORT ==========',
    `1. OneSignal initialized: ${report.onesignalInitialized}`,
    `2. Notification permission: ${report.notificationPermission}`,
    `3. Subscription exists: ${report.subscriptionExists}`,
    `4. Player ID / Subscription ID: ${report.playerId ?? '(none)'}`,
    `5. Current step where execution stopped: ${report.currentStep}`,
    report.pendingPromise
      ? `   Pending promise: ${report.pendingPromise}`
      : null,
    '===============================================',
  ]
    .filter(Boolean)
    .join('\n');
}

function remainingMs(deadlineAt: number) {
  return Math.max(0, deadlineAt - Date.now());
}

async function raceAgainstDeadline<T>(
  pendingPromiseName: string,
  step: string,
  promise: Promise<T>,
  deadlineAt: number,
  startedAt: number,
): Promise<T> {
  const left = remainingMs(deadlineAt);
  if (left <= 0) {
    throw new PairingPrepareError(
      `Timed out at step "${step}" while awaiting ${pendingPromiseName}.`,
      buildReport(step, pendingPromiseName, startedAt),
    );
  }

  let timerId = 0;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = window.setTimeout(() => {
      reject(
        new PairingPrepareError(
          `Timed out at step "${step}". Pending: ${pendingPromiseName}.`,
          buildReport(step, pendingPromiseName, startedAt),
        ),
      );
    }, left);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    window.clearTimeout(timerId);
  }
}

/**
 * Same lifecycle signal production uses after init (`PushSubscription` change)
 * plus a short poll. Does NOT call optIn() — anonymous bootstrap never does.
 */
function waitForProductionSubscriptionId(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const existing = readExistingPlayerId();
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    let pollId = 0;
    let timerId = 0;

    const finish = (id: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timerId);
      try {
        OneSignal.User.PushSubscription.removeEventListener('change', onChange);
      } catch {
        // Listener may not have been attached.
      }
      resolve(id);
    };

    const onChange = (event: PushSubscriptionChangeEvent) => {
      const nextId = event.current?.id;
      if (typeof nextId === 'string' && nextId.trim()) {
        logStep('subscription change event', { playerId: nextId.trim() });
        finish(nextId.trim());
      }
    };

    try {
      OneSignal.User.PushSubscription.addEventListener('change', onChange);
      logStep('listening for PushSubscription change (production lifecycle)');
    } catch (error) {
      logStep('could not attach subscription change listener', error);
    }

    pollId = window.setInterval(() => {
      const id = readExistingPlayerId();
      if (id) {
        finish(id);
      }
    }, 300);

    timerId = window.setTimeout(() => {
      finish(readExistingPlayerId());
    }, timeoutMs);
  });
}

/**
 * Employee pairing is anonymous — mirror production `bootstrapOneSignalWebPush`
 * (main.tsx), NOT `registerOneSignalForEmployee` (login path with optIn).
 *
 * Production anonymous flow:
 *   ensureOneSignalInitialized → bootstrapOneSignalWebPush
 *   → autoResubscribe / permission creates PushSubscription.id
 *   → listen for subscription id (no optIn, no login)
 */
export async function prepareDeviceForPairing(): Promise<{
  onesignalPlayerId: string;
  deviceLabel: string;
  report: PairingDiagnosticReport;
}> {
  const startedAt = Date.now();
  const deadlineAt = startedAt + PREPARE_DEADLINE_MS;
  let currentStep = 'start';
  let pendingPromise: string | null = null;

  try {
    logStep('prepare start (production bootstrap lifecycle)', {
      permission: readNativePermission(),
      existingPlayerId: readExistingPlayerId(),
    });

    currentStep = '1.existing-subscription';
    const immediate = readExistingPlayerId();
    if (immediate) {
      const report = buildReport('complete (existing subscription)', null, startedAt);
      return {
        onesignalPlayerId: immediate,
        deviceLabel: detectDeviceLabel(),
        report,
      };
    }

    if (!onesignalConfig.isConfigured) {
      throw new PairingPrepareError(
        'OneSignal App ID is missing (VITE_ONESIGNAL_APP_ID).',
        buildReport('1.config-check', null, startedAt),
      );
    }

    // Production step A — shared init (main.tsx / AuthProvider).
    currentStep = '2.ensureOneSignalInitialized';
    pendingPromise = 'ensureOneSignalInitialized()';
    const initOk = await raceAgainstDeadline(
      pendingPromise,
      currentStep,
      ensureOneSignalInitialized(),
      deadlineAt,
      startedAt,
    );
    logStep('ensureOneSignalInitialized', {
      initOk,
      sdkReachable: isSharedSdkReachable(),
    });

    if (!initOk && !isSharedSdkReachable()) {
      throw new PairingPrepareError(
        'Shared OneSignal init did not complete.',
        buildReport(currentStep, pendingPromise, startedAt),
      );
    }

    // Production step B — anonymous bootstrap only (permission if still default).
    // When permission is already granted this returns immediately; it never calls optIn.
    currentStep = '3.bootstrapOneSignalWebPush';
    pendingPromise = 'bootstrapOneSignalWebPush()';
    await raceAgainstDeadline(
      pendingPromise,
      currentStep,
      bootstrapOneSignalWebPush(),
      deadlineAt,
      startedAt,
    );

    const permission = readNativePermission();
    logStep('after bootstrapOneSignalWebPush', {
      permission,
      playerId: readExistingPlayerId(),
    });

    if (permission === 'denied') {
      throw new PairingPrepareError(
        'Notification permission is denied.',
        buildReport(currentStep, null, startedAt),
      );
    }

    if (permission === 'default') {
      throw new PairingPrepareError(
        'Notification permission is still default. Allow notifications, then retry.',
        buildReport(currentStep, pendingPromise, startedAt),
      );
    }

    // Production step C — wait for subscription id from shared SDK.
    // Existing installed PWAs often already have permission; autoResubscribe
    // usually restores the id. If still missing, nudge optIn without awaiting
    // it (await can hang) and keep listening for the change event.
    currentStep = '4.wait-for-subscription-id';
    pendingPromise = 'PushSubscription change / id';
    let waitMs = remainingMs(deadlineAt);
    logStep('waiting for production subscription id', { waitMs });

    let playerId = await waitForProductionSubscriptionId(waitMs);

    if (!playerId && permission === 'granted' && isSharedSdkReachable()) {
      currentStep = '4b.recover-missing-subscription';
      pendingPromise = 'PushSubscription.optIn() [non-blocking] + wait';
      logStep(
        'no subscription id yet — soft-recovering on installed PWA (non-blocking optIn)',
      );
      try {
        if (OneSignal.User.PushSubscription.optedIn !== true) {
          void OneSignal.User.PushSubscription.optIn().catch((error) => {
            logStep('non-blocking optIn rejected', error);
          });
        }
      } catch (error) {
        logStep('optIn not available yet', error);
      }

      waitMs = remainingMs(deadlineAt);
      playerId = await waitForProductionSubscriptionId(waitMs);
    }

    if (!playerId) {
      throw new PairingPrepareError(
        'Permission is granted but OneSignal has not issued a subscription id yet. Allow notifications if prompted, keep the installed app open, then retry — no reinstall required.',
        buildReport(currentStep, pendingPromise, startedAt),
      );
    }

    currentStep = 'complete';
    pendingPromise = null;
    const report = buildReport(currentStep, null, startedAt);
    logStep('prepare complete', { playerId, elapsedMs: report.elapsedMs });

    return {
      onesignalPlayerId: playerId,
      deviceLabel: detectDeviceLabel(),
      report,
    };
  } catch (error) {
    if (error instanceof PairingPrepareError) {
      throw error;
    }

    throw new PairingPrepareError(
      error instanceof Error ? error.message : 'Device pairing prepare failed.',
      buildReport(currentStep, pendingPromise ?? 'unknown', startedAt),
    );
  }
}

/** Fast read for sidebar link status — does not wait on prompts or optIn. */
export async function getCurrentOneSignalPlayerId(): Promise<string | null> {
  const immediate = readExistingPlayerId();
  if (immediate) {
    return immediate;
  }

  if (!onesignalConfig.isConfigured) {
    return null;
  }

  try {
    await Promise.race([ensureOneSignalInitialized(), sleep(1500)]);
  } catch {
    // ignore
  }

  return readExistingPlayerId();
}
