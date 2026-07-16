-- Manual setup: Under Execution table for Admin Inventory Management
-- Safe to run in Supabase SQL Editor. Does NOT modify inventory_items.

CREATE TABLE IF NOT EXISTS inventory_under_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_under_execution_created_at
  ON inventory_under_execution (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_under_execution_date
  ON inventory_under_execution (date DESC);

ALTER TABLE inventory_under_execution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_under_execution_select ON inventory_under_execution;
DROP POLICY IF EXISTS inventory_under_execution_write ON inventory_under_execution;

CREATE POLICY inventory_under_execution_select ON inventory_under_execution
  FOR SELECT USING (true);

CREATE POLICY inventory_under_execution_write ON inventory_under_execution
  FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inventory_under_execution'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_under_execution;
  END IF;
END $$;
