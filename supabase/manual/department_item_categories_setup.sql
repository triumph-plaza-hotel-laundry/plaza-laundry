-- Run in Supabase SQL Editor (categories-only migration)

-- Custom and renamed item categories per department (plan dropdown row sources)

CREATE TABLE IF NOT EXISTS department_item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  category_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_department_item_categories_department_id
  ON department_item_categories (department_id);

CREATE INDEX IF NOT EXISTS idx_department_item_categories_sort_order
  ON department_item_categories (department_id, sort_order);

ALTER TABLE department_item_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_item_categories_select ON department_item_categories;
DROP POLICY IF EXISTS department_item_categories_write ON department_item_categories;

CREATE POLICY department_item_categories_select ON department_item_categories
  FOR SELECT USING (true);

CREATE POLICY department_item_categories_write ON department_item_categories
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_department_item_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_department_item_categories_updated_at ON department_item_categories;

CREATE TRIGGER trg_touch_department_item_categories_updated_at
  BEFORE UPDATE ON department_item_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_department_item_categories_updated_at();

-- Seed built-in category rows (Arabic labels) for every department plan slot.
INSERT INTO department_item_categories (department_id, item_key, category_name, sort_order)
SELECT department_id, item_key, category_name, sort_order
FROM (VALUES
  ('directors', 'suit', 'بدلة', 0),
  ('directors', 'shirt', 'قميص', 1),
  ('directors', 'tie', 'كرافت', 2),
  ('frontOffice', 'suit', 'بدلة', 0),
  ('frontOffice', 'womens', 'بدلة حريمي', 1),
  ('frontOffice', 'balman', 'بدلة بلمان', 2),
  ('frontOffice', 'shirt', 'قميص', 3),
  ('frontOffice', 'blouse', 'بلوزة', 4),
  ('frontOffice', 'tie', 'كرافت', 5),
  ('personnelAffairs', 'suit', 'بدلة', 0),
  ('personnelAffairs', 'shirt', 'قميص', 1),
  ('personnelAffairs', 'tie', 'كرافت', 2),
  ('informationTechnology', 'suit', 'بدلة', 0),
  ('informationTechnology', 'shirt', 'قميص', 1),
  ('informationTechnology', 'tie', 'كرافت', 2),
  ('audioEngineering', 'suit', 'بدلة', 0),
  ('audioEngineering', 'shirt', 'قميص', 1),
  ('audioEngineering', 'tie', 'كرافت', 2),
  ('sales', 'suit', 'بدلة', 0),
  ('sales', 'womens', 'بدلة حريمي', 1),
  ('sales', 'shirt', 'قميص', 2),
  ('sales', 'blouse', 'بلوزة', 3),
  ('sales', 'tie', 'كرافت', 4),
  ('publicRelations', 'suit', 'بدلة', 0),
  ('publicRelations', 'shirt', 'قميص', 1),
  ('publicRelations', 'tie', 'كرافت', 2),
  ('driversSecretariat', 'suit', 'بدلة', 0),
  ('driversSecretariat', 'shirt', 'قميص', 1),
  ('driversSecretariat', 'tie', 'كرافت', 2),
  ('accounts', 'suit', 'بدلة', 0),
  ('accounts', 'shirt', 'قميص', 1),
  ('accounts', 'tie', 'كرافت', 2),
  ('accounts', 'pants', 'بنطلون', 3),
  ('accounts', 'tshirt', 'تيشرت', 4),
  ('accounts', 'tshirt2', 'تيشرت', 5),
  ('accounts', 'jacket', 'جاكت', 6),
  ('foodBeverageBanquets', 'suit', 'بدلة', 0),
  ('foodBeverageBanquets', 'shirt', 'قميص', 1),
  ('foodBeverageBanquets', 'shirt2', 'قميص', 2),
  ('foodBeverageBanquets', 'tie', 'كرافت', 3),
  ('foodBeverageBanquets', 'pants', 'بنطلون', 4),
  ('foodBeverageBanquets', 'apron', 'أبرون', 5),
  ('foodBeverageBanquets', 'apron2', 'أبرون', 6),
  ('foodBeverageBanquets', 'jacket', 'جاكت', 7),
  ('security', 'suit', 'بدلة', 0),
  ('security', 'suit2', 'بدلة', 1),
  ('security', 'shirt', 'قميص', 2),
  ('security', 'shirt2', 'قميص', 3),
  ('security', 'shirt3', 'قميص', 4),
  ('security', 'pants', 'بنطلون', 5),
  ('security', 'jacket', 'جاكت', 6),
  ('security', 'tie', 'كرافت', 7),
  ('security', 'coat', 'بالطو', 8),
  ('housekeeping', 'suit', 'بدلة', 0),
  ('housekeeping', 'suit2', 'بدلة', 1),
  ('housekeeping', 'shirt', 'قميص', 2),
  ('housekeeping', 'shirt2', 'قميص', 3),
  ('housekeeping', 'shirt3', 'قميص', 4),
  ('housekeeping', 'hkKit', 'طقم HK', 5),
  ('housekeeping', 'hkKit2', 'طقم HK', 6),
  ('housekeeping', 'pants', 'بنطلون', 7),
  ('housekeeping', 'tie', 'كرافت', 8),
  ('housekeeping', 'headCover', 'تلبيسة رأس', 9),
  ('kitchen', 'kitchenJacket', 'جاكت مطبخ', 0),
  ('kitchen', 'kitchenJacket2', 'جاكت مطبخ', 1),
  ('kitchen', 'kitchenJacket3', 'جاكت مطبخ', 2),
  ('kitchen', 'apron', 'أبرون', 3),
  ('kitchen', 'apron2', 'أبرون', 4),
  ('kitchen', 'pants', 'بنطلون', 5),
  ('kitchen', 'pants2', 'بنطلون', 6),
  ('laundry', 'pants', 'بنطلون', 0),
  ('laundry', 'pants2', 'بنطلون', 1),
  ('laundry', 'tshirt', 'تيشرت', 2),
  ('laundry', 'tshirt2', 'تيشرت', 3),
  ('laundry', 'shirt', 'قميص', 4),
  ('stewarding', 'shirt', 'قميص', 0),
  ('stewarding', 'pants', 'بنطلون', 1),
  ('stewarding', 'supervisionKit', 'طقم إشراف', 2),
  ('stewarding', 'workersKit', 'طقم عمال', 3),
  ('maintenance', 'shirt', 'قميص', 0),
  ('maintenance', 'pants', 'بنطلون', 1),
  ('maintenance', 'supervisionKit', 'طقم إشراف', 2),
  ('maintenance', 'workersKit', 'طقم عمال', 3),
  ('purchasing', 'shirt', 'قميص', 0),
  ('purchasing', 'pants', 'بنطلون', 1),
  ('gym', 'sportsTracksuit', 'ترنج رياضي', 0),
  ('gym', 'sportsTshirt', 'تيشرت رياضي', 1),
  ('gym', 'sportsPants', 'بنطلون رياضي', 2),
  ('gym', 'sportsShorts', 'شورت رياضي', 3)
) AS seed(department_id, item_key, category_name, sort_order)
ON CONFLICT (department_id, item_key) DO NOTHING;

-- Backfill categories for any item_key already present in department_items.
INSERT INTO department_item_categories (department_id, item_key, category_name, sort_order)
SELECT
  orphan.department_id,
  orphan.item_key,
  orphan.item_key,
  9999
FROM (
  SELECT DISTINCT department_id, item_key
  FROM department_items
  WHERE item_key IS NOT NULL AND btrim(item_key) <> ''
) AS orphan
LEFT JOIN department_item_categories existing
  ON existing.department_id = orphan.department_id
 AND existing.item_key = orphan.item_key
WHERE existing.id IS NULL
ON CONFLICT (department_id, item_key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'department_item_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.department_item_categories;
  END IF;
END $$;

