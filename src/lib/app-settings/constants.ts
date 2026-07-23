/** Shared constants for shift reminder scheduling (not a hardcoded send clock). */

/** Operational timezone used for wall-clock comparison and "tomorrow" math. */
export const SHIFT_REMINDER_TIMEZONE = 'Africa/Cairo';

/** Setting key in public.app_settings */
export const SHIFT_REMINDER_TIME_KEY = 'shift_reminder_time';

/**
 * Fallback only when the setting row is missing.
 * Production must persist the value in Supabase; this is not the runtime source of truth.
 */
export const DEFAULT_SHIFT_REMINDER_TIME = '22:00';
