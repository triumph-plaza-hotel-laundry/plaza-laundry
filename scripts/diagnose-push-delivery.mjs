/**
 * Diagnose OneSignal delivery readiness for employee-linked devices.
 * Detects stale linked subscription ids vs freshest onesignal_subscriptions.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function run() {
  console.log('\n=== 1) push_notification_history reachable ===');
  {
    const { data, error } = await client
      .from('push_notification_history')
      .select('id')
      .limit(1);
    if (error) {
      fail(error.message);
      return;
    }
    console.log('OK — rows sampled:', data?.length ?? 0);
  }

  console.log('\n=== 2) active linked devices ===');
  const { data: devices, error: devicesError } = await client
    .from('employee_linked_devices')
    .select(
      'id, laundry_employee_id, onesignal_player_id, status, subscription_status, device_label, paired_by_admin_id, updated_at',
    )
    .eq('status', 'active');
  if (devicesError) {
    fail(devicesError.message);
    return;
  }
  console.log(JSON.stringify(devices, null, 2));

  console.log('\n=== 3) onesignal_subscriptions (recent) ===');
  const { data: subs, error: subsError } = await client
    .from('onesignal_subscriptions')
    .select(
      'employee_id, onesignal_player_id, laundry_employee_id, device, is_valid, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(30);
  if (subsError) {
    fail(subsError.message);
    return;
  }
  console.log(JSON.stringify(subs, null, 2));

  console.log('\n=== 4) stale-link detection ===');
  const stale = [];
  for (const device of devices ?? []) {
    const linkedId = device.onesignal_player_id?.trim();
    const adminId = device.paired_by_admin_id?.trim();
    const label = device.device_label?.trim();
    if (!adminId || !linkedId) {
      console.log('SKIP (missing admin/linked id)', device.laundry_employee_id);
      continue;
    }

    const candidates = (subs ?? []).filter((row) => {
      if (row.employee_id !== adminId) return false;
      if (row.is_valid === false) return false;
      if (label && row.device && row.device !== label) return false;
      return Boolean(row.onesignal_player_id?.trim());
    });

    const newest = candidates[0]?.onesignal_player_id?.trim() ?? null;
    const linkedStillFresh = newest === linkedId;
    const row = {
      laundry_employee_id: device.laundry_employee_id,
      linkedId,
      newestId: newest,
      stale: Boolean(newest && !linkedStillFresh),
      candidates: candidates.map((c) => c.onesignal_player_id),
    };
    console.log(JSON.stringify(row));
    if (row.stale) {
      stale.push(row);
    }
  }

  console.log('\n=== 5) recent delivery attempts ===');
  const { data: attempts, error: attemptsError } = await client
    .from('notification_delivery_attempts')
    .select(
      'onesignal_player_id, http_status, recipients, onesignal_notification_id, status, error_message, response_body, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(8);
  if (attemptsError) {
    console.warn('attempts unavailable:', attemptsError.message);
  } else {
    console.log(JSON.stringify(attempts, null, 2));
  }

  console.log('\n=== 6) recent history ===');
  const { data: history } = await client
    .from('push_notification_history')
    .select(
      'status, error_message, onesignal_player_id, laundry_employee_id, title_en, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(8);
  console.log(JSON.stringify(history, null, 2));

  console.log('\n=== SUMMARY ===');
  if (stale.length === 0) {
    console.log('No stale linked subscriptions detected.');
    console.log('NEEDS_DB_HEAL=false');
  } else {
    console.log(`Stale linked subscriptions: ${stale.length}`);
    for (const item of stale) {
      console.log(
        `  ${item.laundry_employee_id}: ${item.linkedId} -> ${item.newestId}`,
      );
    }
    console.log('NEEDS_DB_HEAL=true');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
