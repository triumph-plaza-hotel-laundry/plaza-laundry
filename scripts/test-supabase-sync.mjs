import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const client = createClient(url, anonKey);
const testKey = 'tpl-sync-test';
const marker = `sync-test-${Date.now()}`;

async function run() {
  const writePayload = { marker, checkedAt: new Date().toISOString() };

  const { error: writeError } = await client.from('app_data_documents').upsert(
    {
      document_key: testKey,
      data: writePayload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'document_key' },
  );

  if (writeError) {
    throw writeError;
  }

  const { data, error: readError } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', testKey)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const readMarker = data?.data && typeof data.data === 'object' ? data.data.marker : undefined;
  if (readMarker !== marker) {
    throw new Error(`Read mismatch: expected ${marker}, received ${readMarker ?? 'null'}`);
  }

  await client.from('app_data_documents').delete().eq('document_key', testKey);

  console.log('Supabase save/read round-trip OK');
}

run().catch((error) => {
  console.error('Supabase sync test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
