import { createLocalStore } from '@/lib/data-store';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';
import {
  isPrimaryAdminAccount,
  PRIMARY_ADMIN_ID,
} from '@/features/auth/owner-protection';
import type { AuthUser } from '@/features/auth/types';

export type SpecialAdminPermission = 'employee_devices' | 'shift_notifications';

export type SpecialAdminPermissionsState = {
  /** userId → granted special permissions */
  grants: Record<string, SpecialAdminPermission[]>;
};

const DEFAULT_STATE: SpecialAdminPermissionsState = {
  grants: {},
};

function normalizeState(
  parsed: unknown,
  seed: SpecialAdminPermissionsState,
): SpecialAdminPermissionsState {
  if (!parsed || typeof parsed !== 'object') {
    return seed;
  }

  const raw = parsed as { grants?: unknown };
  if (!raw.grants || typeof raw.grants !== 'object') {
    return seed;
  }

  const grants: Record<string, SpecialAdminPermission[]> = {};
  for (const [userId, value] of Object.entries(raw.grants)) {
    if (!Array.isArray(value)) continue;
    grants[userId] = value.filter(
      (entry): entry is SpecialAdminPermission =>
        entry === 'employee_devices' || entry === 'shift_notifications',
    );
  }

  return { grants };
}

const store = createLocalStore<SpecialAdminPermissionsState>({
  key: STORAGE_KEYS.adminSpecialPermissions,
  seed: () => DEFAULT_STATE,
  normalize: normalizeState,
});

export const SPECIAL_PERMISSION_DENIED =
  'You do not have permission to access this page.';

export function impliesFullSpecialPermissions(
  user:
    | Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>
    | null
    | undefined,
): boolean {
  return Boolean(user && isPrimaryAdminAccount(user));
}

export function listSpecialPermissionsForUser(
  userId: string,
): SpecialAdminPermission[] {
  if (userId === PRIMARY_ADMIN_ID) {
    return ['employee_devices', 'shift_notifications'];
  }
  const state = store.getSnapshot();
  return [...(state.grants[userId] ?? [])];
}

export function hasSpecialPermission(
  userId: string,
  permission: SpecialAdminPermission,
  actor?: Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'> | null,
): boolean {
  if (userId === PRIMARY_ADMIN_ID) {
    return true;
  }
  if (actor && actor.id === userId && impliesFullSpecialPermissions(actor)) {
    return true;
  }
  return listSpecialPermissionsForUser(userId).includes(permission);
}

export async function setSpecialPermission(
  actor: AuthUser,
  targetUserId: string,
  permission: SpecialAdminPermission,
  enabled: boolean,
): Promise<void> {
  if (!isPrimaryAdminAccount(actor)) {
    throw new Error('Permission denied');
  }

  if (targetUserId === PRIMARY_ADMIN_ID) {
    return;
  }

  await store.hydrate();
  const current = store.getSnapshot();
  const existing = new Set(current.grants[targetUserId] ?? []);

  if (enabled) {
    existing.add(permission);
  } else {
    existing.delete(permission);
  }

  const nextGrants = { ...current.grants };
  if (existing.size === 0) {
    delete nextGrants[targetUserId];
  } else {
    nextGrants[targetUserId] = [...existing];
  }

  store.replaceState({ grants: nextGrants });
  await store.flush();
}

export const specialAdminPermissionsRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  hydrate: store.hydrate,
  reloadFromStorage: store.reloadFromStorage,
  flush: store.flush,
};
