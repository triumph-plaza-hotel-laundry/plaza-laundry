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
const SELECT_COLUMNS =
  'id, department_id, item_key, item_name, variant_key, unit, sort_order, created_at, updated_at';

async function run() {
  const probe = await client.from('department_items').select('id').limit(1);
  if (probe.error) {
    throw new Error(`department_items table unavailable: ${probe.error.message}`);
  }

  const { data, error, count } = await client
    .from('department_items')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .order('department_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(5);

  if (error) {
    throw error;
  }

  const departments = await client
    .from('department_items')
    .select('department_id')
    .order('department_id', { ascending: true });

  if (departments.error) {
    throw departments.error;
  }

  const uniqueDepartments = [...new Set((departments.data ?? []).map((row) => row.department_id))];

  console.log('Department items verification OK');
  console.log(`Total rows: ${count ?? data?.length ?? 0}`);
  console.log(`Departments with items: ${uniqueDepartments.length}`);
  console.log('Sample rows:');
  for (const row of data ?? []) {
    console.log(`  ${row.department_id} / ${row.item_key} / ${row.item_name}`);
  }
}

run().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
