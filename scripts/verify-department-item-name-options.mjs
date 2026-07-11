import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const NEW_CATEGORY_VALUE = '__new_category__';

function getDepartmentItemNameOptions(items, departmentId, itemKey) {
  if (!departmentId || itemKey === NEW_CATEGORY_VALUE) {
    return [];
  }

  const seen = new Set();
  const orderedNames = [];

  const departmentItems = items
    .filter((item) => item.department_id === departmentId)
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }

      if (left.created_at !== right.created_at) {
        return left.created_at.localeCompare(right.created_at);
      }

      return left.item_name.localeCompare(right.item_name, 'ar');
    });

  for (const item of departmentItems) {
    const name = item.item_name.trim();
    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    orderedNames.push(name);
  }

  return orderedNames;
}

async function loadAllDepartmentItems(client) {
  const pageSize = 1000;
  const allRows = [];
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await client
      .from('department_items')
      .select('department_id, item_key, item_name, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allRows;
}

function expectedNamesForDepartment(items, departmentId) {
  const seen = new Set();

  return items
    .filter((item) => item.department_id === departmentId)
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }

      return left.created_at.localeCompare(right.created_at);
    })
    .map((item) => item.item_name.trim())
    .filter((name) => {
      if (!name || seen.has(name)) {
        return false;
      }

      seen.add(name);
      return true;
    });
}

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(url, key);
const items = await loadAllDepartmentItems(client);

const departments = [...new Set(items.map((item) => item.department_id))].sort();
let failures = 0;

for (const departmentId of departments) {
  const expected = expectedNamesForDepartment(items, departmentId);
  const actual = getDepartmentItemNameOptions(items, departmentId, '');

  if (actual.length !== expected.length) {
    failures += 1;
    console.error(
      `[FAIL] ${departmentId}: expected ${expected.length} item names, got ${actual.length}`,
    );
    continue;
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      failures += 1;
      console.error(
        `[FAIL] ${departmentId}: option mismatch at index ${index}. expected "${expected[index]}", got "${actual[index] ?? '<missing>'}"`,
      );
    }
  }

  if (failures === 0) {
    console.log(`[OK] ${departmentId}: ${actual.length} item names loaded`);
  }
}

const accountsCategories = [...new Set(items.filter((item) => item.department_id === 'accounts').map((item) => item.item_key))];
for (const itemKey of accountsCategories) {
  const categoryNames = [
    ...new Set(
      items
        .filter((item) => item.department_id === 'accounts' && item.item_key === itemKey)
        .map((item) => item.item_name.trim())
        .filter(Boolean),
    ),
  ];
  const actual = getDepartmentItemNameOptions(items, 'accounts', itemKey);

  for (const name of categoryNames) {
    if (!actual.includes(name)) {
      failures += 1;
      console.error(`[FAIL] accounts/${itemKey}: missing item name "${name}" in department-wide options`);
    }
  }

  console.log(`[OK] accounts/${itemKey}: all ${categoryNames.length} item names present in department options`);
}

const accountsExamples = ['بدلة', 'جاكت', 'قميص', 'بنطلون', 'تيشرت'];
const accountsOptions = getDepartmentItemNameOptions(items, 'accounts', '');
const missingExamples = accountsExamples.filter(
  (example) => !accountsOptions.some((option) => option.includes(example)),
);

if (missingExamples.length > 0) {
  failures += 1;
  console.error(`[FAIL] accounts examples missing from department-wide options: ${missingExamples.join(', ')}`);
} else {
  console.log('[OK] accounts department-wide options include all example item families');
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Verified ${items.length} department_items rows across ${departments.length} departments.`);
