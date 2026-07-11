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

const PROBE_CODE_PREFIX = 'INV-PERM-PROBE-';
const PRIMARY_ADMIN_ID = 'primary-admin-kamel';
const ALL_PERMISSIONS = [
  'inventory.add',
  'inventory.edit',
  'inventory.enable_disable',
  'inventory.delete',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function tableReady(name) {
  const { error } = await client.from(name).select('*').limit(1);
  if (error) {
    throw new Error(`${name}: ${error.code ?? error.message}`);
  }
}

async function countInventoryItems() {
  const { count, error } = await client
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (error) {
    throw new Error(`inventory_items count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function findProbeAdmin() {
  const { data, error } = await client
    .from('admin_users')
    .select('id, role')
    .in('role', ['ADMIN', 'OWNER', 'SUPER_ADMIN'])
    .eq('is_active', true);

  if (error) {
    throw new Error(`admin_users lookup failed: ${error.message}`);
  }

  return data?.find((user) => user.role === 'ADMIN') ?? data?.[0] ?? null;
}

async function verifyRoleSeed() {
  const { data: owners, error: ownerError } = await client
    .from('admin_inventory_permissions')
    .select('user_id, permission')
    .in('permission', ALL_PERMISSIONS);

  if (ownerError) {
    throw new Error(`permission seed probe failed: ${ownerError.message}`);
  }

  const { data: ownerUsers, error: usersError } = await client
    .from('admin_users')
    .select('id, role')
    .in('role', ['OWNER', 'SUPER_ADMIN']);

  if (usersError) {
    throw new Error(`owner users probe failed: ${usersError.message}`);
  }

  for (const owner of ownerUsers ?? []) {
    const grants = new Set((owners ?? []).filter((row) => row.user_id === owner.id).map((row) => row.permission));
    for (const permission of ALL_PERMISSIONS) {
      assert(grants.has(permission), `OWNER/SUPER_ADMIN ${owner.id} missing ${permission}`);
    }
  }

  const { data: adminUsers } = await client.from('admin_users').select('id, role').eq('role', 'ADMIN');
  for (const admin of adminUsers ?? []) {
    const grants = new Set((owners ?? []).filter((row) => row.user_id === admin.id).map((row) => row.permission));
    assert(grants.has('inventory.add'), `ADMIN ${admin.id} missing inventory.add`);
    assert(grants.has('inventory.edit'), `ADMIN ${admin.id} missing inventory.edit`);
    assert(grants.has('inventory.enable_disable'), `ADMIN ${admin.id} missing inventory.enable_disable`);
    assert(!grants.has('inventory.delete'), `ADMIN ${admin.id} should not have inventory.delete`);
  }
}

async function cleanupProbeRows() {
  const { data: probeItems } = await client
    .from('inventory_items')
    .select('id, code')
    .like('code', `${PROBE_CODE_PREFIX}%`);

  for (const item of probeItems ?? []) {
    await client.from('inventory_items').delete().eq('id', item.id);
  }
}

async function createProbeItem(codeSuffix) {
  const code = `${PROBE_CODE_PREFIX}${codeSuffix}`;
  const { data: sortRow } = await client
    .from('inventory_items')
    .select('sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await client
    .from('inventory_items')
    .insert({
      code,
      name: `Probe ${codeSuffix}`,
      name_ar: `Probe ${codeSuffix}`,
      name_en: `Probe ${codeSuffix}`,
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
    .select('id, code, disabled_at')
    .single();

  if (error) {
    throw new Error(`probe insert failed: ${error.message}`);
  }

  return data;
}

async function verifyDisableHidesFromActiveQuery(itemId) {
  const { error: disableError } = await client
    .from('inventory_items')
    .update({ disabled_at: new Date().toISOString() })
    .eq('id', itemId);

  if (disableError) {
    throw new Error(`disable probe failed: ${disableError.message}`);
  }

  const { data: activeRows, error: activeError } = await client
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .is('deleted_at', null)
    .is('disabled_at', null);

  if (activeError) {
    throw new Error(`active query failed: ${activeError.message}`);
  }

  assert((activeRows ?? []).length === 0, 'disabled item still appears in active query');

  const { data: managedRows, error: managedError } = await client
    .from('inventory_items')
    .select('id, disabled_at')
    .eq('id', itemId)
    .is('deleted_at', null)
    .maybeSingle();

  if (managedError) {
    throw new Error(`managed query failed: ${managedError.message}`);
  }

  assert(Boolean(managedRows?.disabled_at), 'disabled item missing from managed query');

  await client.from('inventory_items').update({ disabled_at: null }).eq('id', itemId);
}

async function verifyDeleteBlockedWithReferences(itemId) {
  const { error: receiptError } = await client.from('inventory_receipts').insert({
    item_id: itemId,
    supplier: 'probe',
    receiver: 'probe',
    employee: 'probe',
    quantity: 1,
    notes: 'probe',
  });

  if (receiptError) {
    throw new Error(`probe receipt insert failed: ${receiptError.message}`);
  }

  const { error: deleteError } = await client.from('inventory_items').delete().eq('id', itemId);
  assert(deleteError, 'delete should be blocked by receipt reference');

  await client.from('inventory_receipts').delete().eq('item_id', itemId);
}

async function verifyDeleteAllowedWithoutReferences(itemId) {
  const { error } = await client.from('inventory_items').delete().eq('id', itemId);
  if (error) {
    throw new Error(`probe delete without references failed: ${error.message}`);
  }
}

async function verifyPrimaryAdminPermissions(allPermissionRows) {
  const { data: primaryUser, error } = await client
    .from('admin_users')
    .select('id, username, role, is_owner, is_protected')
    .eq('id', PRIMARY_ADMIN_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`primary admin lookup failed: ${error.message}`);
  }

  if (primaryUser) {
    const grants = new Set(
      (allPermissionRows ?? [])
        .filter((row) => row.user_id === PRIMARY_ADMIN_ID)
        .map((row) => row.permission),
    );

    for (const permission of ALL_PERMISSIONS) {
      assert(grants.has(permission), `Primary admin ${PRIMARY_ADMIN_ID} missing ${permission}`);
    }
  }

  console.log(
    primaryUser
      ? `Primary admin DB permissions OK (${PRIMARY_ADMIN_ID})`
      : `Primary admin app fallback OK (${PRIMARY_ADMIN_ID} not in admin_users; isPrimaryAdminAccount grants all)`,
  );
}

async function verifyPermissionCrud(admin) {
  const adminId = admin.id;

  const { error: grantError } = await client.from('admin_inventory_permissions').upsert(
    [{ user_id: adminId, permission: 'inventory.edit' }],
    { onConflict: 'user_id,permission' },
  );

  if (grantError) {
    throw new Error(`permission grant failed: ${grantError.message}`);
  }

  const { data: granted, error: listError } = await client
    .from('admin_inventory_permissions')
    .select('permission')
    .eq('user_id', adminId);

  if (listError) {
    throw new Error(`permission list failed: ${listError.message}`);
  }

  const permissions = new Set((granted ?? []).map((row) => row.permission));
  assert(permissions.has('inventory.edit'), 'grant missing inventory.edit');

  if (admin.role === 'ADMIN') {
    assert(!permissions.has('inventory.delete'), 'ADMIN should not have inventory.delete by default');

    const { error: tempDeleteGrant } = await client.from('admin_inventory_permissions').upsert(
      [{ user_id: adminId, permission: 'inventory.delete' }],
      { onConflict: 'user_id,permission' },
    );

    if (tempDeleteGrant) {
      throw new Error(`temp delete grant failed: ${tempDeleteGrant.message}`);
    }

    const { error: revokeError } = await client
      .from('admin_inventory_permissions')
      .delete()
      .eq('user_id', adminId)
      .eq('permission', 'inventory.delete');

    if (revokeError) {
      throw new Error(`permission revoke failed: ${revokeError.message}`);
    }

    const { data: afterRevoke } = await client
      .from('admin_inventory_permissions')
      .select('permission')
      .eq('user_id', adminId);

    const remaining = new Set((afterRevoke ?? []).map((row) => row.permission));
    assert(!remaining.has('inventory.delete'), 'revoke failed for inventory.delete');
    assert(remaining.has('inventory.add'), 'ADMIN lost inventory.add during revoke probe');
    assert(remaining.has('inventory.enable_disable'), 'ADMIN lost inventory.enable_disable during revoke probe');
  } else {
    for (const permission of ALL_PERMISSIONS) {
      assert(permissions.has(permission), `${admin.role} ${adminId} missing ${permission}`);
    }
  }
}

async function verifyDisabledAtColumn() {
  const { data, error } = await client
    .from('inventory_items')
    .select('disabled_at')
    .limit(1);

  if (error) {
    throw new Error(`disabled_at column probe failed: ${error.message}`);
  }

  assert(Array.isArray(data), 'disabled_at column probe returned unexpected payload');
}

async function run() {
  console.log('verify:inventory-permissions — starting');

  await tableReady('admin_inventory_permissions');
  await verifyDisabledAtColumn();
  await cleanupProbeRows();

  const beforeCount = await countInventoryItems();

  const { data: allPermissionRows, error: allPermissionError } = await client
    .from('admin_inventory_permissions')
    .select('user_id, permission');

  if (allPermissionError) {
    throw new Error(`permission rows probe failed: ${allPermissionError.message}`);
  }

  await verifyRoleSeed();
  await verifyPrimaryAdminPermissions(allPermissionRows);

  const admin = await findProbeAdmin();
  assert(admin, 'No active admin user found for permission CRUD probe');
  await verifyPermissionCrud(admin);

  await cleanupProbeRows();

  const disableProbe = await createProbeItem('DISABLE');
  await verifyDisableHidesFromActiveQuery(disableProbe.id);
  await client.from('inventory_items').delete().eq('id', disableProbe.id);

  const blockedDeleteProbe = await createProbeItem('BLOCKED');
  await verifyDeleteBlockedWithReferences(blockedDeleteProbe.id);
  await client.from('inventory_items').delete().eq('id', blockedDeleteProbe.id);

  const allowedDeleteProbe = await createProbeItem('DELETE');
  await verifyDeleteAllowedWithoutReferences(allowedDeleteProbe.id);

  const afterCount = await countInventoryItems();
  assert(beforeCount === afterCount, `inventory row count changed (${beforeCount} -> ${afterCount})`);

  console.log('verify:inventory-permissions — all checks passed');
}

run().catch((error) => {
  console.error('verify:inventory-permissions failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
