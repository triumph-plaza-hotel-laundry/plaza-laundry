import { getSupabaseClient } from '@/lib/supabase/client';
import {
  DEFAULT_HOTEL_ASSETS_TOTAL,
  DEFAULT_SHIFT_REMINDER_TIME,
  HOTEL_ASSETS_TOTAL_KEY,
  SHIFT_REMINDER_TIME_KEY,
} from '@/lib/app-settings/constants';
import {
  isValidShiftReminderTime,
  normalizeShiftReminderTime,
  resolveShiftReminderTime,
} from '@/lib/app-settings/shift-reminder-time';

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export async function getAppSetting(key: string): Promise<string | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.value === 'string' ? data.value : null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('app_settings').upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) {
    throw error;
  }
}

/**
 * Reads shift_reminder_time from Supabase.
 * Seeds the default row when missing, then returns HH:mm.
 */
export async function getShiftReminderTime(): Promise<string> {
  try {
    const raw = await getAppSetting(SHIFT_REMINDER_TIME_KEY);
    const normalized = normalizeShiftReminderTime(raw);
    if (normalized) {
      return normalized;
    }

    await setAppSetting(SHIFT_REMINDER_TIME_KEY, DEFAULT_SHIFT_REMINDER_TIME);
    return DEFAULT_SHIFT_REMINDER_TIME;
  } catch {
    return DEFAULT_SHIFT_REMINDER_TIME;
  }
}

export async function setShiftReminderTime(next: string): Promise<string> {
  const normalized = normalizeShiftReminderTime(next);
  if (!normalized || !isValidShiftReminderTime(normalized)) {
    throw new Error('Invalid time. Use HH:mm (00:00–23:59).');
  }

  await setAppSetting(SHIFT_REMINDER_TIME_KEY, normalized);
  return normalized;
}

function normalizeHotelAssetsTotal(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === '') {
    return 0;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

/** Manual Total Assets for Hotel Employee Assets (defaults to 0). */
export async function getHotelAssetsTotal(): Promise<number> {
  try {
    const raw = await getAppSetting(HOTEL_ASSETS_TOTAL_KEY);
    if (raw == null) {
      return Number(DEFAULT_HOTEL_ASSETS_TOTAL);
    }
    return normalizeHotelAssetsTotal(raw);
  } catch {
    return Number(DEFAULT_HOTEL_ASSETS_TOTAL);
  }
}

export async function setHotelAssetsTotal(next: number): Promise<number> {
  const safe = Math.max(0, Math.floor(Number(next) || 0));
  await setAppSetting(HOTEL_ASSETS_TOTAL_KEY, String(safe));
  return safe;
}

export {
  resolveShiftReminderTime,
  SHIFT_REMINDER_TIME_KEY,
  HOTEL_ASSETS_TOTAL_KEY,
};
