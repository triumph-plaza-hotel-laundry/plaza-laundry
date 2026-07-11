import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const PLAN_DOCUMENT_KEY = 'tpl-inventory-plan-v1';

const PLAN_DEPARTMENTS = [
  'directors',
  'frontOffice',
  'kitchen',
  'housekeeping',
  'maintenance',
  'foodBeverageBanquets',
  'laundry',
  'security',
  'spa',
  'salesMarketing',
  'finance',
  'humanResources',
  'it',
  'procurement',
  'quality',
];

const PLAN_DEPARTMENT_ITEMS = {
  directors: ['suit', 'shirt', 'tie', 'pants', 'shoes'],
  frontOffice: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
  kitchen: ['kitchenJacket', 'kitchenJacket2', 'kitchenJacket3', 'apron', 'pants', 'shoes', 'cap'],
  housekeeping: ['uniform', 'pants', 'shoes', 'apron'],
  maintenance: ['uniform', 'pants', 'shoes'],
  foodBeverageBanquets: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie', 'apron'],
  laundry: ['uniform', 'pants', 'shoes', 'apron'],
  security: ['uniform', 'pants', 'shoes', 'cap'],
  spa: ['uniform', 'pants', 'shoes', 'apron'],
  salesMarketing: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
  finance: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
  humanResources: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
  it: ['shirt', 'pants', 'shoes'],
  procurement: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
  quality: ['suit', 'womens', 'shirt', 'pants', 'shoes', 'tie'],
};

const EMPTY_ROW_DRAFT = {
  day: '',
  month: '',
  year: '',
  quantity: '',
  itemVariant: '',
};

function createInitialPlanRowDrafts() {
  const drafts = {};

  for (const departmentId of PLAN_DEPARTMENTS) {
    for (const itemKey of PLAN_DEPARTMENT_ITEMS[departmentId] ?? []) {
      drafts[`${departmentId}-${itemKey}`] = { ...EMPTY_ROW_DRAFT };
    }
  }

  return drafts;
}

function mergePlanRowDrafts(saved) {
  const initial = createInitialPlanRowDrafts();
  if (!saved) {
    return initial;
  }

  return { ...initial, ...saved };
}

function isPlanRowVisible(draft) {
  return Boolean(draft?.itemVariant?.trim());
}

function verifyLegacyMerge() {
  const legacySavedPlan = {
    'kitchen-kitchenJacket': {
      day: '5',
      month: '3',
      year: '2026',
      quantity: '12',
      itemVariant: 'admin.inventory.plan.items.kitchenJacket.white',
    },
    'frontOffice-suit': {
      day: '10',
      month: '6',
      year: '2025',
      quantity: '4',
      itemVariant: 'admin.inventory.plan.items.suit.navy',
    },
  };

  const merged = mergePlanRowDrafts(legacySavedPlan);

  assert.equal(merged['kitchen-kitchenJacket'].day, '5');
  assert.equal(merged['kitchen-kitchenJacket'].month, '3');
  assert.equal(merged['kitchen-kitchenJacket'].year, '2026');
  assert.equal(merged['kitchen-kitchenJacket'].quantity, '12');
  assert.equal(
    merged['kitchen-kitchenJacket'].itemVariant,
    'admin.inventory.plan.items.kitchenJacket.white',
  );
  assert.equal(merged['frontOffice-suit'].quantity, '4');
  assert.ok(merged['kitchen-apron']);
  assert.equal(merged['kitchen-apron'].quantity, '');

  console.log('Legacy merge verification OK');
}

function verifyRowIdFormat(rowDrafts) {
  const savedRowIds = Object.keys(rowDrafts).filter((rowId) =>
    isPlanRowVisible(rowDrafts[rowId]),
  );

  for (const rowId of savedRowIds) {
    assert.match(
      rowId,
      /^[a-zA-Z]+-[a-zA-Z0-9]+$/,
      `Row ID "${rowId}" does not match legacy department-itemKey format`,
    );
    assert.doesNotMatch(
      rowId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-/,
      `Row ID "${rowId}" looks like a UUID-based ID`,
    );
  }

  console.log(`Row ID format verification OK (${savedRowIds.length} saved rows)`);
}

function verifySavedValuesPreserved(raw, merged) {
  if (!raw?.rowDrafts || typeof raw.rowDrafts !== 'object') {
    return;
  }

  const savedEntries = Object.entries(raw.rowDrafts).filter(([, draft]) =>
    isPlanRowVisible(draft),
  );

  for (const [rowId, draft] of savedEntries) {
    const loaded = merged[rowId];
    assert.ok(loaded, `Saved row "${rowId}" missing after merge`);

    for (const field of ['day', 'month', 'year', 'quantity', 'itemVariant']) {
      assert.equal(
        loaded[field],
        draft[field],
        `Field "${field}" changed for row "${rowId}"`,
      );
    }
  }

  console.log(`Saved values preserved OK (${savedEntries.length} rows with data)`);
}

async function verifyLivePlanDocument() {
  const env = loadEnv('development', process.cwd(), '');
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.log('Live plan verification skipped (no Supabase env vars)');
    return;
  }

  const client = createClient(url, anonKey);
  const { data, error } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', PLAN_DOCUMENT_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.data) {
    console.log('Live plan verification skipped (no saved plan document)');
    return;
  }

  const raw = data.data;
  const merged = mergePlanRowDrafts(raw.rowDrafts);

  verifyRowIdFormat(merged);
  verifySavedValuesPreserved(raw, merged);

  const { data: archives, error: archiveError } = await client
    .from('inventory_monthly_archives')
    .select('archive_month, plan_data')
    .order('archive_month', { ascending: false })
    .limit(3);

  if (archiveError) {
    const message = archiveError.message?.toLowerCase() ?? '';
    if (
      archiveError.code === 'PGRST205' ||
      archiveError.code === '42P01' ||
      message.includes('inventory_monthly_archives')
    ) {
      console.log('Monthly archive verification skipped (table not present)');
      return;
    }
    throw archiveError;
  }

  for (const archive of archives ?? []) {
    const archiveMerged = mergePlanRowDrafts(archive.plan_data?.rowDrafts);
    verifySavedValuesPreserved(archive.plan_data, archiveMerged);
    console.log(`Archive ${archive.archive_month} verification OK`);
  }
}

verifyLegacyMerge();
await verifyLivePlanDocument();
console.log('Plan backward-compatibility verification OK');
