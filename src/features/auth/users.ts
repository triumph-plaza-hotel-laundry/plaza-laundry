import { getSupabaseClient } from '@/lib/supabase/client';
import { hashPassword, verifyPassword } from '@/features/auth/password-hash';
import {
  assertPrimaryAdminProtected,
  assertPrimaryAdminSessionImmutable,
  isPrimaryAdminAccount,
  PRIMARY_ADMIN_DISPLAY_NAME,
  PRIMARY_ADMIN_ID,
  PRIMARY_ADMIN_PASSWORD_HASH,
  PRIMARY_ADMIN_USERNAME,
} from '@/features/auth/owner-protection';
import type { AdminType, AuthUser, UserRole } from '@/features/auth/types';

export type StoredAuthUser = AuthUser & {
  passwordHash: string;
};

const ADMIN_PORTAL_ROLES: UserRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
];

let usersStoreReady: Promise<void> | null = null;

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

async function buildPrimaryAdminRecord(
  passwordHash: string,
): Promise<StoredAuthUser> {
  return {
    id: PRIMARY_ADMIN_ID,
    username: PRIMARY_ADMIN_USERNAME,
    displayName: PRIMARY_ADMIN_DISPLAY_NAME,
    role: 'OWNER',
    isOwner: true,
    isProtected: true,
    isActive: true,
    adminType: 'Admin',
    passwordHash,
  };
}

function mapRow(row: {
  id: string;
  username: string;
  display_name: string;
  role: string;
  admin_type: string | null;
  password_hash: string;
  is_owner: boolean;
  is_protected: boolean;
  is_active: boolean;
}): StoredAuthUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as UserRole,
    isOwner: row.is_owner,
    isProtected: row.is_protected,
    isActive: row.is_active,
    adminType: (row.admin_type as AdminType | null) ?? 'Admin',
    passwordHash: row.password_hash,
  };
}

async function fetchAllUsers(): Promise<StoredAuthUser[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('admin_users')
    .select('*')
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRow);
}

