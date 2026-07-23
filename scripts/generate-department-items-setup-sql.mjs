import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PLAN_DEPARTMENTS = [
  'directors',
  'frontOffice',
  'personnelAffairs',
  'informationTechnology',
  'audioEngineering',
  'sales',
  'publicRelations',
  'driversSecretariat',
  'accounts',
  'foodBeverageBanquets',
  'security',
  'housekeeping',
  'kitchen',
  'laundry',
  'stewarding',
  'maintenance',
  'purchasing',
  'gym',
  'occupationalSafetyHealth',
];

const PLAN_DEPARTMENT_ITEMS = {
  directors: ['suit', 'shirt', 'tie'],
  frontOffice: ['suit', 'womens', 'balman', 'shirt', 'blouse', 'tie'],
  personnelAffairs: ['suit', 'shirt', 'tie'],
  informationTechnology: ['suit', 'shirt', 'tie'],
  audioEngineering: ['suit', 'shirt', 'tie'],
  sales: ['suit', 'womens', 'shirt', 'blouse', 'tie'],
  publicRelations: ['suit', 'shirt', 'tie'],
  driversSecretariat: ['suit', 'shirt', 'tie'],
  accounts: ['suit', 'shirt', 'tie', 'pants', 'tshirt', 'tshirt2', 'jacket'],
  foodBeverageBanquets: ['suit', 'shirt', 'shirt2', 'tie', 'pants', 'apron', 'apron2', 'jacket'],
  security: ['suit', 'suit2', 'shirt', 'shirt2', 'shirt3', 'pants', 'jacket', 'tie', 'coat'],
  housekeeping: ['suit', 'suit2', 'shirt', 'shirt2', 'shirt3', 'hkKit', 'hkKit2', 'pants', 'tie', 'headCover'],
  kitchen: ['kitchenJacket', 'kitchenJacket2', 'kitchenJacket3', 'apron', 'apron2', 'pants', 'pants2'],
  laundry: ['pants', 'pants2', 'tshirt', 'tshirt2', 'shirt'],
  stewarding: ['shirt', 'pants', 'supervisionKit', 'workersKit'],
  maintenance: ['shirt', 'pants', 'supervisionKit', 'workersKit'],
  purchasing: ['shirt', 'pants'],
  gym: ['sportsTracksuit', 'sportsTshirt', 'sportsPants', 'sportsShorts'],
  occupationalSafetyHealth: [
    'pants',
    'suit',
    'shirt',
    'tie',
    'safetyShirt',
    'safetyUniformSet',
  ],
};

const ACCOUNTS_SUIT_VARIANTS = [
  'admin.inventory.plan.items.suit.black',
  'admin.inventory.plan.items.suit.navy',
  'admin.inventory.plan.items.suit.grey',
  'admin.inventory.plan.items.suit.womens',
  'admin.inventory.plan.items.suit.balman',
];

const ACCOUNTS_SHIRT_VARIANTS = [
  'admin.inventory.plan.items.shirt.white',
  'admin.inventory.plan.items.shirt.beige',
  'admin.inventory.plan.items.shirt.striped',
  'admin.inventory.plan.items.shirt.halfCollar',
  'admin.inventory.plan.items.shirt.blouse',
];

