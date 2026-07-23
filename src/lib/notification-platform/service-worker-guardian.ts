import { ONESIGNAL_SERVICE_WORKER } from '@/lib/onesignal/service-worker-config';
import { platformLog } from '@/lib/notification-platform/logger';
import type { HealthStatus } from '@/lib/notification-platform/types';

export type ServiceWorkerGuardianResult = {
  status: HealthStatus;
  message: string;
  onesignalRegistrationFound: boolean;
  repaired: boolean;
};

/**
 * Ensure the OneSignal worker under /onesignal/ is registered.
 * Never touches the PWA worker at / (scope root).
 */
export async function ensureOneSignalServiceWorker(): Promise<ServiceWorkerGuardianResult> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      status: 'warning',
      message: 'Service workers unavailable in this environment',
      onesignalRegistrationFound: false,
      repaired: false,
    };
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const expectedScope = new URL(
      ONESIGNAL_SERVICE_WORKER.scope,
      window.location.origin,
    ).href;

    const onesignalRegs = registrations.filter((registration) => {
      const script =
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL ||
        '';
      return (
        registration.scope === expectedScope ||
        script.includes('/onesignal/') ||
        script.includes('OneSignalSDKWorker')
      );
    });

    // Unregister ghost onesignal workers with wrong script path (never root PWA).
    let repaired = false;
    for (const registration of onesignalRegs) {
      const script =
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL ||
        '';
      const scopeOk = registration.scope === expectedScope;
      const scriptOk =
        script.includes(ONESIGNAL_SERVICE_WORKER.url) ||
        script.includes('OneSignalSDK.sw.js') ||
        script.includes('OneSignalSDKWorker');

      if (!scopeOk || !scriptOk) {
        // Only unregister if clearly under /onesignal/ scope — never root.
        if (registration.scope.includes('/onesignal')) {
          await registration.unregister();
          repaired = true;
          platformLog('service_worker', 'warning', 'Unregistered ghost OneSignal worker', {
            recoveryAction: 'unregister_ghost',
            payload: { scope: registration.scope, script },
          });
        }
      }
    }

    const after = await navigator.serviceWorker.getRegistrations();
    const found = after.some((registration) => {
      const script =
        registration.active?.scriptURL ||
        registration.installing?.scriptURL ||
        registration.waiting?.scriptURL ||
        '';
      return (
        registration.scope === expectedScope ||
        script.includes('/onesignal/OneSignalSDKWorker')
      );
    });

    if (!found) {
      await navigator.serviceWorker.register(ONESIGNAL_SERVICE_WORKER.url, {
        scope: ONESIGNAL_SERVICE_WORKER.scope,
      });
      repaired = true;
      platformLog('service_worker', 'info', 'Re-registered OneSignal service worker', {
        recoveryAction: 'reregister_onesignal_sw',
        finalStatus: 'ok',
      });
      return {
        status: 'recovering',
        message: 'OneSignal service worker re-registered',
        onesignalRegistrationFound: true,
        repaired: true,
      };
    }

    return {
      status: repaired ? 'recovering' : 'healthy',
      message: repaired
        ? 'OneSignal service worker repaired'
        : 'OneSignal service worker healthy',
      onesignalRegistrationFound: true,
      repaired,
    };
  } catch (error) {
    platformLog('service_worker', 'error', 'Service worker guardian failed', {
      recoveryAction: 'sw_guardian_error',
      finalStatus: 'error',
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      status: 'broken',
      message: error instanceof Error ? error.message : 'SW guardian failed',
      onesignalRegistrationFound: false,
      repaired: false,
    };
  }
}
