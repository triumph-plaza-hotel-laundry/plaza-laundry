-- Global application settings (key/value).
-- Single source of truth for configurable runtime values such as shift reminder send time.

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_not_blank CHECK (length(trim(key)) > 0),
  CONSTRAINT app_settings_value_not_blank CHECK (length(trim(value)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
  ON app_settings (updated_at DESC);

-- Default shift reminder send time (HH:mm, Africa/Cairo wall clock).
INSERT INTO app_settings (key, value, updated_at)
VALUES ('shift_reminder_time', '22:00', now())
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select ON app_settings;
DROP POLICY IF EXISTS app_settings_insert ON app_settings;
DROP POLICY IF EXISTS app_settings_update ON app_settings;
DROP POLICY IF EXISTS app_settings_delete ON app_settings;
DROP POLICY IF EXISTS app_settings_all ON app_settings;

-- App uses custom admin auth (anon key from Owner dashboard), matching other
-- admin-managed tables. Service role (edge function) bypasses RLS.
CREATE POLICY app_settings_select ON app_settings
  FOR SELECT USING (true);

CREATE POLICY app_settings_insert ON app_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY app_settings_update ON app_settings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY app_settings_delete ON app_settings
  FOR DELETE USING (true);

COMMENT ON TABLE app_settings IS
  'Persistent application settings. shift_reminder_time is HH:mm (Africa/Cairo).';

COMMENT ON COLUMN app_settings.key IS 'Setting identifier, e.g. shift_reminder_time';
COMMENT ON COLUMN app_settings.value IS 'Setting value; shift_reminder_time uses HH:mm';
