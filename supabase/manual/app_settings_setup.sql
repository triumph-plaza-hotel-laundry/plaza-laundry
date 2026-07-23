-- Manual twin of 20260723120000_app_settings_shift_reminder_time.sql
-- Run in Supabase SQL Editor if migrations cannot be applied via CLI.

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_not_blank CHECK (length(trim(key)) > 0),
  CONSTRAINT app_settings_value_not_blank CHECK (length(trim(value)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
  ON app_settings (updated_at DESC);

INSERT INTO app_settings (key, value, updated_at)
VALUES ('shift_reminder_time', '22:00', now())
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select ON app_settings;
DROP POLICY IF EXISTS app_settings_insert ON app_settings;
DROP POLICY IF EXISTS app_settings_update ON app_settings;
DROP POLICY IF EXISTS app_settings_delete ON app_settings;
DROP POLICY IF EXISTS app_settings_all ON app_settings;

CREATE POLICY app_settings_select ON app_settings
  FOR SELECT USING (true);

CREATE POLICY app_settings_insert ON app_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY app_settings_update ON app_settings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY app_settings_delete ON app_settings
  FOR DELETE USING (true);
