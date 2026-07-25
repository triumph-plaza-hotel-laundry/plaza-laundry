import { useCallback, useEffect, useState } from 'react';
import { subscribeDevices } from '@/features/notifications/devices';
import {
  readLocalDeviceLink,
  subscribeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';
import { reconcileLocalDeviceLink } from '@/features/notifications/pairing/reconcile-local-link';

/**
 * Tracks whether THIS browser/PWA is linked to an employee.
 * QR pairing page is shown only when unlinked; after Admin Unlink it returns.
 *
 * Local cache is reconciled against the server — never cleared solely because
 * the live OneSignal player_id does not match yet (rotation / identity 409).
 */
export function useThisDeviceLinkStatus() {
  const [isLinked, setIsLinked] = useState(() => {
    const local = readLocalDeviceLink();
    return Boolean(local?.linked);
  });
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await reconcileLocalDeviceLink();
      setIsLinked(result.linked);
    } catch (error) {
      console.warn(
        '[device-link] refresh failed — keeping cached link state',
        error instanceof Error ? error.message : error,
      );
      setIsLinked(Boolean(readLocalDeviceLink()?.linked));
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeLocalDeviceLink(() => void refresh()), [refresh]);
  useEffect(() => subscribeDevices(() => void refresh()), [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { isLinked, isReady, refresh };
}
