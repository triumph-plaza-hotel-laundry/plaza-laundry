import {
  assertInventoryPermission,
} from '@/features/inventory/inventory-permissions-service';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import type { AuthUser } from '@/features/auth/types';

export const DEVICE_PERMISSIONS = ['devices.manage'] as const;

export type DevicePermission = (typeof DEVICE_PERMISSIONS)[number];

const TABLE = 'admin_device_permissions';
const SELECT_COLUMNS = 'user_id, permission, granted_at';

export const DEVICE_PERMISSION_DENIED =
  'You do not have permission to manage employee devices.';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function throwServiceError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): never {
  throw toServiceError(error, fallback);
}

type DbPermissionRow = {
  user_id: string;
  permission: DevicePermission;
  granted_at: string;
};

export function impliesFullDevicePermissions(
  user:
    | Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>
    | null
    | undefined,
): boolean {
  return Boolean(user && isPrimaryAdminAccount(user));
}

export function allDevicePermissions(): DevicePermission[] {
  return [...DEVICE_PERMISSIONS];
}

export async function listDevicePermissions(
  userId: string,
): Promise<DevicePermission[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .eq('user_id', userId);

  if (error) {
    if (isMissingTableError(error, TABLE)) {
      return [];
    }
    throwServiceError(error, 'Failed to load device permissions.');
  }

  return ((data ?? []) as DbPermissionRow[]).map((row) => row.permission);
}

export async function hasDevicePermission(
  userId: string,
  permission: DevicePermission = 'devices.manage',
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<boolean> {
  if (
    impliesFullDevicePermissions(actor && actor.id === userId ? actor : null)
  ) {
    return true;
  }

  const permissions = await listDevicePermissions(userId);
  return permissions.includes(permission);
}

export async function assertDevicePermission(
  actorId: string,
  permission: DevicePermission = 'devices.manage',
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  const allowed = await hasDevicePermission(
    actorId,
    permission,
    actor?.id === actorId ? actor : null,
  );
  if (!allowed) {
    throw new Error(DEVICE_PERMISSION_DENIED);
  }
}

async function upsertPermissions(
  userId: string,
  permissions: DevicePermission[],
) {
  if (permissions.length === 0) {
    return;
  }

  const client = requireClient();
  const rows = permissions.map((permission) => ({
    user_id: userId,
    permission,
  }));

  const { error } = await client
    .from(TABLE)
    .upsert(rows, { onConflict: 'user_id,permission' });
  if (error) {
    throwServiceError(error, 'Failed to grant device permissions.');
  }
}

async function removePermissions(
  userId: string,
  permissions: DevicePermission[],
) {
  if (permissions.length === 0) {
    return;
  }

  const client = requireClient();
  const { error } = await client
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .in('permission', permissions);
  if (error) {
    throwServiceError(error, 'Failed to revoke device permissions.');
  }
}

/**
 * Saves device-management grants for a target admin.
 * Only callers who can manage inventory permission grants may change these.
 */
export async function setDevicePermissions(
  actorId: string,
  targetUserId: string,
  nextPermissions: DevicePermission[],
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  await assertInventoryPermission(actorId, 'inventory.delete', actor);

  const current = new Set(await listDevicePermissions(targetUserId));
  const next = new Set(nextPermissions);

  const toGrant = [...next].filter((permission) => !current.has(permission));
  const toRevoke = [...current].filter((permission) => !next.has(permission));

  await removePermissions(targetUserId, toRevoke);
  await upsertPermissions(targetUserId, toGrant);
}

export function subscribeDevicePermissionChanges(onChange: () => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('device-permissions-v1')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      onChange,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
