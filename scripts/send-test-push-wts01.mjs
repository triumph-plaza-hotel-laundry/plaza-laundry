/**
 * Send a real manual push to laundry employee wts-01 via shift-reminder.
 * Exits non-zero unless invoke reports sent >= 1 and history row is sent
 * with a Onesignal notification id on a delivery attempt.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const title = `Delivery verify ${new Date().toISOString().slice(11, 19)} UTC`;
const body =
  'Live delivery test for wts-01 after stale-subscription heal. If you see this, push works.';

console.log('Sending test push to wts-01…', { title });

const { data, error } = await client.functions.invoke('shift-reminder', {
  body: {
    mode: 'manual',
    audience: 'employee',
    employeeId: 'wts-01',
    title,
    body,
    triggeredBy: 'primary-admin-kamel',
  },
  headers: {
    'x-owner-id': 'primary-admin-kamel',
  },
});

console.log('invoke error:', error);
console.log('invoke data:', JSON.stringify(data, null, 2));

if (error) {
  console.error('FAIL: function invoke error');
  process.exit(1);
}

if (!data?.ok || Number(data.sent) < 1) {
  console.error('FAIL: edge function did not report sent >= 1');
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 2500));

const history = await client
  .from('push_notification_history')
  .select(
    'id, status, error_message, onesignal_player_id, title_en, laundry_employee_id, created_at',
  )
  .eq('laundry_employee_id', 'wts-01')
  .eq('title_en', title)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

console.log('history row:', JSON.stringify(history.data, null, 2));
if (history.error || history.data?.status !== 'sent' || !history.data?.onesignal_player_id) {
  console.error('FAIL: history not marked sent for this notification');
  process.exit(1);
}

const attempts = await client
  .from('notification_delivery_attempts')
  .select(
    'onesignal_player_id, http_status, onesignal_notification_id, status, response_body, created_at',
  )
  .eq('onesignal_player_id', history.data.onesignal_player_id)
  .order('created_at', { ascending: false })
  .limit(1);

console.log('latest attempt:', JSON.stringify(attempts.data, null, 2));
const attempt = attempts.data?.[0];
if (
  !attempt ||
  attempt.status !== 'sent' ||
  attempt.http_status !== 200 ||
  !attempt.onesignal_notification_id
) {
  console.error('FAIL: delivery attempt missing OneSignal notification id');
  process.exit(1);
}

console.log('\nDELIVERY_OK=true');
console.log(
  JSON.stringify(
    {
      title,
      subscriptionId: history.data.onesignal_player_id,
      onesignalNotificationId: attempt.onesignal_notification_id,
      historyId: history.data.id,
    },
    null,
    2,
  ),
);
