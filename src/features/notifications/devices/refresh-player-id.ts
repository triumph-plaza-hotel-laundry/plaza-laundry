import { requireSupabase } from '@/features/notifications/shared/supabase';
import {
  readLocalDeviceLink,
  writeLocalDeviceLink,
} from '@/features/notifications/pairing/local-device-link';

/**
 * When OneSignal rotates the Player ID on an already-linked device,
 * UPDATE the existing active row — never create a duplicate or re-pair.
 */
export async function refreshLinkedPlayerId(input: {
  newPlayerId: string;
  previousPlayerId?: string | null;
}): Promise<boolean> {
  const link = readLocalDeviceLink();
  if (!link?.linked || !link.laundryEmployeeId) {
    return false;
  }

  const newId = input.newPlayerId.trim();
  const expected =
    input.previousPlayerId?.trim() || link.onesignalPlayerId?.trim() || '';
  if (!newId || !expected) {
    return false;
  }

  if (link.onesignalPlayerId === newId) {
    return true;
  }

  // Ownership proof: local cache must still believe it owned `expected`.
  if (link.onesignalPlayerId && link.onesignalPlayerId !== expected) {
    console.warn(
      '[notifications] refresh refused — local player_id is not the expected prior id',
    );
    return false;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('refresh_notification_player_id', {
    p_employee_id: link.laundryEmployeeId,
    p_new_player_id: newId,
    p_expected_player_id: expected,
  });

  if (error) {
    console.warn('[notifications] player_id refresh failed', error.message);
    return false;
  }

  if (!data) {
    return false;
  }

  writeLocalDeviceLink({
    ...link,
    onesignalPlayerId: newId,
  });
  return true;
}
