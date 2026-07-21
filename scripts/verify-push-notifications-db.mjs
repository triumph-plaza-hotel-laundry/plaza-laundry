import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const client = createClient(url, anonKey);

async function run() {
  const { data, error } = await client
    .from('push_notification_history')
    .select('id')
    .limit(1);

  if (error) {
    throw new Error(
      `push_notification_history is not available via API: ${error.code ?? ''} ${error.message}`,
    );
  }

  console.log('push_notification_history OK — schema cache is up to date.');
  console.log(`Rows sampled: ${data?.length ?? 0}`);
}

run().catch((error) => {
  console.error('Verify failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
