import OneSignal from 'react-onesignal';
import { canRegisterPrimaryAdminDevice } from '@/features/primary-admin-device/access';
import { getOrCreatePrimaryAdminDeviceId } from '@/features/primary-admin-device/local-device-id';
import type { AuthUser } from '@/features/auth/types';
import {
  bootstrapOneSignalWebPush,
  ensureOneSignalInitialized,
} from '@/lib/onesignal';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getErrorMessage,
  isMissingTableError,
  toServiceError,
} from '@/lib/supabase/errors';

const TABLE = 'primary_admin_device';

export const PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED =
  'Primary admin device already configured.';

export const PRIMARY_ADMIN_DEVICE_FORBIDDEN =
  'Only a Super Admin can register the primary admin device.';

export type PrimaryAdminDevice = {
  id: string;
  deviceId: string;
  onesignalSubscriptionId: string;
  registeredAt: string;
  registeredByAdminId: string | null;
};

type PrimaryAdminDeviceRow = {
  id: string;
  device_id: string;
  onesignal_subscription_id: string;
  registered_at: string;
  registered_by_admin_id: string | null;
};

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function mapRow(row: PrimaryAdminDeviceRow): PrimaryAdminDevice {
  return {
    id: row.id,
    deviceId: row.device_id,
    onesignalSubscriptionId: row.onesignal_subscription_id,
    registeredAt: row.registered_at,
    registeredByAdminId: row.registered_by_admin_id,
  };
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('unique')
  );
}

function readPushSubscriptionId(): string | null {
  try {
    const id = OneSignal.User.PushSubscription.id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export async function getPrimaryAdminDevice(): Promise<PrimaryAdminDevice | null> {
  const client = requireClient();
  const { data, error } = await client
    .from(TABLE)
    .select(
      'id, device_id, onesignal_subscription_id, registered_at, registered_by_admin_id',
    )
    .eq('singleton', true)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, TABLE)) {
      throw new Error(
        'Primary admin device table is missing. Apply the latest Supabase migrations.',
      );
    }
    throw toServiceError(error, 'Unable to load primary admin device.');
  }

  return data ? mapRow(data as PrimaryAdminDeviceRow) : null;
}

async function resolveOneSignalSubscriptionId(): Promise<string> {
  await ensureOneSignalInitialized();

  let subscriptionId = readPushSubscriptionId();
  if (!subscriptionId) {
    await bootstrapOneSignalWebPush();
    subscriptionId = readPushSubscriptionId();
  }

  if (!subscriptionId) {
    throw new Error(
      'OneSignal subscription is not ready on this device. Allow notifications and try again.',
    );
  }

  return subscriptionId;
}

/**
 * One-time registration. Fails if a primary admin device already exists
 * or the actor is not a Super Admin / Primary Owner.
 */
export async function registerPrimaryAdminDevice(
  actor: AuthUser,
): Promise<PrimaryAdminDevice> {
  if (!canRegisterPrimaryAdminDevice(actor)) {
    throw new Error(PRIMARY_ADMIN_DEVICE_FORBIDDEN);
  }

  const existing = await getPrimaryAdminDevice();
  if (existing) {
    throw new Error(PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED);
  }

  const deviceId = getOrCreatePrimaryAdminDeviceId();
  const onesignalSubscriptionId = await resolveOneSignalSubscriptionId();
  const client = requireClient();

  const { data, error } = await client
    .from(TABLE)
    .insert({
      singleton: true,
      device_id: deviceId,
      onesignal_subscription_id: onesignalSubscriptionId,
      registered_by_admin_id: actor.id,
    })
    .select(
      'id, device_id, onesignal_subscription_id, registered_at, registered_by_admin_id',
    )
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED);
    }
    if (isMissingTableError(error, TABLE)) {
      throw new Error(
        'Primary admin device table is missing. Apply the latest Supabase migrations.',
      );
    }
    throw toServiceError(
      error,
      getErrorMessage(error, 'Unable to register primary admin device.'),
    );
  }

  return mapRow(data as PrimaryAdminDeviceRow);
}
