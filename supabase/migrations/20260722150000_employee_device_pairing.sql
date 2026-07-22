-- Isolated employee device pairing + admin grant for device management.
-- Does not alter existing business tables.

CREATE TABLE IF NOT EXISTS admin_device_permissions (
  user_id TEXT NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('devices.manage')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_device_permissions_user_id
  ON admin_device_permissions (user_id);

ALTER TABLE admin_device_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_device_permissions_select ON admin_device_permissions;
DROP POLICY IF EXISTS admin_device_permissions_write ON admin_device_permissions;

CREATE POLICY admin_device_permissions_select ON admin_device_permissions
  FOR SELECT USING (true);

CREATE POLICY admin_device_permissions_write ON admin_device_permissions
  FOR ALL USING (true) WITH CHECK (true);

-- Seed primary / super-admin style roles with device management.
INSERT INTO admin_device_permissions (user_id, permission)
SELECT u.id, 'devices.manage'
FROM admin_users u
WHERE u.role IN ('OWNER', 'SUPER_ADMIN')
ON CONFLICT (user_id, permission) DO NOTHING;

CREATE TABLE IF NOT EXISTS employee_device_pairing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_token TEXT NOT NULL,
  onesignal_player_id TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  laundry_employee_id TEXT,
  laundry_employee_name_en TEXT,
  laundry_employee_name_ar TEXT,
  paired_by_admin_id TEXT REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  CONSTRAINT employee_device_pairing_sessions_token_unique UNIQUE (pairing_token)
);

CREATE INDEX IF NOT EXISTS idx_employee_device_pairing_sessions_token
  ON employee_device_pairing_sessions (pairing_token);

CREATE INDEX IF NOT EXISTS idx_employee_device_pairing_sessions_player
  ON employee_device_pairing_sessions (onesignal_player_id);

CREATE INDEX IF NOT EXISTS idx_employee_device_pairing_sessions_status
  ON employee_device_pairing_sessions (status);

ALTER TABLE employee_device_pairing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_device_pairing_sessions_all
  ON employee_device_pairing_sessions;

CREATE POLICY employee_device_pairing_sessions_all
  ON employee_device_pairing_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS employee_linked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_employee_id TEXT NOT NULL,
  laundry_employee_name_en TEXT,
  laundry_employee_name_ar TEXT,
  onesignal_player_id TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'removed')),
  paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paired_by_admin_id TEXT REFERENCES admin_users (id) ON DELETE SET NULL,
  replaced_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_linked_devices_player_unique UNIQUE (onesignal_player_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_linked_devices_employee
  ON employee_linked_devices (laundry_employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_linked_devices_status
  ON employee_linked_devices (status);

CREATE INDEX IF NOT EXISTS idx_employee_linked_devices_paired_at
  ON employee_linked_devices (paired_at DESC);

ALTER TABLE employee_linked_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_linked_devices_all ON employee_linked_devices;

CREATE POLICY employee_linked_devices_all ON employee_linked_devices
  FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_device_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_device_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'employee_device_pairing_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_device_pairing_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'employee_linked_devices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_linked_devices;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
