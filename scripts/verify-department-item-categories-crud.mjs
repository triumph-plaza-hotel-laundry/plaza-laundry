import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const client = createClient(url, anonKey);
const PLAN_DOCUMENT_KEY = 'tpl-inventory-plan-v1';
const CATEGORY_COLUMNS =
  'id, department_id, item_key, category_name, sort_order, created_at, updated_at';
const ITEM_COLUMNS =
  'id, department_id, item_key, item_name, variant_key, unit, sort_order, created_at, updated_at';

function summarizePlanRows(rowDrafts) {
  if (!rowDrafts || typeof rowDrafts !== 'object') {
    return { savedRows: 0, sample: null };
  }

  const saved = Object.entries(rowDrafts).filter(([, draft]) => draft?.itemVariant?.trim());
  return {
    savedRows: saved.length,
    sample: saved[0] ?? null,
  };
}

async function loadPlanSnapshot() {
  const { data, error } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', PLAN_DOCUMENT_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`plan load failed: ${error.message}`);
  }

  return summarizePlanRows(data?.data?.rowDrafts);
}

async function verifyCategoryCount() {
  const { count, error } = await client
    .from('department_item_categories')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`category count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function verifyVariantLinkage() {
  const { data: orphans, error } = await client.rpc('verify_department_item_category_links');

  if (error?.code === 'PGRST202') {
    const { data: items, error: itemsError } = await client
      .from('department_items')
      .select('department_id, item_key')
      .limit(5000);

    if (itemsError) {
      throw new Error(`variant linkage probe failed: ${itemsError.message}`);
    }

    const { data: categories, error: categoriesError } = await client
      .from('department_item_categories')
      .select('department_id, item_key')
      .limit(5000);

    if (categoriesError) {
      throw new Error(`category linkage probe failed: ${categoriesError.message}`);
    }

    const categoryKeys = new Set(
      (categories ?? []).map((row) => `${row.department_id}:${row.item_key}`),
    );
    const missing = (items ?? []).filter(
      (row) => row.item_key && !categoryKeys.has(`${row.department_id}:${row.item_key}`),
    );

    if (missing.length > 0) {
      throw new Error(`variants without category rows: ${missing.length}`);
    }

    return items?.length ?? 0;
  }

  if (error) {
    throw new Error(`variant linkage failed: ${error.message}`);
  }

  if ((orphans ?? []).length > 0) {
    throw new Error(`variants without category rows: ${orphans.length}`);
  }

  return 0;
}

async function verifyCategoryCrud() {
  const probeName = `فئة اختبار ${Date.now()}`;
  const itemKey = `cat-${crypto.randomUUID()}`;
  const departmentId = 'kitchen';

  const { data: created, error: createError } = await client
    .from('department_item_categories')
    .insert({
      department_id: departmentId,
      item_key: itemKey,
      category_name: probeName,
      sort_order: 99998,
    })
    .select(CATEGORY_COLUMNS)
    .single();

  if (createError) {
    throw new Error(`create category failed: ${createError.message}`);
  }

  const renamed = `${probeName} محدث`;
  const { data: updated, error: updateError } = await client
    .from('department_item_categories')
    .update({ category_name: renamed })
    .eq('id', created.id)
    .select(CATEGORY_COLUMNS)
    .single();

  if (updateError) {
    throw new Error(`rename category failed: ${updateError.message}`);
  }

  const variantName = `نوع اختبار ${Date.now()}`;
  const { data: variant, error: variantError } = await client
    .from('department_items')
    .insert({
      department_id: departmentId,
      item_key: itemKey,
      item_name: variantName,
      variant_key: `department-item:probe-${Date.now()}`,
      unit: 'قطعة',
      sort_order: 99998,
    })
    .select(ITEM_COLUMNS)
    .single();

  if (variantError) {
    throw new Error(`create variant failed: ${variantError.message}`);
  }

  const { error: deleteCategoryError } = await client
    .from('department_items')
    .delete()
    .eq('id', variant.id);

  if (deleteCategoryError) {
    throw new Error(`delete variant failed: ${deleteCategoryError.message}`);
  }

  const { error: deleteCategoryRowError } = await client
    .from('department_item_categories')
    .delete()
    .eq('id', created.id);

  if (deleteCategoryRowError) {
    throw new Error(`delete category failed: ${deleteCategoryRowError.message}`);
  }

  const { data: deletedVariant, error: deletedVariantError } = await client
    .from('department_items')
    .select('id')
    .eq('id', variant.id)
    .maybeSingle();

  if (deletedVariantError) {
    throw new Error(`variant delete probe failed: ${deletedVariantError.message}`);
  }

  if (deletedVariant) {
    throw new Error('variant was not deleted');
  }

  return updated.category_name;
}

async function verifyPlanUnchanged(before) {
  const after = await loadPlanSnapshot();
  if (after.savedRows !== before.savedRows) {
    throw new Error(`saved plan row count changed: ${before.savedRows} -> ${after.savedRows}`);
  }

  if (before.sample && after.sample) {
    const [beforeId, beforeDraft] = before.sample;
    const { data, error } = await client
      .from('app_data_documents')
      .select('data')
      .eq('document_key', PLAN_DOCUMENT_KEY)
      .maybeSingle();

    if (error) {
      throw new Error(`plan reload failed: ${error.message}`);
    }

    const afterDraft = data?.data?.rowDrafts?.[beforeId];
    if (JSON.stringify(afterDraft) !== JSON.stringify(beforeDraft)) {
      throw new Error(`saved plan row changed for ${beforeId}`);
    }
  }

  return after;
}

async function run() {
  const planBefore = await loadPlanSnapshot();
  const categoryCount = await verifyCategoryCount();
  const linkedVariants = await verifyVariantLinkage();
  const renamedCategory = await verifyCategoryCrud();
  const planAfter = await verifyPlanUnchanged(planBefore);

  console.log('Department item categories verification OK');
  console.log(`department_item_categories count: ${categoryCount}`);
  console.log(`linked department_items checked: ${linkedVariants}`);
  console.log(`CRUD probe renamed category: ${renamedCategory}`);
  console.log(`inventory plan saved rows unchanged: ${planAfter.savedRows}`);
}

run().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