const ITEM_VARIANT_KEYS = {
  suit: [
    'admin.inventory.plan.items.suit.black',
    'admin.inventory.plan.items.suit.navy',
    'admin.inventory.plan.items.suit.grey',
  ],
  suit2: ACCOUNTS_SUIT_VARIANTS,
  womens: ['admin.inventory.plan.items.suit.womens'],
  balman: ['admin.inventory.plan.items.suit.balman'],
  shirt: [
    'admin.inventory.plan.items.shirt.white',
    'admin.inventory.plan.items.shirt.beige',
    'admin.inventory.plan.items.shirt.striped',
    'admin.inventory.plan.items.shirt.halfCollar',
  ],
  shirt2: ACCOUNTS_SHIRT_VARIANTS,
  shirt3: ACCOUNTS_SHIRT_VARIANTS,
  blouse: ['admin.inventory.plan.items.shirt.blouse'],
  tie: [
    'admin.inventory.plan.items.tie.navy',
    'admin.inventory.plan.items.tie.black',
    'admin.inventory.plan.items.tie.wine',
    'admin.inventory.plan.items.tie.grey',
  ],
  pants: [
    'admin.inventory.plan.items.pants.black',
    'admin.inventory.plan.items.pants.navy',
    'admin.inventory.plan.items.pants.white',
    'admin.inventory.plan.items.pants.womens',
  ],
  pants2: [
    'admin.inventory.plan.items.pants.black',
    'admin.inventory.plan.items.pants.navy',
    'admin.inventory.plan.items.pants.white',
    'admin.inventory.plan.items.pants.womens',
  ],
  tshirt: [
    'admin.inventory.plan.items.tshirt.wineLong',
    'admin.inventory.plan.items.tshirt.wineShort',
    'admin.inventory.plan.items.tshirt.navyLong',
    'admin.inventory.plan.items.tshirt.navyShort',
    'admin.inventory.plan.items.tshirt.greyLong',
    'admin.inventory.plan.items.tshirt.greyShort',
    'admin.inventory.plan.items.tshirt.blackLong',
    'admin.inventory.plan.items.tshirt.blackShort',
    'admin.inventory.plan.items.tshirt.whiteLong',
    'admin.inventory.plan.items.tshirt.whiteShort',
  ],
  tshirt2: [
    'admin.inventory.plan.items.tshirt.wineLong',
    'admin.inventory.plan.items.tshirt.wineShort',
    'admin.inventory.plan.items.tshirt.navyLong',
    'admin.inventory.plan.items.tshirt.navyShort',
    'admin.inventory.plan.items.tshirt.greyLong',
    'admin.inventory.plan.items.tshirt.greyShort',
    'admin.inventory.plan.items.tshirt.blackLong',
    'admin.inventory.plan.items.tshirt.blackShort',
    'admin.inventory.plan.items.tshirt.whiteLong',
    'admin.inventory.plan.items.tshirt.whiteShort',
  ],
  jacket: [
    'admin.inventory.plan.items.jacket.cold',
    'admin.inventory.plan.items.jacket.navy',
    'admin.inventory.plan.items.jacket.black',
  ],
  kitchenJacket: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  kitchenJacket2: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  kitchenJacket3: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  apron: [
    'admin.inventory.plan.items.apron.white',
    'admin.inventory.plan.items.apron.black',
    'admin.inventory.plan.items.apron.beige',
    'admin.inventory.plan.items.apron.tan',
  ],
  apron2: [
    'admin.inventory.plan.items.apron.white',
    'admin.inventory.plan.items.apron.black',
    'admin.inventory.plan.items.apron.beige',
    'admin.inventory.plan.items.apron.tan',
  ],
  hkKit: ['admin.inventory.plan.items.hkKit.mens', 'admin.inventory.plan.items.hkKit.womens'],
  hkKit2: ['admin.inventory.plan.items.hkKit.mens', 'admin.inventory.plan.items.hkKit.womens'],
  headCover: [],
  coat: ['admin.inventory.plan.items.coat.black', 'admin.inventory.plan.items.coat.navy'],
  supervisionKit: [
    'admin.inventory.plan.items.supervisionKit.mens',
    'admin.inventory.plan.items.supervisionKit.womens',
  ],
  workersKit: [
    'admin.inventory.plan.items.workersKit.mens',
    'admin.inventory.plan.items.workersKit.womens',
  ],
  sportsTracksuit: [
    'admin.inventory.plan.items.sportsTracksuit.black',
    'admin.inventory.plan.items.sportsTracksuit.navy',
    'admin.inventory.plan.items.sportsTracksuit.grey',
  ],
  sportsTshirt: [
    'admin.inventory.plan.items.sportsTshirt.black',
    'admin.inventory.plan.items.sportsTshirt.white',
    'admin.inventory.plan.items.sportsTshirt.navy',
    'admin.inventory.plan.items.sportsTshirt.grey',
    'admin.inventory.plan.items.sportsTshirt.wine',
  ],
  sportsPants: [
    'admin.inventory.plan.items.sportsPants.black',
    'admin.inventory.plan.items.sportsPants.navy',
    'admin.inventory.plan.items.sportsPants.grey',
  ],
  sportsShorts: [
    'admin.inventory.plan.items.sportsShorts.black',
    'admin.inventory.plan.items.sportsShorts.navy',
    'admin.inventory.plan.items.sportsShorts.grey',
  ],
  safetyShirt: ['admin.inventory.plan.items.safetyShirt'],
  safetyUniformSet: ['admin.inventory.plan.items.safetyUniformSet'],
};

