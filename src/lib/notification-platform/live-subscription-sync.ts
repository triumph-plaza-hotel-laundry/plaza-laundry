import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError } from '@/lib/supabase/errors';
import { notificationPlatformConfig } from '@/lib/notification-platform/config';
import { platformLog } from '@/lib/notification-platform/logger';
import type { SubscriptionChangePayload } from '@/lib/notification-platform/types';
import {
  readLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/employee-devices/local-device-link';

const PLATFORM_SYNC_EVENT = 'tpl-notification-platform-sync';

export function emitPlatformSyncEvent(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(PLATFORM_SYNC_EVENT));
}

export function subscribePlatformSync(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener(PLATFORM_SYNC_EVENT, handler);
  return () => window.removeEventListener(PLATFORM_SYNC_EVENT, handler);
}

function isMissingRpcError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('sync_onesignal_subscription_rotation')
  );
}

function rewriteLocalLinkPlayerId(previousId: string | null, nextId: string) {
  const local = readLocalDeviceLink();
  if (!local?.linked) {
    return;
  }

  if (previousId && local.onesignalPlayerId && local.onesignalPlayerId !== previousId) {
    // Local link is for a different subscription — leave it alone.
    if (local.onesignalPlayerId !== nextId) {
      return;
    }
  }

  writeLocalDeviceLink({
    ...local,
    onesignalPlayerId: nextId,
  });
}

/**
 * Synchronize subscription id rotation across DB tables + local cache.
 * Falls back to direct upserts when the RPC is not yet migrated.
 */
export async function onSubscriptionIdChanged(
  payload: SubscriptionChangePayload,
): Promise<void> {
  if (!notificationPlatformConfig.isEnabled) {
    return;
  }

  const nextId = payload.nextId?.trim();
  if (!nextId) {
    return;
  }

  const previousId = payload.previousId?.trim() || null;
  if (previousId && previousId === nextId) {
    return;
  }

  // If previousId is unknown, still rewrite local link + ask RPC to infer
  // the old linked-device id from laundry_employee_id.
  rewriteLocalLinkPlayerId(previousId, nextId);
  emitPlatformSyncEvent();

  const client = getSupabaseClient();
  if (!client) {
    platformLog('subscription', 'warning', 'Subscription sync skipped — no Supabase', {
      onesignalPlayerId: nextId,
      payload: { previousId },
      recoveryAction: 'skip_offline',
    });
    return;
  }

  const { data, error } = await client.rpc('sync_onesignal_subscription_rotation', {
    p_old_id: previousId,
    p_new_id: nextId,
    p_device_label: payload.deviceLabel || 'web',
    p_laundry_employee_id: payload.laundryEmployeeId ?? null,
    p_admin_employee_id: payload.adminEmployeeId ?? null,
    p_primary_admin_device_id: payload.primaryAdminDeviceId ?? null,
  });

  if (error) {
    if (isMissingRpcError(error) || isMissingTableError(error, 'onesignal_subscriptions')) {
      platformLog('subscription', 'warning', 'Rotation RPC missing — legacy upsert fallback', {
        onesignalPlayerId: nextId,
        recoveryAction: 'legacy_upsert',
        payload: { message: error.message },
      });
      await legacyUpsertFallback(payload, previousId, nextId);
      return;
    }

    platformLog('subscription', 'error', 'Subscription rotation failed', {
      onesignalPlayerId: nextId,
      recoveryAction: 'rotation_failed',
      finalStatus: 'error',
      payload: { message: error.message, previousId },
    });
    return;
  }

  platformLog('subscription', 'info', 'Subscription rotation synchronized', {
    onesignalPlayerId: nextId,
    laundryEmployeeId: payload.laundryEmployeeId,
    recoveryAction: 'sync_rotation',
    finalStatus: 'ok',
    payload:
      data && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : { previousId, nextId, raw: data },
  });
}

async function legacyUpsertFallback(
  payload: SubscriptionChangePayload,
  previousId: string | null,
  nextId: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const now = new Date().toISOString();

  if (previousId) {
    await client
      .from('employee_linked_devices')
      .update({
        onesignal_player_id: nextId,
        device_label: payload.deviceLabel,
        last_seen_at: now,
        last_synced_at: now,
        subscription_status: 'active',
        updated_at: now,
      })
      .eq('onesignal_player_id', previousId)
      .eq('status', 'active');

    await client
      .from('employee_device_pairing_sessions')
      .update({ onesignal_player_id: nextId })
      .eq('onesignal_player_id', previousId)
      .eq('status', 'pending');
  }

  if (payload.adminEmployeeId) {
    await client.from('onesignal_subscriptions').upsert(
      {
        employee_id: payload.adminEmployeeId,
        onesignal_player_id: nextId,
        device: payload.deviceLabel,
        laundry_employee_id: payload.laundryEmployeeId ?? null,
        updated_at: now,
        is_valid: true,
        last_verified_at: now,
      },
      { onConflict: 'onesignal_player_id' },
    );

    if (previousId && previousId !== nextId) {
      await client
        .from('onesignal_subscriptions')
        .delete()
        .eq('onesignal_player_id', previousId);
    }
  }

  if (payload.primaryAdminDeviceId) {
    await client
      .from('primary_admin_device')
      .update({
        onesignal_subscription_id: nextId,
        updated_at: now,
      })
      .eq('device_id', payload.primaryAdminDeviceId);
  }
}
