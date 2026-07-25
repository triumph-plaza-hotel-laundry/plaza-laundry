/**
 * Compatibility shim for removed legacy pairing service.
 * Prefer @/features/notifications/devices and @/features/notifications/pairing.
 */
import {
  getActiveDeviceByPlayerId,
  listActiveDevices,
  unlinkDevice,
  subscribeDevices,
} from '@/features/notifications/devices';

export const PAIRING_PAYLOAD_TYPE = 'tpl-notification-link-v1';
export const PAIRING_SESSION_TTL_MS = 15 * 60 * 1000;

export type LinkedDevice = {
  id: string;
  laundryEmployeeId: string;
  laundryEmployeeNameEn: string | null;
  laundryEmployeeNameAr: string | null;
  onesignalPlayerId: string;
  deviceLabel: string;
  status: 'active' | 'replaced' | 'removed';
  pairedAt: string;
  lastSeenAt: string;
  pairedByAdminId: string | null;
  replacedAt: string | null;
  removedAt: string | null;
};

export async function listLinkedDevices(): Promise<LinkedDevice[]> {
  const devices = await listActiveDevices();
  return devices.map((d) => ({
    id: d.id,
    laundryEmployeeId: d.employeeId,
    laundryEmployeeNameEn: null,
    laundryEmployeeNameAr: null,
    onesignalPlayerId: d.playerId,
    deviceLabel: d.deviceName || d.deviceId,
    status: 'active' as const,
    pairedAt: d.linkedAt,
    lastSeenAt: d.updatedAt,
    pairedByAdminId: null,
    replacedAt: null,
    removedAt: null,
  }));
}

export async function getActiveLinkedDeviceByPlayerId(playerId: string) {
  const d = await getActiveDeviceByPlayerId(playerId);
  if (!d) return null;
  return {
    id: d.id,
    laundryEmployeeId: d.employeeId,
    laundryEmployeeNameEn: null,
    laundryEmployeeNameAr: null,
    onesignalPlayerId: d.playerId,
    deviceLabel: d.deviceName || d.deviceId,
    status: 'active' as const,
    pairedAt: d.linkedAt,
    lastSeenAt: d.updatedAt,
    pairedByAdminId: null,
    replacedAt: null,
    removedAt: null,
  };
}

export async function removeLinkedDevice(
  employeeId: string,
  _admin?: unknown,
) {
  return unlinkDevice(employeeId);
}

export function subscribeLinkedDevices(onChange: () => void) {
  return subscribeDevices(onChange);
}

export function encodePairingPayload(token: string) {
  return JSON.stringify({ v: 1, type: PAIRING_PAYLOAD_TYPE, token });
}

export function parsePairingPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { v?: number; type?: string; token?: string };
    if (parsed?.token) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export async function createPairingSession(): Promise<never> {
  throw new Error('Legacy pairing sessions removed. Use Admin Generate QR.');
}

export async function ensureFreshPairingSession(): Promise<never> {
  throw new Error('Legacy pairing sessions removed. Use Admin Generate QR.');
}

export async function cancelPendingPairingSessionsForPlayer() {
  return;
}

export async function pairDeviceFromSession(): Promise<never> {
  throw new Error('Legacy admin scan pairing removed. Admin shows QR; phone claims.');
}

export async function getPairingSessionByToken(): Promise<null> {
  return null;
}

export function subscribePairingSession() {
  return () => {};
}
