import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  allDevicePermissions,
  hasDevicePermission,
  impliesFullDevicePermissions,
  listDevicePermissions,
  subscribeDevicePermissionChanges,
  type DevicePermission,
} from '@/features/employee-devices/device-permissions-service';
import { useAuth } from '@/hooks/useAuth';

export type DevicePermissionFlags = {
  permissions: DevicePermission[];
  canManageDevices: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
};

export function useDevicePermissions(): DevicePermissionFlags {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DevicePermission[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsReady(true);
      return;
    }

    if (impliesFullDevicePermissions(user)) {
      setPermissions(allDevicePermissions());
      setIsReady(true);
      return;
    }

    try {
      const next = await listDevicePermissions(user.id);
      setPermissions(next);
    } catch {
      setPermissions([]);
    } finally {
      setIsReady(true);
    }
  }, [user]);

  useEffect(() => {
    setIsReady(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeDevicePermissionChanges(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return useMemo(() => {
    const grantAll = impliesFullDevicePermissions(user);
    const effective = grantAll ? allDevicePermissions() : permissions;
    const canManageDevices =
      grantAll || effective.includes('devices.manage');

    return {
      permissions: effective,
      canManageDevices,
      isReady,
      refresh,
    };
  }, [isReady, permissions, refresh, user]);
}

export async function checkCanManageDevices(
  userId: string,
  user?: Parameters<typeof hasDevicePermission>[2],
): Promise<boolean> {
  return hasDevicePermission(userId, 'devices.manage', user);
}
