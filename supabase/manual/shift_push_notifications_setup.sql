-- Run in Supabase SQL Editor if npm run apply:push-notifications is unavailable.
-- Creates push notification history + employee mapping columns for OneSignal delivery.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS laundry_employee_id TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_users_laundry_employee_id
  ON admin_users (laundry_employee_id)
  WHERE laundry_employee_id IS NOT NULL;

ALTER TABLE onesignal_subscriptions
  ADD COLUMN IF NOT EXISTS laundry_employee_id TEXT;

CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_laundry_employee_id
  ON onesignal_subscriptions (laundry_employee_id)
  WHERE laundry_employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS push_notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('shift_reminder', 'shift_manual')),
  target_date DATE NOT NULL,
  laundry_employee_id TEXT,
  employee_name_en TEXT,
  employee_name_ar TEXT,
  admin_user_id TEXT REFERENCES admin_users (id) ON DELETE SET NULL,
  onesignal_player_id TEXT,
  title_en TEXT NOT NULL,
  body_en TEXT NOT NULL,
  shift_period TEXT,
  shift_role TEXT,
  department_en TEXT,
  start_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  audience TEXT NOT NULL DEFAULT 'shift_tomorrow',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_notification_history_cron_dedupe
  ON push_notification_history (type, target_date, laundry_employee_id, onesignal_player_id)
  WHERE type = 'shift_reminder' AND triggered_by = 'cron';

CREATE INDEX IF NOT EXISTS idx_push_notification_history_target_date
  ON push_notification_history (target_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_notification_history_status
  ON push_notification_history (status, created_at DESC);

ALTER TABLE push_notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_notification_history_all ON push_notification_history;

CREATE POLICY push_notification_history_all ON push_notification_history
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_notification_history TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
