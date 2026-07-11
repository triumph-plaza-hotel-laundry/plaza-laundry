-- Run in Supabase SQL Editor (inventory permissions + disabled_at only)

-- Inventory item enable/disable + database-backed admin permissions (additive only)

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inventory_items_disabled_at
  ON inventory_items (disabled_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_inventory_permissions (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN (
    'inventory.add',
    'inventory.edit',
    'inventory.enable_disable',
    'inventory.delete'
  )),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_inventory_permissions_user_id
  ON admin_inventory_permissions (user_id);

ALTER TABLE admin_inventory_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_inventory_permissions_select ON admin_inventory_permissions;
DROP POLICY IF EXISTS admin_inventory_permissions_write ON admin_inventory_permissions;

CREATE POLICY admin_inventory_permissions_select ON admin_inventory_permissions
  FOR SELECT USING (true);

CREATE POLICY admin_inventory_permissions_write ON admin_inventory_permissions
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO admin_inventory_permissions (user_id, permission)
SELECT u.id, seed.permission
FROM admin_users u
CROSS JOIN (
  VALUES
    ('inventory.add'),
    ('inventory.edit'),
    ('inventory.enable_disable'),
    ('inventory.delete')
) AS seed(permission)
WHERE u.role IN ('OWNER', 'SUPER_ADMIN')
ON CONFLICT (user_id, permission) DO NOTHING;

INSERT INTO admin_inventory_permissions (user_id, permission)
SELECT u.id, seed.permission
FROM admin_users u
CROSS JOIN (
  VALUES
    ('inventory.add'),
    ('inventory.edit'),
    ('inventory.enable_disable')
) AS seed(permission)
WHERE u.role = 'ADMIN'
ON CONFLICT (user_id, permission) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_inventory_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_inventory_permissions;
  END IF;
END $$;
