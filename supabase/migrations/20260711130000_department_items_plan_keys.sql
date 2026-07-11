-- Add plan slot linkage for backward-compatible row IDs (departmentId-itemKey)

ALTER TABLE department_items
  ADD COLUMN IF NOT EXISTS item_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS variant_key TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_department_items_item_key
  ON department_items (department_id, item_key);

CREATE INDEX IF NOT EXISTS idx_department_items_variant_key
  ON department_items (variant_key);
