import { useCallback, useEffect, useState } from 'react';
import {
  getActiveLinkedDeviceByPlayerId,
  subscribeLinkedDevices,
} from '@/features/employee-devices/device-pairing-service';
import {
  clearLocalDeviceLink,
  readLocalDeviceLink,
  subscribeLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/employee-devices/local-device-link';
import { getCurrentOneSignalPlayerId } from '@/features/employee-devices/onesignal-pairing';
import { subscribePlatformSync } from '@/lib/notification-platform';

/**
 * Tracks whether THIS browser/PWA is currently linked to an employee.
 * Used to hide "ربط جهاز الموظف" after successful pairing, and to show it
 * again immediately when Admin removes/replaces the device.
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
        // Keep optimistic local linked state only briefly; if we have no player
        // id we cannot confirm against the server yet.
        setIsLinked(Boolean(local?.linked));
        setIsReady(true);
        return;
      }

      const active = await getActiveLinkedDeviceByPlayerId(playerId);
      if (active) {
        writeLocalDeviceLink({
          linked: true,
          onesignalPlayerId: playerId,
          laundryEmployeeId: active.laundryEmployeeId,
          pairedAt: active.pairedAt,
        });
        setIsLinked(true);
      } else {
        // Admin removed/replaced this device — pairing menu must return.
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

  // When Admin removes/replaces the device, update nav without reinstall.
  useEffect(() => subscribeLinkedDevices(() => void refresh()), [refresh]);

  // Platform live-sync (subscription rotation / cache heal) refreshes status.
  useEffect(() => subscribePlatformSync(() => void refresh()), [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  return { isLinked, isReady, refresh };
}
