-- OneSignal web push subscriptions for authenticated staff (shift push infrastructure).
-- employee_id maps to admin_users.id (custom auth identity used at login).

CREATE TABLE IF NOT EXISTS onesignal_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT onesignal_subscriptions_player_unique UNIQUE (onesignal_player_id)
);

CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_employee_id
  ON onesignal_subscriptions (employee_id);

CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_updated_at
  ON onesignal_subscriptions (updated_at DESC);

ALTER TABLE onesignal_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onesignal_subscriptions_all ON onesignal_subscriptions;

CREATE POLICY onesignal_subscriptions_all ON onesignal_subscriptions
  FOR ALL USING (true) WITH CHECK (true);