const ITEM_LABEL_KEYS = {
  suit: 'admin.inventory.plan.items.suit',
  suit2: 'admin.inventory.plan.items.suit',
  womens: 'admin.inventory.plan.items.womensSuit',
  balman: 'admin.inventory.plan.items.balmanSuit',
  shirt: 'admin.inventory.plan.items.shirt',
  shirt2: 'admin.inventory.plan.items.shirt',
  shirt3: 'admin.inventory.plan.items.shirt',
  blouse: 'admin.inventory.plan.items.blouse',
  tie: 'admin.inventory.plan.items.tie',
  pants: 'admin.inventory.plan.items.pants',
  pants2: 'admin.inventory.plan.items.pants',
  tshirt: 'admin.inventory.plan.items.tshirt',
  tshirt2: 'admin.inventory.plan.items.tshirt',
  jacket: 'admin.inventory.plan.items.jacket',
  kitchenJacket: 'admin.inventory.plan.items.kitchenJacket',
  kitchenJacket2: 'admin.inventory.plan.items.kitchenJacket',
  kitchenJacket3: 'admin.inventory.plan.items.kitchenJacket',
  apron: 'admin.inventory.plan.items.apron',
  apron2: 'admin.inventory.plan.items.apron',
  hkKit: 'admin.inventory.plan.items.hkKit',
  hkKit2: 'admin.inventory.plan.items.hkKit',
  headCover: 'admin.inventory.plan.items.headCover',
  coat: 'admin.inventory.plan.items.coat',
  supervisionKit: 'admin.inventory.plan.items.supervisionKit',
  workersKit: 'admin.inventory.plan.items.workersKit',
  sportsTracksuit: 'admin.inventory.plan.items.sportsTracksuit',
  sportsTshirt: 'admin.inventory.plan.items.sportsTshirt',
  sportsPants: 'admin.inventory.plan.items.sportsPants',
  sportsShorts: 'admin.inventory.plan.items.sportsShorts',
  safetyShirt: 'admin.inventory.plan.items.safetyShirt',
  safetyUniformSet: 'admin.inventory.plan.items.safetyUniformSet',
};

function getDepartmentItemVariants(departmentId, itemKey) {
  if (departmentId === 'accounts') {
    if (itemKey === 'suit') return ACCOUNTS_SUIT_VARIANTS;
    if (itemKey === 'shirt') return ACCOUNTS_SHIRT_VARIANTS;
  }

  if (departmentId === 'foodBeverageBanquets') {
    if (itemKey === 'suit') return ACCOUNTS_SUIT_VARIANTS;
    if (itemKey === 'shirt' || itemKey === 'shirt2') return ACCOUNTS_SHIRT_VARIANTS;
  }

  if (departmentId === 'security') {
    if (itemKey === 'suit' || itemKey === 'suit2') return ACCOUNTS_SUIT_VARIANTS;
    if (itemKey === 'shirt' || itemKey === 'shirt2' || itemKey === 'shirt3') return ACCOUNTS_SHIRT_VARIANTS;
  }

  if (departmentId === 'housekeeping') {
    if (itemKey === 'suit' || itemKey === 'suit2') return ACCOUNTS_SUIT_VARIANTS;
    if (itemKey === 'shirt' || itemKey === 'shirt2' || itemKey === 'shirt3') return ACCOUNTS_SHIRT_VARIANTS;
  }

  if (departmentId === 'laundry' && itemKey === 'shirt') return ACCOUNTS_SHIRT_VARIANTS;
  if (departmentId === 'stewarding' && itemKey === 'shirt') return ACCOUNTS_SHIRT_VARIANTS;

  if (departmentId === 'maintenance') {
    if (itemKey === 'shirt') return ACCOUNTS_SHIRT_VARIANTS;
    if (itemKey === 'supervisionKit') return ['admin.inventory.plan.items.supervisionKit.mens'];
    if (itemKey === 'workersKit') return ['admin.inventory.plan.items.workersKit.mens'];
  }

  if (departmentId === 'purchasing' && itemKey === 'shirt') return ACCOUNTS_SHIRT_VARIANTS;

  return ITEM_VARIANT_KEYS[itemKey] ?? [];
}

