import { getSupabaseClient } from '@/lib/supabase/client';
import { isMissingTableError, toServiceError } from '@/lib/supabase/errors';
import {
  removeOneSignalSubscriptionByPlayerId,
  upsertOneSignalSubscription,
} from '@/lib/onesignal/subscriptions-repository';
import {
  assertDevicePermission,
} from '@/features/employee-devices/device-permissions-service';
import type { AuthUser } from '@/features/auth/types';

const SESSIONS_TABLE = 'employee_device_pairing_sessions';
const DEVICES_TABLE = 'employee_linked_devices';

export const PAIRING_PAYLOAD_TYPE = 'tpl-employee-device-pair';
export const PAIRING_SESSION_TTL_MS = 15 * 60 * 1000;

export type PairingSessionStatus =
  | 'pending'
  | 'completed'
  | 'expired'
  | 'cancelled';

export type LinkedDeviceStatus = 'active' | 'replaced' | 'removed';

export type PairingQrPayload = {
  v: 1;
  type: typeof PAIRING_PAYLOAD_TYPE;
  token: string;
};

export type PairingSession = {
  id: string;
  pairingToken: string;
  onesignalPlayerId: string;
  deviceLabel: string;
  status: PairingSessionStatus;
  laundryEmployeeId: string | null;
  laundryEmployeeNameEn: string | null;
  laundryEmployeeNameAr: string | null;
  pairedByAdminId: string | null;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
};

export type LinkedDevice = {
  id: string;
  laundryEmployeeId: string;
  laundryEmployeeNameEn: string | null;
  laundryEmployeeNameAr: string | null;
  onesignalPlayerId: string;
  deviceLabel: string;
  status: LinkedDeviceStatus;
  pairedAt: string;
  lastSeenAt: string;
  pairedByAdminId: string | null;
  replacedAt: string | null;
  removedAt: string | null;
};

type SessionRow = {
  id: string;
  pairing_token: string;
  onesignal_player_id: string;
  device_label: string;
  status: PairingSessionStatus;
  laundry_employee_id: string | null;
  laundry_employee_name_en: string | null;
  laundry_employee_name_ar: string | null;
  paired_by_admin_id: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
};

type DeviceRow = {
  id: string;
  laundry_employee_id: string;
  laundry_employee_name_en: string | null;
  laundry_employee_name_ar: string | null;
  onesignal_player_id: string;
  device_label: string;
  status: LinkedDeviceStatus;
  paired_at: string;
  last_seen_at: string;
  paired_by_admin_id: string | null;
  replaced_at: string | null;
  removed_at: string | null;
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

function throwServiceError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): never {
  throw toServiceError(error, fallback);
}

function mapSession(row: SessionRow): PairingSession {
  return {
    id: row.id,
    pairingToken: row.pairing_token,
    onesignalPlayerId: row.onesignal_player_id,
    deviceLabel: row.device_label,
    status: row.status,
    laundryEmployeeId: row.laundry_employee_id,
    laundryEmployeeNameEn: row.laundry_employee_name_en,
    laundryEmployeeNameAr: row.laundry_employee_name_ar,
    pairedByAdminId: row.paired_by_admin_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
  };
}

function mapDevice(row: DeviceRow): LinkedDevice {
  return {
    id: row.id,
    laundryEmployeeId: row.laundry_employee_id,
    laundryEmployeeNameEn: row.laundry_employee_name_en,
    laundryEmployeeNameAr: row.laundry_employee_name_ar,
    onesignalPlayerId: row.onesignal_player_id,
    deviceLabel: row.device_label,
    status: row.status,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
    pairedByAdminId: row.paired_by_admin_id,
    replacedAt: row.replaced_at,
    removedAt: row.removed_at,
  };
}

function createPairingToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `tpl_${random}`;
}

export function encodePairingPayload(token: string): string {
  const payload: PairingQrPayload = {
    v: 1,
    type: PAIRING_PAYLOAD_TYPE,
    token,
  };
  return JSON.stringify(payload);
}