async function upsertUsers(users: StoredAuthUser[]) {
  const client = requireSupabase();
  const rows = users.map((user) => ({
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    role: user.role,
    admin_type: user.adminType,
    password_hash: user.passwordHash,
    is_owner: user.isOwner,
    is_protected: user.isProtected,
    is_active: user.isActive,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from('admin_users')
    .upsert(rows, { onConflict: 'id' });
  if (error) {
    throw error;
  }
}

async function seedPrimaryAdminIfEmpty() {
  const users = await fetchAllUsers();
  if (users.length > 0) {
    return;
  }

  await upsertUsers([
    await buildPrimaryAdminRecord(PRIMARY_ADMIN_PASSWORD_HASH),
  ]);
}

function stripSecrets(user: StoredAuthUser): AuthUser {
  const { passwordHash: removedHash, ...authUser } = user;
  void removedHash;
  if (isPrimaryAdminAccount(user)) {
    return assertPrimaryAdminSessionImmutable(authUser);
  }
  return authUser;
}

export async function ensureUsersStoreReady(): Promise<void> {
  if (!usersStoreReady) {
    usersStoreReady = seedPrimaryAdminIfEmpty();
  }

  await usersStoreReady;
}

export async function findUserByCredentials(
  username: string,
  password: string,
): Promise<AuthUser | null> {
  await ensureUsersStoreReady();
  const normalized = normalizeUsername(username);
  const users = await fetchAllUsers();

  for (const user of users) {
    if (normalizeUsername(user.username) !== normalized) {
      continue;
    }

    if (!user.isActive) {
      return null;
    }

    const valid = await verifyPassword(password.trim(), user.passwordHash);
    if (!valid) {
      return null;
    }

    return stripSecrets(user);
  }

  return null;
}

export async function getStoredUsers(): Promise<AuthUser[]> {
  await ensureUsersStoreReady();
  const users = await fetchAllUsers();
  return users.map(stripSecrets);
}

export function getAdminManagedUsers(): AuthUser[] {
  throw new Error(
    'Use getStoredUsers() asynchronously for Supabase-backed admin users.',
  );
}

export async function listAdminManagedUsers(): Promise<AuthUser[]> {
  const users = await getStoredUsers();
  return users.filter((user) => ADMIN_PORTAL_ROLES.includes(user.role));
}

function assertCanManageAdmins(actor: AuthUser): void {
  if (!isPrimaryAdminAccount(actor)) {
    throw new Error('Permission denied');
  }
}

export async function createStoredAdminUser(
  actor: AuthUser,
  input: {
    displayName: string;
    username: string;
    password: string;
    adminType: AdminType;
  },
): Promise<AuthUser> {
  await ensureUsersStoreReady();
  assertCanManageAdmins(actor);

  const username = input.username.trim();
  if (!username) {
    throw new Error('Username is required');
  }

  if (
    normalizeUsername(username) === normalizeUsername(PRIMARY_ADMIN_USERNAME)
  ) {
    throw new Error('Username is reserved');
  }

  const users = await fetchAllUsers();
  if (
    users.some(
      (user) =>
        normalizeUsername(user.username) === normalizeUsername(username),
    )
  ) {
    throw new Error('Username already exists');
  }

  const nextUser: StoredAuthUser = {
    id: crypto.randomUUID(),
    username,
    displayName: input.displayName.trim() || username,
    role: 'ADMIN',
    isOwner: false,
    isProtected: false,
    isActive: true,
    adminType: input.adminType,
    passwordHash: await hashPassword(input.password),
  };

  await upsertUsers([...users, nextUser]);
  return stripSecrets(nextUser);
}

export async function updateStoredAdminUser(
  actor: AuthUser,
  targetId: string,
  updates: {
    displayName?: string;
    username?: string;
    adminType?: AdminType;
    isActive?: boolean;
    password?: string;
  },
): Promise<AuthUser> {
  await ensureUsersStoreReady();
  assertCanManageAdmins(actor);

  const users = await fetchAllUsers();
  const target = users.find((user) => user.id === targetId);
  if (!target) {
    throw new Error('User not found');
  }

  if (isPrimaryAdminAccount(target)) {
    if (
      updates.username &&
      normalizeUsername(updates.username) !== normalizeUsername(target.username)
    ) {
      throw new Error('Primary administrator username cannot be changed');
    }

    if (
      updates.displayName &&
      updates.displayName.trim() !== target.displayName
    ) {
      throw new Error('Primary administrator name cannot be changed');
    }

    if (updates.isActive === false) {
      throw new Error('Primary administrator cannot be disabled');
    }
  }

  const nextUsername = updates.username?.trim() ?? target.username;
  if (
    nextUsername &&
    users.some(
      (user) =>
        user.id !== targetId &&
        normalizeUsername(user.username) === normalizeUsername(nextUsername),
    )
  ) {
    throw new Error('Username already exists');
  }

  const nextUsers = await Promise.all(
    users.map(async (user) => {
      if (user.id !== targetId) {
        return user;
      }

      const passwordHash = updates.password
        ? await hashPassword(updates.password)
        : user.passwordHash;

      return {
        ...user,
        displayName: isPrimaryAdminAccount(user)
          ? PRIMARY_ADMIN_DISPLAY_NAME
          : updates.displayName?.trim() || user.displayName,
        username: isPrimaryAdminAccount(user)
          ? PRIMARY_ADMIN_USERNAME
          : nextUsername,
        role: isPrimaryAdminAccount(user) ? 'OWNER' : user.role,
        isOwner: isPrimaryAdminAccount(user) ? true : user.isOwner,
        isProtected: isPrimaryAdminAccount(user) ? true : user.isProtected,
        adminType: isPrimaryAdminAccount(user)
          ? 'Admin'
          : (updates.adminType ?? user.adminType),
        isActive: isPrimaryAdminAccount(user)
          ? true
          : (updates.isActive ?? user.isActive),
        passwordHash,
      };
    }),
  );

  await upsertUsers(nextUsers);
  const updated = nextUsers.find((user) => user.id === targetId)!;
  return stripSecrets(updated);
}

export async function deleteStoredUser(
  actor: AuthUser,
  targetId: string,
): Promise<void> {
  await ensureUsersStoreReady();
  assertCanManageAdmins(actor);

  const users = await fetchAllUsers();
  const target = users.find((user) => user.id === targetId);
  if (!target) {
    throw new Error('User not found');
  }

  assertPrimaryAdminProtected(target);
  const client = requireSupabase();
  const { error } = await client
    .from('admin_users')
    .delete()
    .eq('id', targetId);
  if (error) {
    throw error;
  }
}

export async function resetStoredAdminPassword(
  actor: AuthUser,
  targetId: string,
  password: string,
): Promise<void> {
  await updateStoredAdminUser(actor, targetId, { password });
}

export async function changeStoredOwnPassword(
  actor: AuthUser,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  await ensureUsersStoreReady();
  const users = await fetchAllUsers();
  const target = users.find((user) => user.id === actor.id);
  if (!target) {
    throw new Error('User not found');
  }

  const valid = await verifyPassword(
    currentPassword.trim(),
    target.passwordHash,
  );
  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  const nextUsers = await Promise.all(
    users.map(async (user) =>
      user.id === actor.id
        ? {
            ...user,
            passwordHash: await hashPassword(nextPassword),
          }
        : user,
    ),
  );

  await upsertUsers(nextUsers);
}

export async function resetForgottenAdminPassword(
  username: string,
  nextPassword: string,
): Promise<AuthUser> {
  await ensureUsersStoreReady();
  const normalized = normalizeUsername(username);
  const users = await fetchAllUsers();
  const target = users.find(
    (user) => normalizeUsername(user.username) === normalized,
  );

  if (!target || !target.isActive) {
    throw new Error('Invalid credentials');
  }

  const nextUsers = await Promise.all(
    users.map(async (user) =>
      user.id === target.id
        ? {
            ...user,
            passwordHash: await hashPassword(nextPassword),
          }
        : user,
    ),
  );

  await upsertUsers(nextUsers);
  return stripSecrets(nextUsers.find((user) => user.id === target.id)!);
}

// Backward-compatible sync accessor used in legacy call sites during migration.
export function getStoredUsersSync(): AuthUser[] {
  return [];
}
