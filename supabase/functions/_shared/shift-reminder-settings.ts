/** Deno helpers for dynamic shift reminder send time (mirrors src/lib/app-settings). */

export const SHIFT_REMINDER_TIMEZONE = 'Africa/Cairo';
export const SHIFT_REMINDER_TIME_KEY = 'shift_reminder_time';
export const DEFAULT_SHIFT_REMINDER_TIME = '22:00';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeShiftReminderTime(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!HH_MM_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function resolveShiftReminderTime(value: unknown): string {
  return normalizeShiftReminderTime(value) ?? DEFAULT_SHIFT_REMINDER_TIME;
}

export function getCairoTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHIFT_REMINDER_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0,
  );
  return { hour, minute };
}

export function getCairoHHMM(date = new Date()): string {
  const { hour, minute } = getCairoTimeParts(date);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isWithinShiftReminderSendWindow(
  configuredHHMM: string,
  now = new Date(),
): boolean {
  const configured = normalizeShiftReminderTime(configuredHHMM);
  if (!configured) {
    return false;
  }
  const [cfgHour, cfgMinute] = configured.split(':').map(Number);
  const { hour, minute } = getCairoTimeParts(now);
  const nowTotal = hour * 60 + minute;
  const cfgTotal = cfgHour * 60 + cfgMinute;
  const delta = nowTotal - cfgTotal;
  return delta >= 0 && delta < 5;
}

export async function loadShiftReminderTime(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<string> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SHIFT_REMINDER_TIME_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load shift_reminder_time: ${error.message}`);
  }

  const normalized = normalizeShiftReminderTime(data?.value);
  if (normalized) {
    return normalized;
  }

  const { error: upsertError } = await supabase.from('app_settings').upsert(
    {
      key: SHIFT_REMINDER_TIME_KEY,
      value: DEFAULT_SHIFT_REMINDER_TIME,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (upsertError) {
    console.error(
      '[shift-reminder] failed to seed shift_reminder_time',
      upsertError.message,
    );
  }

  return DEFAULT_SHIFT_REMINDER_TIME;
}
