-- Speed up the primary inventory list query: active items ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_inventory_items_active_sort
  ON inventory_items (sort_order ASC)
  WHERE deleted_at IS NULL;
