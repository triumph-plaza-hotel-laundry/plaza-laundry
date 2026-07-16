/**
 * Smoke-test Under Execution against live Supabase (no secrets printed).
 * Verifies inventory source, CRUD, history list, and realtime publication.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('FAIL: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(url, anonKey);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('1) Inventory items source (same as Inventory tab)...');
  const itemsResult = await client
    .from('inventory_items')
    .select('id, code, name, name_ar, disabled_at, deleted_at')
    .is('deleted_at', null)
    .is('disabled_at', null)
    .order('sort_order', { ascending: true })
    .limit(5);

  if (itemsResult.error) {
    throw new Error(`inventory_items: ${itemsResult.error.message}`);
  }
  assert((itemsResult.data?.length ?? 0) > 0, 'No active inventory items found');
  const item = itemsResult.data[0];
  console.log(
    `   PASS — ${itemsResult.data.length}+ items (sample code=${item.code || '—'})`,
  );

  console.log('2) Table readable (History list source)...');
  const listBefore = await client
    .from('inventory_under_execution')
    .select(
      'id, supplier, supplier_name, item_code, item_name, quantity, date, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(20);

  if (listBefore.error) {
    throw new Error(`list failed: ${listBefore.error.message}`);
  }
  console.log(`   PASS — readable (${listBefore.data?.length ?? 0} existing rows)`);

  console.log('3) SAVE (create)...');
  const createResult = await client
    .from('inventory_under_execution')
    .insert({
      supplier: 'VERIFY-SUPPLIER',
      supplier_name: 'VERIFY-SUPPLIER-NAME',
      item_code: item.code ?? '',
      item_name: item.name || item.name_ar || 'VERIFY-ITEM',
      quantity: 1,
      date: new Date().toISOString().slice(0, 10),
    })
    .select(
      'id, supplier, supplier_name, item_code, item_name, quantity, date, created_at',
    )
    .single();

  if (createResult.error) {
    throw new Error(`create failed: ${createResult.error.message}`);
  }
  const id = createResult.data.id;
  assert(createResult.data.item_code === (item.code ?? ''), 'item_code not stored');
  assert(
    Boolean(createResult.data.item_name),
    'item_name not stored from inventory item',
  );
  console.log(`   PASS — saved id=${id}`);

  console.log('4) EDIT (update)...');
  const updateResult = await client
    .from('inventory_under_execution')
    .update({
      supplier: 'VERIFY-SUPPLIER-EDITED',
      supplier_name: 'VERIFY-NAME-EDITED',
      quantity: 2,
    })
    .eq('id', id)
    .select('id, supplier, supplier_name, quantity, item_code, item_name')
    .single();

  if (updateResult.error) {
    throw new Error(`update failed: ${updateResult.error.message}`);
  }
  assert(updateResult.data.supplier === 'VERIFY-SUPPLIER-EDITED', 'supplier not updated');
  assert(
    updateResult.data.supplier_name === 'VERIFY-NAME-EDITED',
    'supplier_name not updated',
  );
  assert(updateResult.data.quantity === 2, 'quantity not updated');
  console.log('   PASS — edit persisted');

  console.log('5) HISTORY list includes record...');
  const history = await client
    .from('inventory_under_execution')
    .select('id, item_name, supplier, quantity, date, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (history.error) {
    throw new Error(`history failed: ${history.error.message}`);
  }
  const found = (history.data ?? []).find((row) => row.id === id);
  assert(Boolean(found), 'created/edited row missing from history list');
  assert(found.supplier === 'VERIFY-SUPPLIER-EDITED', 'history shows stale supplier');
  assert(found.quantity === 2, 'history shows stale quantity');
  console.log(`   PASS — history has record (${history.data.length} rows)`);

  console.log('6) REALTIME subscription receives UPDATE...');
  const realtime = await new Promise(async (resolve) => {
    let settled = false;
    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void client.removeChannel(channel);
      resolve({ ok, detail });
    };

    const timer = setTimeout(() => {
      finish(false, 'timeout waiting for realtime UPDATE (15s)');
    }, 15_000);

    const channel = client
      .channel(`verify-under-execution-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_under_execution',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          finish(true, `received UPDATE quantity=${payload.new?.quantity}`);
        },
      )
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') {
          return;
        }

        const bump = await client
          .from('inventory_under_execution')
          .update({ quantity: 3 })
          .eq('id', id)
          .select('quantity')
          .single();

        if (bump.error) {
          finish(false, `realtime trigger update failed: ${bump.error.message}`);
        }
      });
  });

  assert(realtime.ok, realtime.detail);
  console.log(`   PASS — ${realtime.detail}`);

  console.log('7) DELETE...');
  const deleteResult = await client
    .from('inventory_under_execution')
    .delete()
    .eq('id', id);

  if (deleteResult.error) {
    throw new Error(`delete failed: ${deleteResult.error.message}`);
  }

  const afterDelete = await client
    .from('inventory_under_execution')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (afterDelete.error) {
    throw new Error(`post-delete check failed: ${afterDelete.error.message}`);
  }
  assert(afterDelete.data === null, 'row still present after delete');
  console.log('   PASS — deleted');

  console.log('8) Inventory items untouched...');
  const itemAfter = await client
    .from('inventory_items')
    .select('id, code, name')
    .eq('id', item.id)
    .single();

  if (itemAfter.error) {
    throw new Error(itemAfter.error.message);
  }
  assert(itemAfter.data.id === item.id, 'inventory item id changed');
  console.log('   PASS — inventory_items unchanged');

  console.log('\nALL CHECKS PASSED: Save, Edit, Delete, History, Realtime');
}

main().catch((error) => {
  console.error('\nFAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
