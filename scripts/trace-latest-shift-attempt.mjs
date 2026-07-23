/**
 * Trace the MOST RECENT manual shift_tomorrow attempt only.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const LIVE_SUB = '826fb30f-0adc-4314-a9b7-98cf1c45442b';

const latestBatch = await client
  .from('push_notification_history')
  .select('*')
  .eq('audience', 'shift_tomorrow')
  .eq('type', 'shift_manual')
  .order('created_at', { ascending: false })
  .limit(20);

console.log('=== LATEST shift_tomorrow history (20) ===');
console.log('error', latestBatch.error);

const rows = latestBatch.data ?? [];
if (rows.length === 0) {
  console.log('No shift_tomorrow rows found');
  process.exit(0);
}

// Group by approximate send window (same second / minute)
const newest = rows[0];
const newestTs = new Date(newest.created_at).getTime();
const sameBatch = rows.filter(
  (r) => Math.abs(new Date(r.created_at).getTime() - newestTs) < 60_000,
);

console.log('\n=== MOST RECENT BATCH ===');
console.log({
  invocationApprox: newest.created_at,
  audience: newest.audience,
  type: newest.type,
  triggeredBy: newest.triggeredBy ?? newest.triggered_by,
  targetDate: newest.target_date,
  batchSize: sameBatch.length,
});

console.log('\nemployee outcomes:');
for (const row of sameBatch.sort((a, b) =>
  String(a.laundry_employee_id).localeCompare(String(b.laundry_employee_id)),
)) {
  console.log({
    employeeId: row.laundry_employee_id,
    status: row.status,
    subscriptionId: row.onesignal_player_id,
    error: row.error_message,
    title: row.title_en,
    created_at: row.created_at,
  });
}

const wts = sameBatch.find((r) => r.laundry_employee_id === 'wts-01');
console.log('\n=== wts-01 in this batch ===');
console.log(wts ?? 'NOT IN BATCH');

const attempts = await client
  .from('notification_delivery_attempts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(15);

console.log('\n=== recent delivery attempts ===');
for (const a of attempts.data ?? []) {
  console.log({
    created_at: a.created_at,
    subscriptionId: a.onesignal_player_id,
    http_status: a.http_status,
    status: a.status,
    onesignal_notification_id: a.onesignal_notification_id,
    recipients: a.recipients,
    error: a.error_message,
    response_body: a.response_body,
  });
}

const liveAttempts = (attempts.data ?? []).filter(
  (a) => a.onesignal_player_id === LIVE_SUB,
);
console.log('\n=== attempts for LIVE subscription', LIVE_SUB, '===');
console.log(JSON.stringify(liveAttempts.slice(0, 5), null, 2));

// Compare latest shift vs latest employee-direct for same sub
const direct = await client
  .from('push_notification_history')
  .select('*')
  .eq('audience', 'employee')
  .eq('laundry_employee_id', 'wts-01')
  .eq('status', 'sent')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\n=== recent successful DIRECT (employee) for wts-01 ===');
console.log(
  JSON.stringify(
    (direct.data ?? []).map((r) => ({
      created_at: r.created_at,
      audience: r.audience,
      title: r.title_en,
      bodyPreview: String(r.body_en ?? '').slice(0, 120),
      subscriptionId: r.onesignal_player_id,
      status: r.status,
    })),
    null,
    2,
  ),
);

console.log('\n=== DIFF shift vs direct (wts-01 latest sent each) ===');
const latestShiftSent = sameBatch.find(
  (r) => r.laundry_employee_id === 'wts-01' && r.status === 'sent',
);
const latestDirect = direct.data?.[0];
if (latestShiftSent && latestDirect) {
  console.log({
    shift: {
      at: latestShiftSent.created_at,
      title: latestShiftSent.title_en,
      bodyLen: String(latestShiftSent.body_en ?? '').length,
      bodyPreview: String(latestShiftSent.body_en ?? '').slice(0, 200),
      subscriptionId: latestShiftSent.onesignal_player_id,
    },
    direct: {
      at: latestDirect.created_at,
      title: latestDirect.title_en,
      bodyLen: String(latestDirect.body_en ?? '').length,
      bodyPreview: String(latestDirect.body_en ?? '').slice(0, 200),
      subscriptionId: latestDirect.onesignal_player_id,
    },
    sameSubscription:
      latestShiftSent.onesignal_player_id === latestDirect.onesignal_player_id,
  });
}

const events = await client
  .from('notification_platform_events')
  .select('*')
  .eq('category', 'delivery')
  .order('created_at', { ascending: false })
  .limit(8);
console.log('\n=== recent delivery events ===');
console.log(
  JSON.stringify(
    (events.data ?? []).map((e) => ({
      created_at: e.created_at,
      message: e.message,
      onesignal_player_id: e.onesignal_player_id,
      payload: e.payload,
      final_status: e.final_status,
    })),
    null,
    2,
  ),
);

// Linked device current
const linked = await client
  .from('employee_linked_devices')
  .select('*')
  .eq('laundry_employee_id', 'wts-01')
  .eq('status', 'active')
  .maybeSingle();
console.log('\n=== active linked device wts-01 ===');
console.log(linked.data);

const acceptedForLive = liveAttempts.find(
  (a) =>
    a.status === 'sent' &&
    a.http_status === 200 &&
    a.onesignal_notification_id &&
    Math.abs(new Date(a.created_at).getTime() - newestTs) < 120_000,
);
console.log('\n=== OneSignal accepted for live sub in this batch window? ===');
console.log(
  acceptedForLive
    ? {
        yes: true,
        at: acceptedForLive.created_at,
        notificationId: acceptedForLive.onesignal_notification_id,
        response: acceptedForLive.response_body,
        subscriptionId: acceptedForLive.onesignal_player_id,
      }
    : { yes: false, note: 'No matching sent attempt for live sub near batch time' },
);
