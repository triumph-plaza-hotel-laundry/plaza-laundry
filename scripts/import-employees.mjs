import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const client = createClient(url, anonKey);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const employees = JSON.parse(readFileSync(join(scriptDir, 'employees-data.json'), 'utf8'));
const shifts = JSON.parse(readFileSync(join(scriptDir, 'shifts-default-data.json'), 'utf8'));

const { error: employeesError } = await client.from('app_data_documents').upsert(
  {
    document_key: 'tpl-employees-v1',
    data: employees,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (employeesError) {
  console.error('Failed to import employees:', employeesError.message);
  process.exit(1);
}

const { error: shiftsError } = await client.from('app_data_documents').upsert(
  {
    document_key: 'tpl-shifts',
    data: shifts,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (shiftsError) {
  console.error('Failed to import shifts:', shiftsError.message);
  process.exit(1);
}

const { data, error: readError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', 'tpl-employees-v1')
  .maybeSingle();

if (readError) {
  console.error('Failed to verify employees:', readError.message);
  process.exit(1);
}

const stored = Array.isArray(data?.data) ? data.data : [];

if (stored.length !== 20) {
  console.error(`Expected 20 employees, found ${stored.length}.`);
  process.exit(1);
}

const names = stored.map((entry) => entry?.name?.en ?? '');
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicates.length > 0) {
  console.error(`Duplicate employee names found: ${duplicates.join(', ')}`);
  process.exit(1);
}

console.log(`Imported ${stored.length} employees to Supabase.`);
console.log('Refreshed shift schedule with manager IDs excluded from assignments.');
console.log('Verification OK: 20 unique employees stored.');
