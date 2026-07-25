import { requireSupabase } from '@/features/notifications/shared/supabase';
import {
  getNotificationSettings,
  settingAsInt,
} from '@/features/notifications/settings';
import {
  LINK_QR_PAYLOAD_TYPE,
  type LinkQrPayload,
  type LinkTicket,
} from '@/features/notifications/shared/types';

export function encodeLinkPayload(token: string): string {
  const payload: LinkQrPayload = {
    v: 1,
    type: LINK_QR_PAYLOAD_TYPE,
    token,
  };
  return JSON.stringify(payload);
}

export function parseLinkPayload(raw: string): LinkQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as LinkQrPayload;
    if (
      parsed?.v === 1 &&
      parsed.type === LINK_QR_PAYLOAD_TYPE &&
      typeof parsed.token === 'string' &&
      parsed.token.trim()
    ) {
      return parsed;
    }
    return null;
  } catch {
    // Allow bare token for manual entry
    const token = raw.trim();
    if (token && !token.startsWith('{')) {
      return { v: 1, type: LINK_QR_PAYLOAD_TYPE, token };
    }
    return null;
  }
}

export async function issueLinkTicket(
  employeeId: string,
  adminId: string,
): Promise<LinkTicket> {
  const settings = await getNotificationSettings();
  const ttl = settingAsInt(settings, 'qr_ticket_ttl_minutes', 15);
  const client = requireSupabase();
  const { data, error } = await client.rpc('issue_notification_link_ticket', {
    p_employee_id: employeeId,
    p_admin_id: adminId,
    p_ttl_minutes: ttl,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) {
    throw new Error('Failed to issue link ticket');
  }
  return {
    token: row.token as string,
    employeeId: row.employee_id as string,
    expiresAt: row.expires_at as string,
  };
}

export type ClaimDeviceInput = {
  token: string;
  playerId: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  operatingSystem?: string;
  browser?: string;
  appVersion?: string;
};

export async function claimDevice(input: ClaimDeviceInput) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('claim_notification_device', {
    p_token: input.token,
    p_player_id: input.playerId,
    p_device_id: input.deviceId ?? 'web',
    p_device_name: input.deviceName ?? null,
    p_device_model: input.deviceModel ?? null,
    p_operating_system: input.operatingSystem ?? null,
    p_browser: input.browser ?? null,
    p_app_version: input.appVersion ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.employee_id || !row?.player_id) {
    throw new Error('Claim failed');
  }
  return {
    employeeId: row.employee_id as string,
    playerId: row.player_id as string,
  };
}

export async function expireStaleTickets() {
  const client = requireSupabase();
  const { data, error } = await client.rpc('expire_stale_notification_link_tickets');
  if (error) {
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}
