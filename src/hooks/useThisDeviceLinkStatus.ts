import { useCallback, useEffect, useState } from 'react';
import {
  getActiveDeviceByPlayerId,
  subscribeDevices,
} from '@/features/notifications/devices';
import {
  clearLocalDeviceLink,
  readLocalDeviceLink,
  subscribeLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';
import { getCurrentOneSignalPlayerId } from '@/features/employee-devices/onesignal-pairing';

/**
 * Tracks whether THIS browser/PWA is linked to an employee.
 * QR pairing page is shown only when unlinked; after Admin Unlink it returns.
 */
export function useThisDeviceLinkStatus() {
  const [isLinked, setIsLinked] = useState(() => {
    const local = readLocalDeviceLink();
    return Boolean(local?.linked);
  });
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const local = readLocalDeviceLink();
    if (local?.linked) {
      setIsLinked(true);
    }

    try {
      const playerId = await getCurrentOneSignalPlayerId();
      if (!playerId) {
        setIsLinked(Boolean(local?.linked));
        setIsReady(true);
        return;
      }

      const active = await getActiveDeviceByPlayerId(playerId);
      if (active) {
        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: playerId,
          laundryEmployeeId: active.employeeId,
          pairedAt: active.linkedAt,
        });
        setIsLinked(true);
      } else {
        if (local?.linked) {
          clearLocalDeviceLink();
        }
        setIsLinked(false);
      }
    } catch {
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
    window.addEventListener('focus', () => void refresh());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', () => void refresh());
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { isLinked, isReady, refresh };
}
