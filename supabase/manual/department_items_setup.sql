-- Run this script in Supabase SQL Editor for project dtpotzigctinidoxgooo
-- Creates public.department_items, enables RLS/realtime, and seeds hardcoded catalog rows.

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

-- Add plan slot linkage for backward-compatible row IDs (departmentId-itemKey)

ALTER TABLE department_items
  ADD COLUMN IF NOT EXISTS item_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS variant_key TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_department_items_item_key
  ON department_items (department_id, item_key);

CREATE INDEX IF NOT EXISTS idx_department_items_variant_key
  ON department_items (variant_key);

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'department_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.department_items;
  END IF;
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

INSERT INTO department_items (department_id, item_key, item_name, variant_key, unit, sort_order)
SELECT department_id, item_key, item_name, variant_key, unit, sort_order
FROM (VALUES
  ('directors', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('directors', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('directors', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('directors', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('directors', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('directors', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('directors', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('directors', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('directors', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('directors', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('directors', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('frontOffice', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('frontOffice', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('frontOffice', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('frontOffice', 'womens', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('frontOffice', 'balman', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 4),
  ('frontOffice', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 5),
  ('frontOffice', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 6),
  ('frontOffice', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 7),
  ('frontOffice', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 8),
  ('frontOffice', 'blouse', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 9),
  ('frontOffice', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 10),
  ('frontOffice', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 11),
  ('frontOffice', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 12),
  ('frontOffice', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 13),
  ('personnelAffairs', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('personnelAffairs', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('personnelAffairs', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('personnelAffairs', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('personnelAffairs', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('personnelAffairs', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('personnelAffairs', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('personnelAffairs', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('personnelAffairs', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('personnelAffairs', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('personnelAffairs', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('informationTechnology', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('informationTechnology', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('informationTechnology', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('informationTechnology', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('informationTechnology', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('informationTechnology', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('informationTechnology', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('informationTechnology', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('informationTechnology', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('informationTechnology', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('informationTechnology', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('audioEngineering', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('audioEngineering', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('audioEngineering', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('audioEngineering', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('audioEngineering', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('audioEngineering', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('audioEngineering', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('audioEngineering', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('audioEngineering', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('audioEngineering', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('audioEngineering', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('sales', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('sales', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('sales', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('sales', 'womens', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('sales', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 4),
  ('sales', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 5),
  ('sales', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 6),
  ('sales', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 7),
  ('sales', 'blouse', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 8),
  ('sales', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 9),
  ('sales', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 10),
  ('sales', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 11),
  ('sales', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 12),
  ('publicRelations', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('publicRelations', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('publicRelations', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('publicRelations', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('publicRelations', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('publicRelations', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('publicRelations', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('publicRelations', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('publicRelations', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('publicRelations', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('publicRelations', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('driversSecretariat', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('driversSecretariat', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('driversSecretariat', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('driversSecretariat', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 3),
  ('driversSecretariat', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 4),
  ('driversSecretariat', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 5),
  ('driversSecretariat', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 6),
  ('driversSecretariat', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 7),
  ('driversSecretariat', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 8),
  ('driversSecretariat', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 9),
  ('driversSecretariat', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 10),
  ('accounts', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('accounts', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('accounts', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('accounts', 'suit', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('accounts', 'suit', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 4),
  ('accounts', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 5),
  ('accounts', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 6),
  ('accounts', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 7),
  ('accounts', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 8),
  ('accounts', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 9),
  ('accounts', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 10),
  ('accounts', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 11),
  ('accounts', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 12),
  ('accounts', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 13),
  ('accounts', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 14),
  ('accounts', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 15),
  ('accounts', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 16),
  ('accounts', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 17),
  ('accounts', 'tshirt', 'تيشرت نبيتي (كم طويل)', 'admin.inventory.plan.items.tshirt.wineLong', 'قطعة', 18),
  ('accounts', 'tshirt', 'تيشرت نبيتي (نصف كم)', 'admin.inventory.plan.items.tshirt.wineShort', 'قطعة', 19),
  ('accounts', 'tshirt', 'تيشرت كحلي (كم طويل)', 'admin.inventory.plan.items.tshirt.navyLong', 'قطعة', 20),
  ('accounts', 'tshirt', 'تيشرت كحلي (نصف كم)', 'admin.inventory.plan.items.tshirt.navyShort', 'قطعة', 21),
  ('accounts', 'tshirt', 'تيشرت رمادي (كم طويل)', 'admin.inventory.plan.items.tshirt.greyLong', 'قطعة', 22),
  ('accounts', 'tshirt', 'تيشرت رمادي (نصف كم)', 'admin.inventory.plan.items.tshirt.greyShort', 'قطعة', 23),
  ('accounts', 'tshirt', 'تيشرت أسود (كم طويل)', 'admin.inventory.plan.items.tshirt.blackLong', 'قطعة', 24),
  ('accounts', 'tshirt', 'تيشرت أسود (نصف كم)', 'admin.inventory.plan.items.tshirt.blackShort', 'قطعة', 25),
  ('accounts', 'tshirt', 'تيشرت أبيض (كم طويل)', 'admin.inventory.plan.items.tshirt.whiteLong', 'قطعة', 26),
  ('accounts', 'tshirt', 'تيشرت أبيض (نصف كم)', 'admin.inventory.plan.items.tshirt.whiteShort', 'قطعة', 27),
  ('accounts', 'tshirt2', 'تيشرت نبيتي (كم طويل)', 'admin.inventory.plan.items.tshirt.wineLong', 'قطعة', 28),
  ('accounts', 'tshirt2', 'تيشرت نبيتي (نصف كم)', 'admin.inventory.plan.items.tshirt.wineShort', 'قطعة', 29),
  ('accounts', 'tshirt2', 'تيشرت كحلي (كم طويل)', 'admin.inventory.plan.items.tshirt.navyLong', 'قطعة', 30),
  ('accounts', 'tshirt2', 'تيشرت كحلي (نصف كم)', 'admin.inventory.plan.items.tshirt.navyShort', 'قطعة', 31),
  ('accounts', 'tshirt2', 'تيشرت رمادي (كم طويل)', 'admin.inventory.plan.items.tshirt.greyLong', 'قطعة', 32),
  ('accounts', 'tshirt2', 'تيشرت رمادي (نصف كم)', 'admin.inventory.plan.items.tshirt.greyShort', 'قطعة', 33),
  ('accounts', 'tshirt2', 'تيشرت أسود (كم طويل)', 'admin.inventory.plan.items.tshirt.blackLong', 'قطعة', 34),
  ('accounts', 'tshirt2', 'تيشرت أسود (نصف كم)', 'admin.inventory.plan.items.tshirt.blackShort', 'قطعة', 35),
  ('accounts', 'tshirt2', 'تيشرت أبيض (كم طويل)', 'admin.inventory.plan.items.tshirt.whiteLong', 'قطعة', 36),
  ('accounts', 'tshirt2', 'تيشرت أبيض (نصف كم)', 'admin.inventory.plan.items.tshirt.whiteShort', 'قطعة', 37),
  ('accounts', 'jacket', 'جاكت تلاجة', 'admin.inventory.plan.items.jacket.cold', 'قطعة', 38),
  ('accounts', 'jacket', 'جاكت كحلي', 'admin.inventory.plan.items.jacket.navy', 'قطعة', 39),
  ('accounts', 'jacket', 'جاكت أسود', 'admin.inventory.plan.items.jacket.black', 'قطعة', 40),
  ('foodBeverageBanquets', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('foodBeverageBanquets', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('foodBeverageBanquets', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('foodBeverageBanquets', 'suit', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('foodBeverageBanquets', 'suit', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 4),
  ('foodBeverageBanquets', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 5),
  ('foodBeverageBanquets', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 6),
  ('foodBeverageBanquets', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 7),
  ('foodBeverageBanquets', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 8),
  ('foodBeverageBanquets', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 9),
  ('foodBeverageBanquets', 'shirt2', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 10),
  ('foodBeverageBanquets', 'shirt2', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 11),
  ('foodBeverageBanquets', 'shirt2', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 12),
  ('foodBeverageBanquets', 'shirt2', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 13),
  ('foodBeverageBanquets', 'shirt2', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 14),
  ('foodBeverageBanquets', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 15),
  ('foodBeverageBanquets', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 16),
  ('foodBeverageBanquets', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 17),
  ('foodBeverageBanquets', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 18),
  ('foodBeverageBanquets', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 19),
  ('foodBeverageBanquets', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 20),
  ('foodBeverageBanquets', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 21),
  ('foodBeverageBanquets', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 22),
  ('foodBeverageBanquets', 'apron', 'أبرون أبيض', 'admin.inventory.plan.items.apron.white', 'قطعة', 23),
  ('foodBeverageBanquets', 'apron', 'أبرون أسود', 'admin.inventory.plan.items.apron.black', 'قطعة', 24),
  ('foodBeverageBanquets', 'apron', 'أبرون لبني', 'admin.inventory.plan.items.apron.beige', 'قطعة', 25),
  ('foodBeverageBanquets', 'apron', 'أبرون بيج', 'admin.inventory.plan.items.apron.tan', 'قطعة', 26),
  ('foodBeverageBanquets', 'apron2', 'أبرون أبيض', 'admin.inventory.plan.items.apron.white', 'قطعة', 27),
  ('foodBeverageBanquets', 'apron2', 'أبرون أسود', 'admin.inventory.plan.items.apron.black', 'قطعة', 28),
  ('foodBeverageBanquets', 'apron2', 'أبرون لبني', 'admin.inventory.plan.items.apron.beige', 'قطعة', 29),
  ('foodBeverageBanquets', 'apron2', 'أبرون بيج', 'admin.inventory.plan.items.apron.tan', 'قطعة', 30),
  ('foodBeverageBanquets', 'jacket', 'جاكت تلاجة', 'admin.inventory.plan.items.jacket.cold', 'قطعة', 31),
  ('foodBeverageBanquets', 'jacket', 'جاكت كحلي', 'admin.inventory.plan.items.jacket.navy', 'قطعة', 32),
  ('foodBeverageBanquets', 'jacket', 'جاكت أسود', 'admin.inventory.plan.items.jacket.black', 'قطعة', 33),
  ('security', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('security', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('security', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('security', 'suit', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('security', 'suit', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 4),
  ('security', 'suit2', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 5),
  ('security', 'suit2', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 6),
  ('security', 'suit2', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 7),
  ('security', 'suit2', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 8),
  ('security', 'suit2', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 9),
  ('security', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 10),
  ('security', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 11),
  ('security', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 12),
  ('security', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 13),
  ('security', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 14),
  ('security', 'shirt2', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 15),
  ('security', 'shirt2', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 16),
  ('security', 'shirt2', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 17),
  ('security', 'shirt2', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 18),
  ('security', 'shirt2', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 19),
  ('security', 'shirt3', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 20),
  ('security', 'shirt3', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 21),
  ('security', 'shirt3', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 22),
  ('security', 'shirt3', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 23),
  ('security', 'shirt3', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 24),
  ('security', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 25),
  ('security', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 26),
  ('security', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 27),
  ('security', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 28),
  ('security', 'jacket', 'جاكت تلاجة', 'admin.inventory.plan.items.jacket.cold', 'قطعة', 29),
  ('security', 'jacket', 'جاكت كحلي', 'admin.inventory.plan.items.jacket.navy', 'قطعة', 30),
  ('security', 'jacket', 'جاكت أسود', 'admin.inventory.plan.items.jacket.black', 'قطعة', 31),
  ('security', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 32),
  ('security', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 33),
  ('security', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 34),
  ('security', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 35),
  ('security', 'coat', 'بالطو أسود', 'admin.inventory.plan.items.coat.black', 'قطعة', 36),
  ('security', 'coat', 'بالطو كحلي', 'admin.inventory.plan.items.coat.navy', 'قطعة', 37),
  ('housekeeping', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 0),
  ('housekeeping', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 1),
  ('housekeeping', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 2),
  ('housekeeping', 'suit', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 3),
  ('housekeeping', 'suit', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 4),
  ('housekeeping', 'suit2', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 5),
  ('housekeeping', 'suit2', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 6),
  ('housekeeping', 'suit2', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 7),
  ('housekeeping', 'suit2', 'بدلة حريمي', 'admin.inventory.plan.items.suit.womens', 'قطعة', 8),
  ('housekeeping', 'suit2', 'بدلة بلمان', 'admin.inventory.plan.items.suit.balman', 'قطعة', 9),
  ('housekeeping', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 10),
  ('housekeeping', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 11),
  ('housekeeping', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 12),
  ('housekeeping', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 13),
  ('housekeeping', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 14),
  ('housekeeping', 'shirt2', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 15),
  ('housekeeping', 'shirt2', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 16),
  ('housekeeping', 'shirt2', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 17),
  ('housekeeping', 'shirt2', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 18),
  ('housekeeping', 'shirt2', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 19),
  ('housekeeping', 'shirt3', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 20),
  ('housekeeping', 'shirt3', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 21),
  ('housekeeping', 'shirt3', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 22),
  ('housekeeping', 'shirt3', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 23),
  ('housekeeping', 'shirt3', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 24),
  ('housekeeping', 'hkKit', 'طقم HK رجالي', 'admin.inventory.plan.items.hkKit.mens', 'قطعة', 25),
  ('housekeeping', 'hkKit', 'طقم HK حريمي', 'admin.inventory.plan.items.hkKit.womens', 'قطعة', 26),
  ('housekeeping', 'hkKit2', 'طقم HK رجالي', 'admin.inventory.plan.items.hkKit.mens', 'قطعة', 27),
  ('housekeeping', 'hkKit2', 'طقم HK حريمي', 'admin.inventory.plan.items.hkKit.womens', 'قطعة', 28),
  ('housekeeping', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 29),
  ('housekeeping', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 30),
  ('housekeeping', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 31),
  ('housekeeping', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 32),
  ('housekeeping', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 33),
  ('housekeeping', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 34),
  ('housekeeping', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 35),
  ('housekeeping', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 36),
  ('housekeeping', 'headCover', 'تلبيسة رأس', 'admin.inventory.plan.items.headCover', 'قطعة', 37),
  ('kitchen', 'kitchenJacket', 'جاكت مطبخ أبيض', 'admin.inventory.plan.items.kitchenJacket.white', 'قطعة', 0),
  ('kitchen', 'kitchenJacket', 'جاكت مطبخ أسود', 'admin.inventory.plan.items.kitchenJacket.black', 'قطعة', 1),
  ('kitchen', 'kitchenJacket', 'جاكت مطبخ رمادي', 'admin.inventory.plan.items.kitchenJacket.grey', 'قطعة', 2),
  ('kitchen', 'kitchenJacket2', 'جاكت مطبخ أبيض', 'admin.inventory.plan.items.kitchenJacket.white', 'قطعة', 3),
  ('kitchen', 'kitchenJacket2', 'جاكت مطبخ أسود', 'admin.inventory.plan.items.kitchenJacket.black', 'قطعة', 4),
  ('kitchen', 'kitchenJacket2', 'جاكت مطبخ رمادي', 'admin.inventory.plan.items.kitchenJacket.grey', 'قطعة', 5),
  ('kitchen', 'kitchenJacket3', 'جاكت مطبخ أبيض', 'admin.inventory.plan.items.kitchenJacket.white', 'قطعة', 6),
  ('kitchen', 'kitchenJacket3', 'جاكت مطبخ أسود', 'admin.inventory.plan.items.kitchenJacket.black', 'قطعة', 7),
  ('kitchen', 'kitchenJacket3', 'جاكت مطبخ رمادي', 'admin.inventory.plan.items.kitchenJacket.grey', 'قطعة', 8),
  ('kitchen', 'apron', 'أبرون أبيض', 'admin.inventory.plan.items.apron.white', 'قطعة', 9),
  ('kitchen', 'apron', 'أبرون أسود', 'admin.inventory.plan.items.apron.black', 'قطعة', 10),
  ('kitchen', 'apron', 'أبرون لبني', 'admin.inventory.plan.items.apron.beige', 'قطعة', 11),
  ('kitchen', 'apron', 'أبرون بيج', 'admin.inventory.plan.items.apron.tan', 'قطعة', 12),
  ('kitchen', 'apron2', 'أبرون أبيض', 'admin.inventory.plan.items.apron.white', 'قطعة', 13),
  ('kitchen', 'apron2', 'أبرون أسود', 'admin.inventory.plan.items.apron.black', 'قطعة', 14),
  ('kitchen', 'apron2', 'أبرون لبني', 'admin.inventory.plan.items.apron.beige', 'قطعة', 15),
  ('kitchen', 'apron2', 'أبرون بيج', 'admin.inventory.plan.items.apron.tan', 'قطعة', 16),
  ('kitchen', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 17),
  ('kitchen', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 18),
  ('kitchen', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 19),
  ('kitchen', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 20),
  ('kitchen', 'pants2', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 21),
  ('kitchen', 'pants2', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 22),
  ('kitchen', 'pants2', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 23),
  ('kitchen', 'pants2', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 24),
  ('laundry', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 0),
  ('laundry', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 1),
  ('laundry', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 2),
  ('laundry', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 3),
  ('laundry', 'pants2', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 4),
  ('laundry', 'pants2', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 5),
  ('laundry', 'pants2', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 6),
  ('laundry', 'pants2', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 7),
  ('laundry', 'tshirt', 'تيشرت نبيتي (كم طويل)', 'admin.inventory.plan.items.tshirt.wineLong', 'قطعة', 8),
  ('laundry', 'tshirt', 'تيشرت نبيتي (نصف كم)', 'admin.inventory.plan.items.tshirt.wineShort', 'قطعة', 9),
  ('laundry', 'tshirt', 'تيشرت كحلي (كم طويل)', 'admin.inventory.plan.items.tshirt.navyLong', 'قطعة', 10),
  ('laundry', 'tshirt', 'تيشرت كحلي (نصف كم)', 'admin.inventory.plan.items.tshirt.navyShort', 'قطعة', 11),
  ('laundry', 'tshirt', 'تيشرت رمادي (كم طويل)', 'admin.inventory.plan.items.tshirt.greyLong', 'قطعة', 12),
  ('laundry', 'tshirt', 'تيشرت رمادي (نصف كم)', 'admin.inventory.plan.items.tshirt.greyShort', 'قطعة', 13),
  ('laundry', 'tshirt', 'تيشرت أسود (كم طويل)', 'admin.inventory.plan.items.tshirt.blackLong', 'قطعة', 14),
  ('laundry', 'tshirt', 'تيشرت أسود (نصف كم)', 'admin.inventory.plan.items.tshirt.blackShort', 'قطعة', 15),
  ('laundry', 'tshirt', 'تيشرت أبيض (كم طويل)', 'admin.inventory.plan.items.tshirt.whiteLong', 'قطعة', 16),
  ('laundry', 'tshirt', 'تيشرت أبيض (نصف كم)', 'admin.inventory.plan.items.tshirt.whiteShort', 'قطعة', 17),
  ('laundry', 'tshirt2', 'تيشرت نبيتي (كم طويل)', 'admin.inventory.plan.items.tshirt.wineLong', 'قطعة', 18),
  ('laundry', 'tshirt2', 'تيشرت نبيتي (نصف كم)', 'admin.inventory.plan.items.tshirt.wineShort', 'قطعة', 19),
  ('laundry', 'tshirt2', 'تيشرت كحلي (كم طويل)', 'admin.inventory.plan.items.tshirt.navyLong', 'قطعة', 20),
  ('laundry', 'tshirt2', 'تيشرت كحلي (نصف كم)', 'admin.inventory.plan.items.tshirt.navyShort', 'قطعة', 21),
  ('laundry', 'tshirt2', 'تيشرت رمادي (كم طويل)', 'admin.inventory.plan.items.tshirt.greyLong', 'قطعة', 22),
  ('laundry', 'tshirt2', 'تيشرت رمادي (نصف كم)', 'admin.inventory.plan.items.tshirt.greyShort', 'قطعة', 23),
  ('laundry', 'tshirt2', 'تيشرت أسود (كم طويل)', 'admin.inventory.plan.items.tshirt.blackLong', 'قطعة', 24),
  ('laundry', 'tshirt2', 'تيشرت أسود (نصف كم)', 'admin.inventory.plan.items.tshirt.blackShort', 'قطعة', 25),
  ('laundry', 'tshirt2', 'تيشرت أبيض (كم طويل)', 'admin.inventory.plan.items.tshirt.whiteLong', 'قطعة', 26),
  ('laundry', 'tshirt2', 'تيشرت أبيض (نصف كم)', 'admin.inventory.plan.items.tshirt.whiteShort', 'قطعة', 27),
  ('laundry', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 28),
  ('laundry', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 29),
  ('laundry', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 30),
  ('laundry', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 31),
  ('laundry', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 32),
  ('stewarding', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 0),
  ('stewarding', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 1),
  ('stewarding', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 2),
  ('stewarding', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 3),
  ('stewarding', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 4),
  ('stewarding', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 5),
  ('stewarding', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 6),
  ('stewarding', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 7),
  ('stewarding', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 8),
  ('stewarding', 'supervisionKit', 'طقم إشراف رجالي', 'admin.inventory.plan.items.supervisionKit.mens', 'قطعة', 9),
  ('stewarding', 'supervisionKit', 'طقم إشراف حريمي', 'admin.inventory.plan.items.supervisionKit.womens', 'قطعة', 10),
  ('stewarding', 'workersKit', 'طقم عمال رجالي', 'admin.inventory.plan.items.workersKit.mens', 'قطعة', 11),
  ('stewarding', 'workersKit', 'طقم عمال حريمي', 'admin.inventory.plan.items.workersKit.womens', 'قطعة', 12),
  ('maintenance', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 0),
  ('maintenance', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 1),
  ('maintenance', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 2),
  ('maintenance', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 3),
  ('maintenance', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 4),
  ('maintenance', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 5),
  ('maintenance', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 6),
  ('maintenance', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 7),
  ('maintenance', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 8),
  ('maintenance', 'supervisionKit', 'طقم إشراف رجالي', 'admin.inventory.plan.items.supervisionKit.mens', 'قطعة', 9),
  ('maintenance', 'workersKit', 'طقم عمال رجالي', 'admin.inventory.plan.items.workersKit.mens', 'قطعة', 10),
  ('purchasing', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 0),
  ('purchasing', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 1),
  ('purchasing', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 2),
  ('purchasing', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 3),
  ('purchasing', 'shirt', 'بلوزة', 'admin.inventory.plan.items.shirt.blouse', 'قطعة', 4),
  ('purchasing', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 5),
  ('purchasing', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 6),
  ('purchasing', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 7),
  ('purchasing', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 8),
  ('gym', 'sportsTracksuit', 'ترنج رياضي أسود', 'admin.inventory.plan.items.sportsTracksuit.black', 'قطعة', 0),
  ('gym', 'sportsTracksuit', 'ترنج رياضي كحلي', 'admin.inventory.plan.items.sportsTracksuit.navy', 'قطعة', 1),
  ('gym', 'sportsTracksuit', 'ترنج رياضي رمادي', 'admin.inventory.plan.items.sportsTracksuit.grey', 'قطعة', 2),
  ('gym', 'sportsTshirt', 'تيشرت رياضي أسود', 'admin.inventory.plan.items.sportsTshirt.black', 'قطعة', 3),
  ('gym', 'sportsTshirt', 'تيشرت رياضي أبيض', 'admin.inventory.plan.items.sportsTshirt.white', 'قطعة', 4),
  ('gym', 'sportsTshirt', 'تيشرت رياضي كحلي', 'admin.inventory.plan.items.sportsTshirt.navy', 'قطعة', 5),
  ('gym', 'sportsTshirt', 'تيشرت رياضي رمادي', 'admin.inventory.plan.items.sportsTshirt.grey', 'قطعة', 6),
  ('gym', 'sportsTshirt', 'تيشرت رياضي نبيتي', 'admin.inventory.plan.items.sportsTshirt.wine', 'قطعة', 7),
  ('gym', 'sportsPants', 'بنطلون رياضي أسود', 'admin.inventory.plan.items.sportsPants.black', 'قطعة', 8),
  ('gym', 'sportsPants', 'بنطلون رياضي كحلي', 'admin.inventory.plan.items.sportsPants.navy', 'قطعة', 9),
  ('gym', 'sportsPants', 'بنطلون رياضي رمادي', 'admin.inventory.plan.items.sportsPants.grey', 'قطعة', 10),
  ('gym', 'sportsShorts', 'شورت رياضي أسود', 'admin.inventory.plan.items.sportsShorts.black', 'قطعة', 11),
  ('gym', 'sportsShorts', 'شورت رياضي كحلي', 'admin.inventory.plan.items.sportsShorts.navy', 'قطعة', 12),
  ('gym', 'sportsShorts', 'شورت رياضي رمادي', 'admin.inventory.plan.items.sportsShorts.grey', 'قطعة', 13)
) AS seed(department_id, item_key, item_name, variant_key, unit, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM department_items LIMIT 1);
