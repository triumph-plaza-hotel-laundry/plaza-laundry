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

const PAIRING_PATH = '/employee-device-pairing';

/** Production/public origin for QR links (phones must open the live site). */
export function getPairingAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (configured) {
    const trimmed = configured.replace(/\/$/, '');
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    // Vercel-style host without scheme still must be a valid URL base.
    return `https://${trimmed}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * QR payload: HTTPS URL so the phone camera opens pairing directly.
 * Example: https://app.example.com/employee-device-pairing?token=…
 */
export function encodeLinkPayload(token: string): string {
  const origin = getPairingAppOrigin();
  if (!origin) {
    throw new Error('Cannot build pairing URL — app origin is unknown');
  }
  const rawToken = String(token ?? '').trim();
  if (!rawToken) {
    throw new Error('Cannot build pairing URL — token is empty');
  }
  const url = new URL(PAIRING_PATH, `${origin}/`);
  url.searchParams.set('token', rawToken);
  return url.toString();
}

function tokenFromUrlString(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const fromQuery =
      url.searchParams.get('token')?.trim() ||
      url.searchParams.get('t')?.trim();
    if (fromQuery) {
      return fromQuery;
    }
    // Hash-router style: /#/employee-device-pairing?token=…
    if (url.hash.includes('token=')) {
      const hashQuery = url.hash.includes('?')
        ? url.hash.slice(url.hash.indexOf('?') + 1)
        : '';
      const params = new URLSearchParams(hashQuery);
      const hashToken =
        params.get('token')?.trim() || params.get('t')?.trim();
      if (hashToken) {
        return hashToken;
      }
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function parseLinkPayload(raw: string): LinkQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const fromUrl = tokenFromUrlString(trimmed);
  if (fromUrl) {
    return { v: 1, type: LINK_QR_PAYLOAD_TYPE, token: fromUrl };
  }

  try {
    const parsed = JSON.parse(trimmed) as LinkQrPayload;
    if (
      parsed?.v === 1 &&
      parsed.type === LINK_QR_PAYLOAD_TYPE &&
      typeof parsed.token === 'string' &&
      parsed.token.trim()
    ) {
      return parsed;
    }
  } catch {
    // Bare token for manual entry
    if (!trimmed.startsWith('{') && !trimmed.includes('://')) {
      return { v: 1, type: LINK_QR_PAYLOAD_TYPE, token: trimmed };
    }
  }

  return null;
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

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as
    | {
        token?: unknown;
        employee_id?: unknown;
        expires_at?: unknown;
      }
    | undefined;

  const token = typeof row?.token === 'string' ? row.token.trim() : '';
  if (!token) {
    throw new Error(
      'Failed to issue link ticket — RPC returned no token in client data',
    );
  }

  return {
    token,
    employeeId: String(row?.employee_id ?? employeeId),
    expiresAt: String(row?.expires_at ?? ''),
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
