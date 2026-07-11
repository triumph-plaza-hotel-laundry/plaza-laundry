-- Department-scoped inventory plan items (admin-managed catalog)

CREATE TABLE IF NOT EXISTS department_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_department_items_department_id
  ON department_items (department_id);

CREATE INDEX IF NOT EXISTS idx_department_items_sort_order
  ON department_items (department_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_department_items_item_name
  ON department_items (item_name);

ALTER TABLE department_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_items_select ON department_items;
DROP POLICY IF EXISTS department_items_write ON department_items;

CREATE POLICY department_items_select ON department_items
  FOR SELECT USING (true);

CREATE POLICY department_items_write ON department_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_department_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_department_items_updated_at ON department_items;

CREATE TRIGGER trg_touch_department_items_updated_at
  BEFORE UPDATE ON department_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_department_items_updated_at();
