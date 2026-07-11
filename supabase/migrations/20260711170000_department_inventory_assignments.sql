-- Links warehouse inventory_items to every department plan row (category slot).
-- Reversible: DROP TABLE department_inventory_assignments;

CREATE TABLE IF NOT EXISTS department_inventory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, item_key, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_department_inventory_assignments_department_item
  ON department_inventory_assignments (department_id, item_key);

CREATE INDEX IF NOT EXISTS idx_department_inventory_assignments_inventory_item_id
  ON department_inventory_assignments (inventory_item_id);

ALTER TABLE department_inventory_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_inventory_assignments_select ON department_inventory_assignments;
DROP POLICY IF EXISTS department_inventory_assignments_write ON department_inventory_assignments;

CREATE POLICY department_inventory_assignments_select ON department_inventory_assignments
  FOR SELECT USING (true);

CREATE POLICY department_inventory_assignments_write ON department_inventory_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Backfill: link every existing warehouse item to every plan category slot.
INSERT INTO department_inventory_assignments (department_id, item_key, inventory_item_id, sort_order)
SELECT
  c.department_id,
  c.item_key,
  i.id,
  COALESCE(i.sort_order, 0)
FROM department_item_categories c
CROSS JOIN inventory_items i
WHERE i.deleted_at IS NULL
ON CONFLICT (department_id, item_key, inventory_item_id) DO NOTHING;

-- Also cover slots that exist only in department_items (legacy variants) when categories are sparse.
INSERT INTO department_inventory_assignments (department_id, item_key, inventory_item_id, sort_order)
SELECT DISTINCT
  d.department_id,
  d.item_key,
  i.id,
  COALESCE(i.sort_order, 0)
FROM department_items d
CROSS JOIN inventory_items i
WHERE i.deleted_at IS NULL
  AND d.item_key IS NOT NULL
  AND btrim(d.item_key) <> ''
ON CONFLICT (department_id, item_key, inventory_item_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'department_inventory_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.department_inventory_assignments;
  END IF;
END $$;
