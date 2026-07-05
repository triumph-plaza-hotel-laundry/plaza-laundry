-- Triumph Plaza Hotel Laundry — Professional Inventory Management v2

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS total_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE inventory_items
SET
  name = COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(name_ar), ''), NULLIF(TRIM(name_en), ''), code),
  total_quantity = COALESCE(total_quantity, incoming_quantity, quantity, 0),
  issued_quantity = COALESCE(issued_quantity, 0),
  remaining_quantity = COALESCE(
    remaining_quantity,
    COALESCE(total_quantity, incoming_quantity, quantity, 0) - COALESCE(issued_quantity, 0),
    0
  ),
  updated_at = COALESCE(updated_at, last_updated_at, created_at, now())
WHERE deleted_at IS NULL;

ALTER TABLE inventory_items
  ALTER COLUMN total_quantity SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE TABLE IF NOT EXISTS inventory_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  supplier TEXT NOT NULL DEFAULT '',
  receiver TEXT NOT NULL DEFAULT '',
  employee TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  employee TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_updated_at ON inventory_items(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_code_unique
  ON inventory_items(code)
  WHERE deleted_at IS NULL AND code <> '';

CREATE INDEX IF NOT EXISTS idx_inventory_receipts_item_id ON inventory_receipts(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_receipts_created_at ON inventory_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_issues_item_id ON inventory_issues(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_issues_created_at ON inventory_issues(created_at DESC);

ALTER TABLE inventory_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_receipts_select ON inventory_receipts;
DROP POLICY IF EXISTS inventory_receipts_admin_write ON inventory_receipts;
DROP POLICY IF EXISTS inventory_issues_select ON inventory_issues;
DROP POLICY IF EXISTS inventory_issues_admin_write ON inventory_issues;

CREATE POLICY inventory_receipts_select ON inventory_receipts
  FOR SELECT USING (true);

CREATE POLICY inventory_receipts_admin_write ON inventory_receipts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY inventory_issues_select ON inventory_issues
  FOR SELECT USING (true);

CREATE POLICY inventory_issues_admin_write ON inventory_issues
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sync_inventory_item_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.remaining_quantity := GREATEST(NEW.total_quantity - NEW.issued_quantity, 0);
  NEW.incoming_quantity := NEW.total_quantity;
  NEW.quantity := NEW.remaining_quantity;
  NEW.updated_at := now();
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_item_quantities ON inventory_items;

CREATE TRIGGER trg_sync_inventory_item_quantities
  BEFORE INSERT OR UPDATE OF total_quantity, issued_quantity
  ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_item_quantities();

-- Official seed items (codes and Arabic names from hotel inventory list)
INSERT INTO inventory_items (code, name, name_ar, name_en, total_quantity, issued_quantity, remaining_quantity, minimum_quantity, unit, notes, sort_order)
SELECT v.code, v.name, v.name, v.name, 0, 0, 0, 0, 'piece', '', v.sort_order
FROM (
  VALUES
    ('5701091', 'بدلة رجالي', 1),
    ('5701090', 'بدلة حريمي', 2),
    ('5701034 / 5701035', 'بنطلون رجالي', 3),
    ('5701036', 'بنطلون رجالي أبيض', 4),
    ('5701032', 'بنطلون حريمي', 5),
    ('5701087', 'جاكيت أمن', 6),
    ('', 'جاكيت مخازن', 7),
    ('5701016', 'جاكيت مطبخ رجالي', 8),
    ('5701062 / 5701109', 'جاكيت مطبخ مساعد شيف', 9),
    ('5701015', 'جاكيت مطبخ حريمي', 10),
    ('5701099', 'بنطلون حريمي', 11),
    ('5701007', 'قميص أبيض', 12),
    ('5701010', 'قميص أمن (أزرق)', 13),
    ('5701097', 'بلوزة', 14),
    ('5701073 / 5701055', 'تيشيرت مغسلة', 15),
    ('5701039', 'تيشيرت مغسلة نص كم', 16),
    ('5701061', 'تيشيرت استيوارد', 17),
    ('5701095', 'طقم مطعم رئيسي', 18),
    ('5701108', 'طقم مطعم لبناني', 19),
    ('5701084 / 5701083', 'قميص لبناني / بنطلون لبناني', 20),
    ('5701094', 'طقم كوفي شوب', 21),
    ('5701098', 'طقم روم سيرفيس', 22),
    ('5701101', 'طقم استيوارد مشرفين', 23),
    ('5701060', 'طقم استيوارد عمال', 24),
    ('5701076', 'طقم كافتريا', 25),
    ('5701105', 'طقم هاوس مشرف', 26),
    ('5701078', 'طقم هاوس عمال رجالي', 27),
    ('5701079', 'طقم هاوس عمال حريمي', 28),
    ('5701104', 'طقم صيانة مشرفين', 29),
    ('5701038', 'طقم صيانة عمال', 30),
    ('5701041', 'طقم زراعة', 31),
    ('5701030', 'طقم بلمان', 32),
    ('5701110', 'طقم أمن صناعي', 33),
    ('5701111', 'طقم مخازن', 34),
    ('5701018', 'كرافتة', 35),
    ('5701002 / 5701037', 'إبرون أسود / أبيض', 36),
    ('5701003', 'مريلة استيوارد', 37),
    ('5701096 / 5701013', 'جلبية (صديري رجالي / حريمي)', 38),
    ('5701019', 'تيبونة', 39),
    ('5701088 / 5701107', 'تلبيسة رأس', 40),
    ('5701020 / 5701051', 'بلوفر كم', 41)
) AS v(code, name, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_items existing
  WHERE existing.deleted_at IS NULL
    AND (
      (v.code <> '' AND existing.code = v.code)
      OR (v.code = '' AND existing.name = v.name)
    )
);
