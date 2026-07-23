/** Shared constants for shift reminder scheduling (not a hardcoded send clock). */

/** Operational timezone used for wall-clock comparison and "tomorrow" math. */
export const SHIFT_REMINDER_TIMEZONE = 'Africa/Cairo';

/** Setting key in public.app_settings */
export const SHIFT_REMINDER_TIME_KEY = 'shift_reminder_time';

/** Manual Total Assets value on Hotel Employee Assets admin stats. */
export const HOTEL_ASSETS_TOTAL_KEY = 'hotel_assets_total_custody';

/**
 * Fallback only when the setting row is missing.
 * Production must persist the value in Supabase; this is not the runtime source of truth.
 */
export const DEFAULT_SHIFT_REMINDER_TIME = '22:00';

/** Initial Total Assets when no admin value has been saved yet. */
export const DEFAULT_HOTEL_ASSETS_TOTAL = '0';