export function parsePairingPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('tpl_')) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<PairingQrPayload>;
    if (
      parsed &&
      parsed.v === 1 &&
      parsed.type === PAIRING_PAYLOAD_TYPE &&
      typeof parsed.token === 'string' &&
      parsed.token.trim()
    ) {
      return parsed.token.trim();
    }
  } catch {
    // Manual token paste fallback below.
  }

  if (/^tpl_[a-f0-9]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

async function cancelPendingSessionsForPlayer(
  onesignalPlayerId: string,
  exceptSessionId?: string,
): Promise<void> {
  if (!onesignalPlayerId) {
    return;
  }

  const client = requireClient();
  let query = client
    .from(SESSIONS_TABLE)
    .update({ status: 'cancelled' })
    .eq('onesignal_player_id', onesignalPlayerId)
    .eq('status', 'pending');

  if (exceptSessionId) {
    query = query.neq('id', exceptSessionId);
  }

  const { error } = await query;
  if (error && !isMissingTableError(error, SESSIONS_TABLE)) {
    throwServiceError(error, 'Failed to cancel pending pairing sessions.');
  }
}

export async function createPairingSession(input: {
  onesignalPlayerId: string;
  deviceLabel: string;
}): Promise<PairingSession> {
  const client = requireClient();
  const pairingToken = createPairingToken();
  const expiresAt = new Date(Date.now() + PAIRING_SESSION_TTL_MS).toISOString();

  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .insert({
      pairing_token: pairingToken,
      onesignal_player_id: input.onesignalPlayerId,
      device_label: input.deviceLabel,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select(
      'id, pairing_token, onesignal_player_id, device_label, status, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, paired_by_admin_id, created_at, expires_at, completed_at',
    )
    .single();

  if (error) {
    throwServiceError(error, 'Failed to create pairing session.');
  }

  return mapSession(data as SessionRow);
}

/**
 * Reuse a still-valid pending session for this device, or cancel unused ones
 * and mint a fresh QR session so the employee is never blocked.
 */
export async function ensureFreshPairingSession(input: {
  onesignalPlayerId: string;
  deviceLabel: string;
}): Promise<PairingSession> {
  const client = requireClient();
  const now = Date.now();

  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .select(
      'id, pairing_token, onesignal_player_id, device_label, status, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, paired_by_admin_id, created_at, expires_at, completed_at',
    )
    .eq('onesignal_player_id', input.onesignalPlayerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error && !isMissingTableError(error, SESSIONS_TABLE)) {
    throwServiceError(error, 'Failed to load pairing sessions.');
  }

  const pending = ((data ?? []) as SessionRow[]).map(mapSession);
  const reusable = pending.find(
    (session) => new Date(session.expiresAt).getTime() > now,
  );

  if (reusable) {
    // Keep one valid QR; cancel older unused siblings.
    await cancelPendingSessionsForPlayer(
      input.onesignalPlayerId,
      reusable.id,
    );
    return {
      ...reusable,
      deviceLabel: input.deviceLabel || reusable.deviceLabel,
    };
  }

  // Expire stale pending rows, then create a new session.
  if (pending.length > 0) {
    const { error: expireError } = await client
      .from(SESSIONS_TABLE)
      .update({ status: 'expired' })
      .eq('onesignal_player_id', input.onesignalPlayerId)
      .eq('status', 'pending');
    if (expireError && !isMissingTableError(expireError, SESSIONS_TABLE)) {
      throwServiceError(expireError, 'Failed to expire unused pairing sessions.');
    }
  }

  return createPairingSession(input);
}

export async function cancelPendingPairingSessionsForPlayer(
  onesignalPlayerId: string,
  exceptSessionId?: string,
): Promise<void> {
  await cancelPendingSessionsForPlayer(onesignalPlayerId, exceptSessionId);
}

export async function getPairingSessionByToken(
  token: string,
): Promise<PairingSession | null> {
  const client = requireClient();
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .select(
      'id, pairing_token, onesignal_player_id, device_label, status, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, paired_by_admin_id, created_at, expires_at, completed_at',
    )
    .eq('pairing_token', token)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, SESSIONS_TABLE)) {
      return null;
    }
    throwServiceError(error, 'Failed to load pairing session.');
  }

  return data ? mapSession(data as SessionRow) : null;
}

