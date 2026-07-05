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
const documentKey = 'tpl-employees-v1';

const { error } = await client.from('app_data_documents').upsert(
  {
    document_key: documentKey,
    data: [],
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (error) {
  console.error('Failed to clear employees:', error.message);
  process.exit(1);
}

const { count, error: countError } = await client
  .from('app_data_documents')
  .select('data', { count: 'exact', head: true })
  .eq('document_key', documentKey);

if (countError) {
  console.error('Failed to verify employees document:', countError.message);
  process.exit(1);
}

const { data, error: readError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', documentKey)
  .maybeSingle();

if (readError) {
  console.error('Failed to read employees document:', readError.message);
  process.exit(1);
}

const employees = Array.isArray(data?.data) ? data.data : null;

if (!employees || employees.length !== 0) {
  console.error('Employees document was not cleared.');
  process.exit(1);
}

console.log('Employees cleared from Supabase.');
console.log(`Document "${documentKey}" now contains 0 employees.`);
