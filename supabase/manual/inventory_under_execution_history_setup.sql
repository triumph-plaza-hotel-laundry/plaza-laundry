-- Immutable History archive for Under Execution saves.
-- Safe to run in Supabase SQL Editor. App must INSERT only; never UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS inventory_under_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_under_execution_history_created_at
  ON inventory_under_execution_history (created_at DESC);

ALTER TABLE inventory_under_execution_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_under_execution_history_select
  ON inventory_under_execution_history;
DROP POLICY IF EXISTS inventory_under_execution_history_insert
  ON inventory_under_execution_history;

CREATE POLICY inventory_under_execution_history_select
  ON inventory_under_execution_history
  FOR SELECT USING (true);

CREATE POLICY inventory_under_execution_history_insert
  ON inventory_under_execution_history
  FOR INSERT WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inventory_under_execution_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.inventory_under_execution_history;
  END IF;
END $$;

INSERT INTO inventory_under_execution_history (
  supplier,
  supplier_name,
  item_code,
  item_name,
  quantity,
  date,
  created_at
)
SELECT
  supplier,
  supplier_name,
  item_code,
  item_name,
  quantity,
  date,
  created_at
FROM inventory_under_execution
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_under_execution_history LIMIT 1
);
