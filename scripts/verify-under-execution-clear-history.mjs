/**
 * Verify Clear History RPC uses DELETE ... WHERE TRUE and stays admin-gated.
 * Does not disable DB safety; does not touch inventory_under_execution for clear.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('1) Resolve admin actor...');
  const admins = await client
    .from('admin_users')
    .select('id, role, is_owner')
    .or('is_owner.eq.true,role.in.(OWNER,SUPER_ADMIN,ADMIN)')
    .limit(1);
  if (admins.error) throw new Error(admins.error.message);
  assert((admins.data?.length ?? 0) > 0, 'no admin user found');
  const actor = admins.data[0];
  console.log(`   PASS — actor role=${actor.role}`);

  console.log('2) Seed one history row...');
  const items = await client
    .from('inventory_items')
    .select('code, name, name_ar')
    .is('deleted_at', null)
    .limit(1);
  if (items.error) throw new Error(items.error.message);
  const item = items.data[0];
  const seeded = await client
    .from('inventory_under_execution_history')
    .insert({
      supplier: 'CLEAR-TEST',
      supplier_name: 'CLEAR-TEST-NAME',
      item_code: item?.code ?? '',
      item_name: item?.name || item?.name_ar || 'CLEAR-TEST-ITEM',
      quantity: 1,
      date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (seeded.error) throw new Error(seeded.error.message);

  const activeBefore = await client
    .from('inventory_under_execution')
    .select('id', { count: 'exact', head: true });
  if (activeBefore.error) throw new Error(activeBefore.error.message);
  const activeCountBefore = activeBefore.count ?? 0;

  console.log('3) Direct table DELETE still blocked...');
  await client
    .from('inventory_under_execution_history')
    .delete()
    .eq('id', seeded.data.id);
  const stillThere = await client
    .from('inventory_under_execution_history')
    .select('id')
    .eq('id', seeded.data.id)
    .maybeSingle();
  assert(stillThere.data?.id === seeded.data.id, 'direct delete should stay blocked');
  console.log('   PASS — RLS still blocks direct delete');

  console.log('4) Reject clear with fake actor...');
  const denied = await client.rpc(
    'admin_clear_inventory_under_execution_history',
    { p_actor_id: 'not-a-real-admin' },
  );
  assert(Boolean(denied.error), 'expected permission denied for fake actor');
  console.log('   PASS — permission check works');

  console.log('5) Clear History RPC (DELETE WHERE TRUE)...');
  const cleared = await client.rpc(
    'admin_clear_inventory_under_execution_history',
    { p_actor_id: actor.id },
  );
  if (cleared.error) throw new Error(cleared.error.message);
  console.log(`   PASS — cleared count=${cleared.data}`);

  const historyAfter = await client
    .from('inventory_under_execution_history')
    .select('id', { count: 'exact', head: true });
  if (historyAfter.error) throw new Error(historyAfter.error.message);
  assert((historyAfter.count ?? 0) === 0, 'history not empty after clear');

  const activeAfter = await client
    .from('inventory_under_execution')
    .select('id', { count: 'exact', head: true });
  if (activeAfter.error) throw new Error(activeAfter.error.message);
  assert(
    (activeAfter.count ?? 0) === activeCountBefore,
    'active under execution was modified by clear',
  );
  console.log('   PASS — history empty; active list untouched');

  console.log('\nALL CHECKS PASSED: Clear History RPC');
}

main().catch((error) => {
  console.error('\nFAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
