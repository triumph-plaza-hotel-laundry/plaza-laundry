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

const PROBE_CODE_PREFIX = 'INV-LINK-PROBE-';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function countPlanSlots() {
  const { data: categories, error } = await client
    .from('department_item_categories')
    .select('department_id, item_key');

  if (error) {
    throw new Error(`category probe failed: ${error.message}`);
  }

  const seen = new Set();
  for (const row of categories ?? []) {
    seen.add(`${row.department_id}:${row.item_key}`);
  }

  return seen.size;
}

async function cleanupProbe(code) {
  const { data: item } = await client
    .from('inventory_items')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (!item) {
    return;
  }

  await client.from('department_inventory_assignments').delete().eq('inventory_item_id', item.id);
  await client.from('inventory_items').delete().eq('id', item.id);
}

async function run() {
  console.log('verify:department-inventory-assignments — starting');

  const { error: tableError } = await client.from('department_inventory_assignments').select('id').limit(1);
  if (tableError) {
    throw new Error(`department_inventory_assignments: ${tableError.message}`);
  }

  const slotCount = await countPlanSlots();
  assert(slotCount > 0, 'No department plan slots found in department_item_categories');

  const probeCode = `${PROBE_CODE_PREFIX}${Date.now()}`;
  await cleanupProbe(probeCode);

  const { data: sortRow } = await client
    .from('inventory_items')
    .select('sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error: createError } = await client
    .from('inventory_items')
    .insert({
      code: probeCode,
      name: 'Assignment Probe Item',
      name_ar: 'Assignment Probe Item',
      name_en: 'Assignment Probe Item',
      total_quantity: 0,
      incoming_quantity: 0,
      issued_quantity: 0,
      remaining_quantity: 0,
      quantity: 0,
      minimum_quantity: 0,
      unit: 'piece',
      notes: '',
      sort_order: (sortRow?.sort_order ?? 0) + 1,
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`probe item insert failed: ${createError.message}`);
  }

  const { data: categories } = await client.from('department_item_categories').select('department_id, item_key');
  const slots = categories ?? [];

  const rows = slots.map((slot) => ({
    department_id: slot.department_id,
    item_key: slot.item_key,
    inventory_item_id: created.id,
    sort_order: 0,
  }));

  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error: linkError } = await client.from('department_inventory_assignments').upsert(chunk, {
      onConflict: 'department_id,item_key,inventory_item_id',
      ignoreDuplicates: true,
    });

    if (linkError) {
      throw new Error(`probe link failed: ${linkError.message}`);
    }
  }

  const { count, error: countError } = await client
    .from('department_inventory_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('inventory_item_id', created.id);

  if (countError) {
    throw new Error(`assignment count failed: ${countError.message}`);
  }

  assert((count ?? 0) >= slotCount, `expected at least ${slotCount} links, got ${count ?? 0}`);

  const sampleSlot = slots[0];
  const { data: sampleLinks, error: sampleError } = await client
    .from('department_inventory_assignments')
    .select('id, inventory_items:inventory_item_id ( name )')
    .eq('inventory_item_id', created.id)
    .eq('department_id', sampleSlot.department_id)
    .eq('item_key', sampleSlot.item_key)
    .limit(1);

  if (sampleError) {
    throw new Error(`sample join failed: ${sampleError.message}`);
  }

  assert((sampleLinks ?? []).length === 1, 'sample assignment join missing');

  await cleanupProbe(probeCode);

  console.log('verify:department-inventory-assignments — all checks passed');
}

run().catch((error) => {
  console.error(
    'verify:department-inventory-assignments failed:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
