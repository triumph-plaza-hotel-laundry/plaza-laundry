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
const SELECT_COLUMNS =
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

async function verifyCount() {
  const { count, error } = await client
    .from('department_items')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`count query failed: ${error.message}`);
  }

  return count ?? 0;
}

async function verifyList() {
  const { data, error } = await client
    .from('department_items')
    .select(SELECT_COLUMNS)
    .order('department_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(`list query failed: ${error.message}`);
  }

  return data ?? [];
}

async function verifyCrud() {
  const probeName = `CRUD probe ${Date.now()}`;
  const { data: created, error: createError } = await client
    .from('department_items')
    .insert({
      department_id: 'kitchen',
      item_key: 'kitchenJacket',
      item_name: probeName,
      variant_key: `department-item:probe-${Date.now()}`,
      unit: 'قطعة',
      sort_order: 99999,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (createError) {
    throw new Error(`create failed: ${createError.message}`);
  }

  const { data: updated, error: updateError } = await client
    .from('department_items')
    .update({ item_name: `${probeName} updated` })
    .eq('id', created.id)
    .select(SELECT_COLUMNS)
    .single();

  if (updateError) {
    throw new Error(`update failed: ${updateError.message}`);
  }

  const { error: deleteError } = await client.from('department_items').delete().eq('id', created.id);

  if (deleteError) {
    throw new Error(`delete failed: ${deleteError.message}`);
  }

  return updated.item_name;
}

async function verifyPlanUnchanged(before) {
  const { data, error } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', PLAN_DOCUMENT_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`plan load failed: ${error.message}`);
  }

  const after = summarizePlanRows(data?.data?.rowDrafts);
  if (after.savedRows !== before.savedRows) {
    throw new Error(`saved plan row count changed: ${before.savedRows} -> ${after.savedRows}`);
  }

  if (before.sample && after.sample) {
    const [beforeId, beforeDraft] = before.sample;
    const afterDraft = data?.data?.rowDrafts?.[beforeId];
    if (JSON.stringify(afterDraft) !== JSON.stringify(beforeDraft)) {
      throw new Error(`saved plan row changed for ${beforeId}`);
    }
  }

  return after;
}

async function run() {
  const { data: planBeforeData, error: planBeforeError } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', PLAN_DOCUMENT_KEY)
    .maybeSingle();

  if (planBeforeError) {
    throw planBeforeError;
  }

  const planBefore = summarizePlanRows(planBeforeData?.data?.rowDrafts);
  const count = await verifyCount();
  const sample = await verifyList();
  const updatedName = await verifyCrud();
  const planAfter = await verifyPlanUnchanged(planBefore);

  console.log('Department items post-migration verification OK');
  console.log(`department_items count: ${count}`);
  console.log(`sample rows: ${sample.length}`);
  for (const row of sample) {
    console.log(`  ${row.department_id} / ${row.item_key} / ${row.item_name}`);
  }
  console.log(`CRUD probe updated name: ${updatedName}`);
  console.log(`inventory plan saved rows unchanged: ${planAfter.savedRows}`);
}

run().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
