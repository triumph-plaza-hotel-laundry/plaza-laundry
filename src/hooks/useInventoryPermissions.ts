import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  allInventoryPermissions,
  impliesFullInventoryPermissions,
  listInventoryPermissions,
  subscribeInventoryPermissionChanges,
  type InventoryPermission,
} from '@/features/inventory/inventory-permissions-service';
import { useAuth } from '@/hooks/useAuth';

export type InventoryPermissionFlags = {
  permissions: InventoryPermission[];
  canAdd: boolean;
  canEdit: boolean;
  canEnableDisable: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
};

export function useInventoryPermissions(): InventoryPermissionFlags {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<InventoryPermission[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsReady(true);
      return;
    }

    if (impliesFullInventoryPermissions(user)) {
      setPermissions(allInventoryPermissions());
      setIsReady(true);
      return;
    }

    try {
      const next = await listInventoryPermissions(user.id);
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
    const unsubscribe = subscribeInventoryPermissionChanges(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return useMemo(() => {
    const grantAll = impliesFullInventoryPermissions(user);
    const effective = grantAll ? allInventoryPermissions() : permissions;

    return {
      permissions: effective,
      canAdd: effective.includes('inventory.add'),
      canEdit: effective.includes('inventory.edit'),
      canEnableDisable: effective.includes('inventory.enable_disable'),
      canDelete: effective.includes('inventory.delete'),
      canManagePermissions: effective.includes('inventory.delete'),
      isReady,
      refresh,
    };
  }, [isReady, permissions, refresh, user]);
}