export async function getActiveLinkedDeviceByPlayerId(
  onesignalPlayerId: string,
): Promise<LinkedDevice | null> {
  if (!onesignalPlayerId) {
    return null;
  }

  const client = requireClient();
  const { data, error } = await client
    .from(DEVICES_TABLE)
    .select(
      'id, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, onesignal_player_id, device_label, status, paired_at, last_seen_at, paired_by_admin_id, replaced_at, removed_at',
    )
    .eq('onesignal_player_id', onesignalPlayerId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, DEVICES_TABLE)) {
      return null;
    }
    throwServiceError(error, 'Failed to load linked device.');
  }

  return data ? mapDevice(data as DeviceRow) : null;
}

export async function listLinkedDevices(): Promise<LinkedDevice[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(DEVICES_TABLE)
    .select(
      'id, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, onesignal_player_id, device_label, status, paired_at, last_seen_at, paired_by_admin_id, replaced_at, removed_at',
    )
    .order('paired_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error, DEVICES_TABLE)) {
      return [];
    }
    throwServiceError(error, 'Failed to load linked devices.');
  }

  return ((data ?? []) as DeviceRow[]).map(mapDevice);
}

export async function listActiveLinkedDevicesForEmployee(
  laundryEmployeeId: string,
): Promise<LinkedDevice[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(DEVICES_TABLE)
    .select(
      'id, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, onesignal_player_id, device_label, status, paired_at, last_seen_at, paired_by_admin_id, replaced_at, removed_at',
    )
    .eq('laundry_employee_id', laundryEmployeeId)
    .eq('status', 'active')
    .order('paired_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error, DEVICES_TABLE)) {
      return [];
    }
    throwServiceError(error, 'Failed to load employee devices.');
  }

  return ((data ?? []) as DeviceRow[]).map(mapDevice);
}

async function markEmployeeDevicesReplaced(
  laundryEmployeeId: string,
  exceptPlayerId?: string,
) {
  const client = requireClient();
  const now = new Date().toISOString();
  let query = client
    .from(DEVICES_TABLE)
    .update({
      status: 'replaced',
      replaced_at: now,
      updated_at: now,
    })
    .eq('laundry_employee_id', laundryEmployeeId)
    .eq('status', 'active');

  if (exceptPlayerId) {
    query = query.neq('onesignal_player_id', exceptPlayerId);
  }

  const { data, error } = await query.select('onesignal_player_id');
  if (error) {
    throwServiceError(error, 'Failed to replace existing devices.');
  }

  const playerIds = ((data ?? []) as { onesignal_player_id: string }[]).map(
    (row) => row.onesignal_player_id,
  );

  await Promise.all(
    playerIds.map((playerId) => removeOneSignalSubscriptionByPlayerId(playerId)),
  );
}

