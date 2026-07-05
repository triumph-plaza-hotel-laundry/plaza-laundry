-- Inventory management tables for Triumph Plaza Hotel Laundry

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'inventory_operation_type'
  ) THEN
    CREATE TYPE inventory_operation_type AS ENUM (
      'stock_in',
      'stock_out',
      'adjustment',
      'create',
      'delete'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_quantity INTEGER NOT NULL DEFAULT 10 CHECK (minimum_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'piece',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  performed_by TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL,
  operation inventory_operation_type NOT NULL,
  old_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  quantity_changed INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sort_order ON inventory_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_select ON inventory_items;
DROP POLICY IF EXISTS inventory_items_admin_write ON inventory_items;
DROP POLICY IF EXISTS inventory_movements_select ON inventory_movements;
DROP POLICY IF EXISTS inventory_movements_insert ON inventory_movements;

CREATE POLICY inventory_items_select ON inventory_items
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY inventory_items_admin_write ON inventory_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY inventory_movements_select ON inventory_movements
  FOR SELECT USING (true);

CREATE POLICY inventory_movements_insert ON inventory_movements
  FOR INSERT WITH CHECK (true);
