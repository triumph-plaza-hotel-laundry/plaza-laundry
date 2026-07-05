import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

await import('@/data/repositories/price-list-repository');
await import('@/data/repositories/employees-repository');
await import('@/data/repositories/shifts-repository');
await import('@/data/repositories/leaves-repository');
await import('@/data/repositories/fabrics-repository');
await import('@/data/repositories/chemicals-repository');
await import('@/data/repositories/programs-repository');
await import('@/data/repositories/stains-repository');
await import('@/data/repositories/care-symbols-repository');
await import('@/data/repositories/home-content-repository');
await import('@/data/repositories/training-repository');
await import('@/data/repositories/ai-settings-repository');

const { initAllRepositories } = await import('@/data/repositories/repository-utils');
const { ensureUsersStoreReady } = await import('@/features/auth/users');
const { seedOfficialInventoryItems } = await import('@/features/inventory/service');

await initAllRepositories();
await ensureUsersStoreReady();
await seedOfficialInventoryItems();

const { getSupabaseClient } = await import('@/lib/supabase/client');
const client = getSupabaseClient();

const { count: documentCount } = await client!
  .from('app_data_documents')
  .select('*', { count: 'exact', head: true });

const { count: programCount } = await client!
  .from('washing_programs')
  .select('*', { count: 'exact', head: true });

const { count: chemicalCount } = await client!
  .from('laundry_chemicals')
  .select('*', { count: 'exact', head: true });

console.log(`Supabase data hydrated. app_data_documents count: ${documentCount ?? 0}`);
console.log(`Relational programs seeded: ${programCount ?? 0}`);
console.log(`Relational chemicals seeded: ${chemicalCount ?? 0}`);
