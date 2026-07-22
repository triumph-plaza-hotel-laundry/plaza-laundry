-- One-time primary admin device registration (singleton).
-- Isolated from employee device pairing tables.

CREATE TABLE IF NOT EXISTS primary_admin_device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Forces at most one registered primary admin device.
  singleton BOOLEAN NOT NULL DEFAULT true CHECK (singleton = true),
  device_id TEXT NOT NULL,
  onesignal_subscription_id TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_by_admin_id TEXT REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT primary_admin_device_singleton_unique UNIQUE (singleton),
  CONSTRAINT primary_admin_device_device_id_unique UNIQUE (device_id),
  CONSTRAINT primary_admin_device_subscription_unique UNIQUE (onesignal_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_primary_admin_device_registered_at
  ON primary_admin_device (registered_at DESC);

ALTER TABLE primary_admin_device ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS primary_admin_device_select ON primary_admin_device;
DROP POLICY IF EXISTS primary_admin_device_write ON primary_admin_device;

CREATE POLICY primary_admin_device_select ON primary_admin_device
  FOR SELECT USING (true);

CREATE POLICY primary_admin_device_write ON primary_admin_device
  FOR INSERT WITH CHECK (true);

-- No UPDATE/DELETE policies: registration is permanent once set.

NOTIFY pgrst, 'reload schema';
