-- Seed Occupational Safety and Health (OSH) plan categories and catalog items.
-- Reuses shared pants/suit/shirt/tie keys; keeps OSH-specific safety items.

INSERT INTO department_item_categories (department_id, item_key, category_name, sort_order)
SELECT department_id, item_key, category_name, sort_order
FROM (
  VALUES
    ('occupationalSafetyHealth', 'pants', 'بنطلون', 0),
    ('occupationalSafetyHealth', 'suit', 'بدلة', 1),
    ('occupationalSafetyHealth', 'shirt', 'قميص', 2),
    ('occupationalSafetyHealth', 'tie', 'كرافت', 3),
    ('occupationalSafetyHealth', 'safetyShirt', 'قميص سلامة', 4),
    ('occupationalSafetyHealth', 'safetyUniformSet', 'طقم زي سلامة', 5)
) AS seed(department_id, item_key, category_name, sort_order)
ON CONFLICT (department_id, item_key) DO NOTHING;

INSERT INTO department_items (
  department_id,
  item_key,
  item_name,
  variant_key,
  unit,
  sort_order
)
SELECT
  seed.department_id,
  seed.item_key,
  seed.item_name,
  seed.variant_key,
  seed.unit,
  seed.sort_order
FROM (
  VALUES
    -- Pants (shared)
    ('occupationalSafetyHealth', 'pants', 'بنطلون أسود', 'admin.inventory.plan.items.pants.black', 'قطعة', 0),
    ('occupationalSafetyHealth', 'pants', 'بنطلون كحلي', 'admin.inventory.plan.items.pants.navy', 'قطعة', 1),
    ('occupationalSafetyHealth', 'pants', 'بنطلون أبيض', 'admin.inventory.plan.items.pants.white', 'قطعة', 2),
    ('occupationalSafetyHealth', 'pants', 'بنطلون حريمي', 'admin.inventory.plan.items.pants.womens', 'قطعة', 3),
    -- Suit (shared)
    ('occupationalSafetyHealth', 'suit', 'بدلة سوداء', 'admin.inventory.plan.items.suit.black', 'قطعة', 4),
    ('occupationalSafetyHealth', 'suit', 'بدلة كحلي', 'admin.inventory.plan.items.suit.navy', 'قطعة', 5),
    ('occupationalSafetyHealth', 'suit', 'بدلة رمادي', 'admin.inventory.plan.items.suit.grey', 'قطعة', 6),
    -- Shirt (shared)
    ('occupationalSafetyHealth', 'shirt', 'قميص أبيض', 'admin.inventory.plan.items.shirt.white', 'قطعة', 7),
    ('occupationalSafetyHealth', 'shirt', 'قميص لبني', 'admin.inventory.plan.items.shirt.beige', 'قطعة', 8),
    ('occupationalSafetyHealth', 'shirt', 'قميص مقلم', 'admin.inventory.plan.items.shirt.striped', 'قطعة', 9),
    ('occupationalSafetyHealth', 'shirt', 'قميص نص ياقة', 'admin.inventory.plan.items.shirt.halfCollar', 'قطعة', 10),
    -- Tie (shared)
    ('occupationalSafetyHealth', 'tie', 'كرافت كحلي', 'admin.inventory.plan.items.tie.navy', 'قطعة', 11),
    ('occupationalSafetyHealth', 'tie', 'كرافت أسود', 'admin.inventory.plan.items.tie.black', 'قطعة', 12),
    ('occupationalSafetyHealth', 'tie', 'كرافت نبيتي', 'admin.inventory.plan.items.tie.wine', 'قطعة', 13),
    ('occupationalSafetyHealth', 'tie', 'كرافت رمادي', 'admin.inventory.plan.items.tie.grey', 'قطعة', 14),
    -- OSH-specific
    ('occupationalSafetyHealth', 'safetyShirt', 'قميص سلامة', 'admin.inventory.plan.items.safetyShirt', 'قطعة', 15),
    ('occupationalSafetyHealth', 'safetyUniformSet', 'طقم زي سلامة', 'admin.inventory.plan.items.safetyUniformSet', 'قطعة', 16)
) AS seed(
  department_id,
  item_key,
  item_name,
  variant_key,
  unit,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM department_items existing
  WHERE existing.department_id = seed.department_id
    AND existing.item_key = seed.item_key
    AND existing.variant_key = seed.variant_key
);
