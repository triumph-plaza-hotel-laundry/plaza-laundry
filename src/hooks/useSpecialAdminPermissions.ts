import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasDevicePermission } from '@/features/employee-devices/device-permissions-service';
import {
  hasSpecialPermission,
  impliesFullSpecialPermissions,
  listSpecialPermissionsForUser,
  specialAdminPermissionsRepository,
  type SpecialAdminPermission,
} from '@/features/auth/special-admin-permissions';
import { useAuth } from '@/hooks/useAuth';

export type SpecialAdminPermissionFlags = {
  permissions: SpecialAdminPermission[];
  canManageEmployeeDevices: boolean;
  canManageShiftNotifications: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
};

export function useSpecialAdminPermissions(): SpecialAdminPermissionFlags {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<SpecialAdminPermission[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsReady(true);
      return;
    }

    if (impliesFullSpecialPermissions(user)) {
      setPermissions(['employee_devices', 'shift_notifications']);
      setIsReady(true);
      return;
    }

    try {
      await specialAdminPermissionsRepository.hydrate();
      const next = new Set(listSpecialPermissionsForUser(user.id));

      // Preserve legacy device grants until Super Admin re-saves.
      const hasLegacyDevice = await hasDevicePermission(
        user.id,
        'devices.manage',
        user,
      );
      if (hasLegacyDevice) {
        next.add('employee_devices');
      }

      setPermissions([...next]);
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
    return specialAdminPermissionsRepository.subscribe(() => {
      void refresh();
    });
  }, [refresh]);

  return useMemo(() => {
    const grantAll = impliesFullSpecialPermissions(user);
    const effective = grantAll
      ? (['employee_devices', 'shift_notifications'] as SpecialAdminPermission[])
      : permissions;

    return {
      permissions: effective,
      canManageEmployeeDevices:
        grantAll || effective.includes('employee_devices'),
      canManageShiftNotifications:
        grantAll || effective.includes('shift_notifications'),
      isReady,
      refresh,
    };
  }, [isReady, permissions, refresh, user]);
}

export async function checkHasSpecialPermission(
  userId: string,
  permission: SpecialAdminPermission,
  user?: Parameters<typeof hasSpecialPermission>[2],
): Promise<boolean> {
  return hasSpecialPermission(userId, permission, user);
}