export async function pairDeviceFromSession(input: {
  actor: AuthUser;
  pairingToken: string;
  laundryEmployeeId: string;
  laundryEmployeeNameEn: string;
  laundryEmployeeNameAr: string;
  replaceExisting?: boolean;
}): Promise<LinkedDevice> {
  const log = (step: string, detail?: unknown) => {
    if (detail !== undefined) {
      console.info(`[device-pairing] ▶ ${step}`, detail);
      return;
    }
    console.info(`[device-pairing] ▶ ${step}`);
  };

  log('pair start', {
    laundryEmployeeId: input.laundryEmployeeId,
    replaceExisting: Boolean(input.replaceExisting),
    tokenPrefix: `${input.pairingToken.slice(0, 12)}…`,
  });

  await assertDevicePermission(input.actor.id, 'devices.manage', input.actor);
  log('permission OK', { actorId: input.actor.id });

  const client = requireClient();
  const { data: rpcData, error: rpcError } = await client.rpc(
    'pair_employee_device',
    {
      p_pairing_token: input.pairingToken,
      p_laundry_employee_id: input.laundryEmployeeId,
      p_laundry_employee_name_en: input.laundryEmployeeNameEn,
      p_laundry_employee_name_ar: input.laundryEmployeeNameAr,
      p_paired_by_admin_id: input.actor.id,
      p_replace_existing: Boolean(input.replaceExisting),
    },
  );

  if (rpcError) {
    log('RPC error', { code: rpcError.code, message: rpcError.message });
    const message = rpcError.message?.toLowerCase() ?? '';
    const missingRpc =
      rpcError.code === 'PGRST202' ||
      rpcError.code === '42883' ||
      message.includes('could not find the function') ||
      message.includes('pair_employee_device(text');

    if (!missingRpc) {
      throw new Error(rpcError.message || 'Failed to link employee device.');
    }

    log('RPC missing — falling back to legacy multi-step pair');
  } else {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    log('RPC response', {
      isArray: Array.isArray(rpcData),
      rowCount: Array.isArray(rpcData) ? rpcData.length : row ? 1 : 0,
      deviceId: row && typeof row === 'object' && 'id' in row ? row.id : null,
      playerId:
        row && typeof row === 'object' && 'onesignal_player_id' in row
          ? row.onesignal_player_id
          : null,
    });

    if (row && typeof row === 'object' && 'id' in row && row.id) {
      const linked = mapDevice(row as DeviceRow);
      log('pair complete via RPC', {
        deviceId: linked.id,
        playerId: linked.onesignalPlayerId,
        employeeId: linked.laundryEmployeeId,
      });
      return linked;
    }

    // RPC reported success but returned no row — verify DB before legacy.
    const session = await getPairingSessionByToken(input.pairingToken);
    log('RPC empty row — session check', {
      status: session?.status ?? null,
      playerId: session?.onesignalPlayerId ?? null,
    });
    if (session?.status === 'completed' && session.onesignalPlayerId) {
      const active = await getActiveLinkedDeviceByPlayerId(
        session.onesignalPlayerId,
      );
      if (active) {
        log('pair complete via post-RPC verify', { deviceId: active.id });
        return active;
      }
    }
    log('RPC did not persist link — falling back to legacy');
  }

  const legacy = await pairDeviceFromSessionLegacy(input);
  log('pair complete via legacy', {
    deviceId: legacy.id,
    playerId: legacy.onesignalPlayerId,
  });
  return legacy;
}

