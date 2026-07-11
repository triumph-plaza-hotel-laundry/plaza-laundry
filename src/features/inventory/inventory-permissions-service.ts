import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import type { AuthUser } from '@/features/auth/types';

export const INVENTORY_PERMISSIONS = [
  'inventory.add',
  'inventory.edit',
  'inventory.enable_disable',
  'inventory.delete',
] as const;

export type InventoryPermission = (typeof INVENTORY_PERMISSIONS)[number];

const TABLE = 'admin_inventory_permissions';
const SELECT_COLUMNS = 'user_id, permission, granted_at';

export const INVENTORY_PERMISSION_DENIED =
  'You do not have permission to perform this inventory action.';
export const INVENTORY_DELETE_SOLE_HOLDER =
  'Cannot remove delete permission while you are the only inventory super admin.';

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
  permission: InventoryPermission;
  granted_at: string;
};

export function impliesFullInventoryPermissions(
  user:
    | Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>
    | null
    | undefined,
): boolean {
  return Boolean(user && isPrimaryAdminAccount(user));
}

export function allInventoryPermissions(): InventoryPermission[] {
  return [...INVENTORY_PERMISSIONS];
}

export async function listInventoryPermissions(
  userId: string,
): Promise<InventoryPermission[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .eq('user_id', userId);

  if (error) {
    if (isMissingTableError(error, TABLE)) {
      return [];
    }
    throwServiceError(error, 'Failed to load inventory permissions.');
  }

  return ((data ?? []) as DbPermissionRow[]).map((row) => row.permission);
}

export async function hasInventoryPermission(
  userId: string,
  permission: InventoryPermission,
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<boolean> {
  if (
    impliesFullInventoryPermissions(actor && actor.id === userId ? actor : null)
  ) {
    return true;
  }

  const permissions = await listInventoryPermissions(userId);
  return permissions.includes(permission);
}

export async function assertInventoryPermission(
  actorId: string,
  permission: InventoryPermission,
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  const allowed = await hasInventoryPermission(
    actorId,
    permission,
    actor?.id === actorId ? actor : null,
  );
  if (!allowed) {
    throw new Error(INVENTORY_PERMISSION_DENIED);
  }
}

async function countDeletePermissionHolders(): Promise<number> {
  const client = requireClient();
  const { count, error } = await client
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('permission', 'inventory.delete');

  if (error) {
    if (isMissingTableError(error, TABLE)) {
      return 0;
    }
    throwServiceError(
      error,
      'Failed to count inventory delete permission holders.',
    );
  }

  return count ?? 0;
}

async function upsertPermissions(
  userId: string,
  permissions: InventoryPermission[],
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
    throwServiceError(error, 'Failed to grant inventory permissions.');
  }
}

async function removePermissions(
  userId: string,
  permissions: InventoryPermission[],
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
    throwServiceError(error, 'Failed to revoke inventory permissions.');
  }
}

export async function grantInventoryPermissions(
  actorId: string,
  targetUserId: string,
  permissions: InventoryPermission[],
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  await assertInventoryPermission(actorId, 'inventory.delete', actor);
  await upsertPermissions(targetUserId, permissions);
}

export async function revokeInventoryPermissions(
  actorId: string,
  targetUserId: string,
  permissions: InventoryPermission[],
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  await assertInventoryPermission(actorId, 'inventory.delete', actor);

  if (permissions.includes('inventory.delete') && actorId === targetUserId) {
    const holders = await countDeletePermissionHolders();
    const actorPermissions = await listInventoryPermissions(actorId);
    const actorHasDelete =
      impliesFullInventoryPermissions(actor) ||
      actorPermissions.includes('inventory.delete');

    if (actorHasDelete && holders <= 1) {
      throw new Error(INVENTORY_DELETE_SOLE_HOLDER);
    }
  }

  await removePermissions(targetUserId, permissions);
}

export async function setInventoryPermissions(
  actorId: string,
  targetUserId: string,
  nextPermissions: InventoryPermission[],
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): Promise<void> {
  await assertInventoryPermission(actorId, 'inventory.delete', actor);

  const current = new Set(await listInventoryPermissions(targetUserId));
  const next = new Set(nextPermissions);

  const toGrant = [...next].filter((permission) => !current.has(permission));
  const toRevoke = [...current].filter((permission) => !next.has(permission));

  if (toRevoke.includes('inventory.delete') && actorId === targetUserId) {
    const holders = await countDeletePermissionHolders();
    const actorPermissions = await listInventoryPermissions(actorId);
    const actorHasDelete =
      impliesFullInventoryPermissions(actor) ||
      actorPermissions.includes('inventory.delete');

    if (actorHasDelete && holders <= 1) {
      throw new Error(INVENTORY_DELETE_SOLE_HOLDER);
    }
  }

  await removePermissions(targetUserId, toRevoke);
  await upsertPermissions(targetUserId, toGrant);
}

export async function ensureInventoryPermissionsBootstrapped(
  currentUserId: string,
): Promise<void> {
  const client = requireClient();

  const { count, error: countError } = await client
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('permission', 'inventory.delete');

  if (countError) {
    if (isMissingTableError(countError, TABLE)) {
      return;
    }
    throwServiceError(
      countError,
      'Failed to check inventory permission bootstrap state.',
    );
  }

  if ((count ?? 0) > 0) {
    return;
  }

  await upsertPermissions(currentUserId, allInventoryPermissions());
}

export function subscribeInventoryPermissionChanges(onChange: () => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const channel = client
    .channel('inventory-permissions-v1')
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
