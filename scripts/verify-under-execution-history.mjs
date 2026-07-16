/**
 * Verify immutable Under Execution History:
 * Save copies to history; Edit/Delete never change history.
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
  console.log('1) Load inventory item...');
  const items = await client
    .from('inventory_items')
    .select('id, code, name, name_ar')
    .is('deleted_at', null)
    .is('disabled_at', null)
    .limit(1);
  if (items.error) throw new Error(items.error.message);
  assert((items.data?.length ?? 0) > 0, 'no inventory items');
  const item = items.data[0];

  const historyBefore = await client
    .from('inventory_under_execution_history')
    .select('id', { count: 'exact', head: true });
  if (historyBefore.error) {
    throw new Error(
      `history table missing — apply inventory_under_execution_history_setup.sql: ${historyBefore.error.message}`,
    );
  }
  const historyCountBefore = historyBefore.count ?? 0;
  console.log(`   history rows before: ${historyCountBefore}`);

  console.log('2) SAVE → active + history insert...');
  const payload = {
    supplier: 'HIST-SUPPLIER',
    supplier_name: 'HIST-NAME',
    item_code: item.code ?? '',
    item_name: item.name || item.name_ar || 'HIST-ITEM',
    quantity: 1,
    date: new Date().toISOString().slice(0, 10),
  };

  const created = await client
    .from('inventory_under_execution')
    .insert(payload)
    .select('id, created_at')
    .single();
  if (created.error) throw new Error(created.error.message);
  const activeId = created.data.id;

  const histInsert = await client
    .from('inventory_under_execution_history')
    .insert({
      ...payload,
      created_at: created.data.created_at,
    })
    .select('id, supplier, quantity')
    .single();
  if (histInsert.error) throw new Error(histInsert.error.message);
  const historyId = histInsert.data.id;
  console.log(`   PASS — active=${activeId} history=${historyId}`);

  console.log('3) EDIT active only...');
  const updated = await client
    .from('inventory_under_execution')
    .update({ supplier: 'HIST-EDITED', quantity: 9 })
    .eq('id', activeId)
    .select('supplier, quantity')
    .single();
  if (updated.error) throw new Error(updated.error.message);
  assert(updated.data.supplier === 'HIST-EDITED', 'active not edited');

  const histAfterEdit = await client
    .from('inventory_under_execution_history')
    .select('supplier, quantity')
    .eq('id', historyId)
    .single();
  if (histAfterEdit.error) throw new Error(histAfterEdit.error.message);
  assert(histAfterEdit.data.supplier === 'HIST-SUPPLIER', 'history mutated on edit');
  assert(histAfterEdit.data.quantity === 1, 'history quantity mutated on edit');
  console.log('   PASS — history unchanged after edit');

  console.log('4) DELETE active only...');
  const deleted = await client
    .from('inventory_under_execution')
    .delete()
    .eq('id', activeId);
  if (deleted.error) throw new Error(deleted.error.message);

  const activeGone = await client
    .from('inventory_under_execution')
    .select('id')
    .eq('id', activeId)
    .maybeSingle();
  assert(activeGone.data === null, 'active still present');

  const histAfterDelete = await client
    .from('inventory_under_execution_history')
    .select('id, supplier')
    .eq('id', historyId)
    .single();
  if (histAfterDelete.error) throw new Error(histAfterDelete.error.message);
  assert(histAfterDelete.data.id === historyId, 'history removed on delete');
  console.log('   PASS — history remains after delete');

  console.log('5) History UPDATE blocked by RLS...');
  const blockedUpdate = await client
    .from('inventory_under_execution_history')
    .update({ supplier: 'SHOULD-NOT-WORK' })
    .eq('id', historyId)
    .select('id');
  // With no UPDATE policy, Supabase returns empty / error depending on version
  const stillOriginal = await client
    .from('inventory_under_execution_history')
    .select('supplier')
    .eq('id', historyId)
    .single();
  assert(stillOriginal.data?.supplier === 'HIST-SUPPLIER', 'history was updated via client');
  console.log(
    `   PASS — history immutable (update response rows=${blockedUpdate.data?.length ?? 0})`,
  );

  console.log('6) History DELETE blocked by RLS...');
  await client.from('inventory_under_execution_history').delete().eq('id', historyId);
  const stillThere = await client
    .from('inventory_under_execution_history')
    .select('id')
    .eq('id', historyId)
    .maybeSingle();
  assert(stillThere.data?.id === historyId, 'history was deleted via client');
  console.log('   PASS — history delete blocked');

  console.log('\nALL CHECKS PASSED: immutable history archive');
}

main().catch((error) => {
  console.error('\nFAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
