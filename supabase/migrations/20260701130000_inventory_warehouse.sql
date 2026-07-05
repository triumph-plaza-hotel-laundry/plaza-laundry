-- Warehouse inventory upgrade: incoming / issued / remaining quantities + movement metadata

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS incoming_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS issued_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS remaining_quantity INTEGER;

UPDATE inventory_items
SET
  incoming_quantity = COALESCE(incoming_quantity, quantity, 0),
  issued_quantity = COALESCE(issued_quantity, 0),
  remaining_quantity = COALESCE(remaining_quantity, quantity, 0)
WHERE incoming_quantity IS NULL OR issued_quantity IS NULL OR remaining_quantity IS NULL;

DO $$
BEGIN
  ALTER TABLE inventory_items
    ALTER COLUMN incoming_quantity SET DEFAULT 0,
    ALTER COLUMN issued_quantity SET DEFAULT 0,
    ALTER COLUMN remaining_quantity SET DEFAULT 0;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_items'
      AND column_name = 'incoming_quantity'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE inventory_items
      ALTER COLUMN incoming_quantity SET NOT NULL,
      ALTER COLUMN issued_quantity SET NOT NULL,
      ALTER COLUMN remaining_quantity SET NOT NULL;
  END IF;
END $$;

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS employee_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employee_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';

UPDATE inventory_movements
SET employee_name = COALESCE(NULLIF(employee_name, ''), performed_by, '')
WHERE employee_name = '';