function loadArLabels() {
  const source = readFileSync(join(process.cwd(), 'src', 'i18n', 'dictionaries.ts'), 'utf8');
  const arStart = source.indexOf('  ar: {');
  const arSection = source.slice(arStart);
  const labels = {};

  for (const match of arSection.matchAll(/'([^']+)':\s*'((?:\\'|[^'])*)'/g)) {
    labels[match[1]] = match[2].replace(/\\'/g, "'");
  }

  return labels;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildCategorySeedRows(arLabels) {
  const rows = [];

  for (const departmentId of PLAN_DEPARTMENTS) {
    let sortOrder = 0;

    for (const itemKey of PLAN_DEPARTMENT_ITEMS[departmentId]) {
      const labelKey = ITEM_LABEL_KEYS[itemKey];
      rows.push({
        departmentId,
        itemKey,
        categoryName: arLabels[labelKey] ?? itemKey,
        sortOrder: sortOrder++,
      });
    }
  }

  return rows;
}

function buildSeedRows(arLabels) {
  const rows = [];

  for (const departmentId of PLAN_DEPARTMENTS) {
    let sortOrder = 0;

    for (const itemKey of PLAN_DEPARTMENT_ITEMS[departmentId]) {
      const variants = getDepartmentItemVariants(departmentId, itemKey);

      if (variants.length === 0) {
        const labelKey = ITEM_LABEL_KEYS[itemKey];
        rows.push({
          departmentId,
          itemKey,
          itemName: arLabels[labelKey] ?? labelKey,
          variantKey: labelKey,
          unit: 'قطعة',
          sortOrder: sortOrder++,
        });
        continue;
      }

      for (const variantKey of variants) {
        rows.push({
          departmentId,
          itemKey,
          itemName: arLabels[variantKey] ?? variantKey,
          variantKey,
          unit: 'قطعة',
          sortOrder: sortOrder++,
        });
      }
    }
  }

  return rows;
}

function readMigration(name) {
  return readFileSync(join(process.cwd(), 'supabase', 'migrations', name), 'utf8').trim();
}

const arLabels = loadArLabels();
const seedRows = buildSeedRows(arLabels);
const categorySeedRows = buildCategorySeedRows(arLabels);
const seedValues = seedRows
  .map(
    (row) =>
      `  (${sqlLiteral(row.departmentId)}, ${sqlLiteral(row.itemKey)}, ${sqlLiteral(row.itemName)}, ${sqlLiteral(row.variantKey)}, ${sqlLiteral(row.unit)}, ${row.sortOrder})`,
  )
  .join(',\n');
const categorySeedValues = categorySeedRows
  .map(
    (row) =>
      `  (${sqlLiteral(row.departmentId)}, ${sqlLiteral(row.itemKey)}, ${sqlLiteral(row.categoryName)}, ${row.sortOrder})`,
  )
  .join(',\n');

const categoriesMigration = `-- Custom and renamed item categories per department (plan dropdown row sources)

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
${categorySeedValues}
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
`;

writeFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260711150000_department_item_categories.sql'),
  categoriesMigration,
  'utf8',
);

const sql = `-- Run this script in Supabase SQL Editor for project dtpotzigctinidoxgooo
-- Creates public.department_items, enables RLS/realtime, and seeds hardcoded catalog rows.

${readMigration('20260711120000_department_items.sql')}

${readMigration('20260711130000_department_items_plan_keys.sql')}

${readMigration('20260711150000_department_item_categories.sql')}

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
${seedValues}
) AS seed(department_id, item_key, item_name, variant_key, unit, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM department_items LIMIT 1);
`;

const outputDir = join(process.cwd(), 'supabase', 'manual');
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, 'department_items_setup.sql');
writeFileSync(outputPath, sql, 'utf8');
console.log(`Generated ${seedRows.length} item seed rows and ${categorySeedRows.length} category seed rows`);
console.log(`  -> ${outputPath}`);
console.log(`  -> supabase/migrations/20260711150000_department_item_categories.sql`);
