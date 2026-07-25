/**
 * Heal stale employee_linked_devices using ONLY subscriptions owned by the
 * same laundry employee (ownership isolation). Never uses admin subscription pools.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: devices, error } = await client
    .from('employee_linked_devices')
    .select(
      'laundry_employee_id, onesignal_player_id, device_label, paired_by_admin_id',
    )
    .eq('status', 'active');
  if (error) {
    throw error;
  }

  const heals = [];
  for (const device of devices ?? []) {
    const linkedId = device.onesignal_player_id?.trim();
    const laundryId = device.laundry_employee_id?.trim();
    if (!linkedId || !laundryId) continue;

    let { data: subs, error: subError } = await client
      .from('onesignal_subscriptions')
      .select('onesignal_player_id, is_valid, updated_at, ownership')
      .eq('laundry_employee_id', laundryId)
      .eq('ownership', 'laundry_employee')
      .order('updated_at', { ascending: false });

    if (subError) {
      const fallback = await client
        .from('onesignal_subscriptions')
        .select('onesignal_player_id, is_valid, updated_at')
        .eq('laundry_employee_id', laundryId)
        .order('updated_at', { ascending: false });
      subs = fallback.data;
      subError = fallback.error;
    }
    if (subError) {
      console.warn('skip', laundryId, subError.message);
      continue;
    }

    const newest = (subs ?? []).find(
      (row) => row.onesignal_player_id?.trim() && row.is_valid !== false,
    );
    const newestId = newest?.onesignal_player_id?.trim();
    if (newestId && newestId !== linkedId) {
      heals.push({
        laundryEmployeeId: laundryId,
        from: linkedId,
        to: newestId,
      });
    }
  }

  if (heals.length === 0) {
    console.log(
      'No employee-scoped heal required — linked devices match laundry-owned subscriptions.',
    );
    return;
  }

  console.log('Applying employee-scoped heals:', heals);
  for (const heal of heals) {
    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from('employee_linked_devices')
      .update({
        onesignal_player_id: heal.to,
        last_synced_at: now,
        subscription_status: 'active',
        updated_at: now,
      })
      .eq('laundry_employee_id', heal.laundryEmployeeId)
      .eq('status', 'active')
      .eq('onesignal_player_id', heal.from);

    if (updateError) {
      console.warn('direct update failed, RPC', updateError.message);
      const { data, error: rpcError } = await client.rpc(
        'sync_onesignal_subscription_rotation',
        {
          p_old_id: heal.from,
          p_new_id: heal.to,
          p_device_label: 'web',
          p_laundry_employee_id: heal.laundryEmployeeId,
          p_admin_employee_id: null,
          p_primary_admin_device_id: null,
        },
      );
      if (rpcError) {
        console.error('RPC failed', rpcError.message);
        continue;
      }
      if (data && typeof data === 'object' && data.blocked) {
        console.warn('RPC blocked cross-employee rotation', data);
        continue;
      }
    }

    await client
      .from('onesignal_subscriptions')
      .update({ is_valid: false, updated_at: now })
      .eq('onesignal_player_id', heal.from)
      .eq('laundry_employee_id', heal.laundryEmployeeId);
  }

  console.log('Done.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
