/** Legacy live subscription sync removed — no automatic player_id rewrite. */

export type SubscriptionChangePayload = {
  previousId: string | null;
  nextId: string;
  deviceLabel?: string;
  laundryEmployeeId?: string | null;
  adminEmployeeId?: string | null;
  primaryAdminDeviceId?: string | null;
};

export async function onSubscriptionIdChanged(_payload: SubscriptionChangePayload) {
  return { ok: true, skipped: true };
}

export function subscribePlatformSync(_onChange: () => void) {
  return () => {};
}

export function notifyPlatformSync() {
  // no-op
}
