import {
  DEFAULT_SHIFT_REMINDER_TIME,
  SHIFT_REMINDER_TIMEZONE,
} from '@/lib/app-settings/constants';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidShiftReminderTime(value: string): boolean {
  return HH_MM_PATTERN.test(value.trim());
}

/** Normalize to HH:mm or return null if invalid. */
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

/**
 * True when Cairo local time is at the configured minute, or up to 4 minutes after
 * (covers delayed cron ticks). History dedupe prevents duplicate sends.
 */
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