/** Legacy multi-step pair path — used when RPC migration is not applied yet. */
async function pairDeviceFromSessionLegacy(input: {
  actor: AuthUser;
  pairingToken: string;
  laundryEmployeeId: string;
  laundryEmployeeNameEn: string;
  laundryEmployeeNameAr: string;
  replaceExisting?: boolean;
}): Promise<LinkedDevice> {
  const session = await getPairingSessionByToken(input.pairingToken);
  if (!session) {
    throw new Error('Pairing code was not found.');
  }

  if (session.status === 'completed') {
    throw new Error('This pairing code was already used.');
  }

  if (session.status !== 'pending') {
    throw new Error('This pairing code is no longer valid.');
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    const client = requireClient();
    await client
      .from(SESSIONS_TABLE)
      .update({ status: 'expired' })
      .eq('id', session.id);
    throw new Error('This pairing code has expired.');
  }

  if (input.replaceExisting) {
    await markEmployeeDevicesReplaced(
      input.laundryEmployeeId,
      session.onesignalPlayerId,
    );
  } else {
    const existing = await listActiveLinkedDevicesForEmployee(
      input.laundryEmployeeId,
    );
    if (existing.length > 0) {
      throw new Error(
        'This employee already has a linked device. Choose replace to continue.',
      );
    }
  }

  // Drop any previous active link on this exact player id.
  const client = requireClient();
  const now = new Date().toISOString();
  await client
    .from(DEVICES_TABLE)
    .update({
      status: 'replaced',
      replaced_at: now,
      updated_at: now,
    })
    .eq('onesignal_player_id', session.onesignalPlayerId)
    .eq('status', 'active');

  const { data: deviceData, error: deviceError } = await client
    .from(DEVICES_TABLE)
    .upsert(
      {
        laundry_employee_id: input.laundryEmployeeId,
        laundry_employee_name_en: input.laundryEmployeeNameEn,
        laundry_employee_name_ar: input.laundryEmployeeNameAr,
        onesignal_player_id: session.onesignalPlayerId,
        device_label: session.deviceLabel,
        status: 'active',
        paired_at: now,
        last_seen_at: now,
        paired_by_admin_id: input.actor.id,
        replaced_at: null,
        removed_at: null,
        updated_at: now,
      },
      { onConflict: 'onesignal_player_id' },
    )
    .select(
      'id, laundry_employee_id, laundry_employee_name_en, laundry_employee_name_ar, onesignal_player_id, device_label, status, paired_at, last_seen_at, paired_by_admin_id, replaced_at, removed_at',
    )
    .single();

  if (deviceError) {
    throwServiceError(deviceError, 'Failed to link employee device.');
  }

  const { error: sessionError } = await client
    .from(SESSIONS_TABLE)
    .update({
      status: 'completed',
      laundry_employee_id: input.laundryEmployeeId,
      laundry_employee_name_en: input.laundryEmployeeNameEn,
      laundry_employee_name_ar: input.laundryEmployeeNameAr,
      paired_by_admin_id: input.actor.id,
      completed_at: now,
    })
    .eq('id', session.id)
    .eq('status', 'pending');

  if (sessionError) {
    throwServiceError(sessionError, 'Failed to complete pairing session.');
  }

  // Invalidate every other pending QR for this device after a successful link.
  await cancelPendingSessionsForPlayer(session.onesignalPlayerId, session.id);

  // Reuse existing OneSignal subscription store so shift push keeps working.
  await upsertOneSignalSubscription({
    employeeId: input.actor.id,
    onesignalPlayerId: session.onesignalPlayerId,
    device: session.deviceLabel,
    laundryEmployeeId: input.laundryEmployeeId,
  });

  return mapDevice(deviceData as DeviceRow);
}

export async function removeLinkedDevice(input: {
  actor: AuthUser;
  deviceId: string;
}): Promise<void> {
  await assertDevicePermission(input.actor.id, 'devices.manage', input.actor);

  const client = requireClient();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from(DEVICES_TABLE)
    .update({
      status: 'removed',
      removed_at: now,
      updated_at: now,
    })
    .eq('id', input.deviceId)
    .eq('status', 'active')
    .select('onesignal_player_id')
    .maybeSingle();

  if (error) {
    throwServiceError(error, 'Failed to remove linked device.');
  }

  const playerId = (data as { onesignal_player_id?: string } | null)
    ?.onesignal_player_id;
  if (playerId) {
    await removeOneSignalSubscriptionByPlayerId(playerId);
  }
}

export function subscribePairingSession(
  pairingToken: string,
  onChange: (session: PairingSession) => void,
) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const channel = client
    .channel(`pairing-session-${pairingToken}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: SESSIONS_TABLE,
        filter: `pairing_token=eq.${pairingToken}`,
      },
      (payload) => {
        if (payload.new) {
          onChange(mapSession(payload.new as SessionRow));
        }
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeLinkedDevices(onChange: () => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  // Unique channel name per subscriber so .on() is never called on an
  // already-subscribed channel (Sidebar + pairing page both use
  // useThisDeviceLinkStatus; admin devices page also subscribes).
  const channel = client
    .channel(`employee-linked-devices-v1:${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: DEVICES_TABLE },
      onChange,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
