/**
 * Trace the 21:56 Cairo (18:56 UTC) manual notification only.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// 21:56 Cairo = 18:56 UTC on 2026-07-23
const WINDOW_START = '2026-07-23T18:55:00.000Z';
const WINDOW_END = '2026-07-23T18:59:00.000Z';
const COMPARE_START = '2026-07-23T18:43:00.000Z';
const COMPARE_END = '2026-07-23T18:46:00.000Z';

const ISLAM_NAMES = ['islam', 'eslam', 'abdelaziz', 'abdulaziz', 'عبدالعزيز', 'إسلام'];

function isIslam(row) {
  const hay = [
    row.laundry_employee_id,
    row.employee_name_en,
    row.employee_name_ar,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    ISLAM_NAMES.some((n) => hay.includes(n)) ||
    row.laundry_employee_id === 'lw-05'
  );
}

const history956 = await client
  .from('push_notification_history')
  .select('*')
  .gte('created_at', WINDOW_START)
  .lte('created_at', WINDOW_END)
  .order('created_at', { ascending: true });

console.log('=== HISTORY in 21:56 Cairo window (18:55-18:59 UTC) ===');
console.log('error', history956.error);
console.log('count', history956.data?.length ?? 0);

const rows = history956.data ?? [];
if (rows.length === 0) {
  // broaden search around evening
  const broad = await client
    .from('push_notification_history')
    .select(
      'created_at,audience,type,status,laundry_employee_id,employee_name_en,employee_name_ar,onesignal_player_id,title_en,error_message,triggered_by',
    )
    .gte('created_at', '2026-07-23T18:40:00.000Z')
    .order('created_at', { ascending: false })
    .limit(80);
  console.log('\n=== BROAD recent history after 18:40 UTC ===');
  for (const r of broad.data ?? []) {
    console.log(
      r.created_at,
      r.audience,
      r.status,
      r.laundry_employee_id,
      r.employee_name_en,
      r.onesignal_player_id?.slice(0, 8),
      r.title_en?.slice(0, 40),
      r.error_message,
    );
  }
  process.exit(0);
}

const audience = rows[0].audience;
const triggeredBy = rows[0].triggered_by;
const type = rows[0].type;
const title = rows[0].title_en;
const firstTs = rows[0].created_at;
const lastTs = rows[rows.length - 1].created_at;

console.log('\n=== INVOCATION SUMMARY ===');
console.log({
  invocationTimestamp: firstTs,
  invocationWindowEnd: lastTs,
  audience,
  type,
  triggeredBy,
  title,
  targetedCount: rows.length,
});

console.log('\n=== ALL TARGETED EMPLOYEES ===');
for (const r of rows) {
  console.log({
    employeeId: r.laundry_employee_id,
    nameEn: r.employee_name_en,
    nameAr: r.employee_name_ar,
    status: r.status,
    subscriptionId: r.onesignal_player_id,
    error: r.error_message,
    created_at: r.created_at,
  });
}

const islamRows = rows.filter(isIslam);
console.log('\n=== ISLAM ABDELAZIZ ===');
console.log(
  islamRows.length
    ? islamRows.map((r) => ({
        included: true,
        employeeId: r.laundry_employee_id,
        nameEn: r.employee_name_en,
        nameAr: r.employee_name_ar,
        status: r.status,
        subscriptionId: r.onesignal_player_id,
        error: r.error_message,
        title: r.title_en,
        bodyPreview: String(r.body_en ?? '').slice(0, 160),
      }))
    : {
        included: false,
        reason: 'No history row for Islam/Eslam/lw-05 in this invocation batch',
        allIds: rows.map((r) => r.laundry_employee_id),
      },
);

const sentRows = rows.filter((r) => r.status === 'sent');
const skippedRows = rows.filter((r) => r.status === 'skipped');
const failedRows = rows.filter((r) => r.status === 'failed');
console.log('\n=== STATUS COUNTS ===', {
  sent: sentRows.length,
  skipped: skippedRows.length,
  failed: failedRows.length,
});

// Delivery attempts near this window
const attempts = await client
  .from('notification_delivery_attempts')
  .select('*')
  .gte('created_at', WINDOW_START)
  .lte('created_at', WINDOW_END)
  .order('created_at', { ascending: true });

console.log('\n=== DELIVERY ATTEMPTS in 21:56 window ===');
console.log('count', attempts.data?.length ?? 0);
for (const a of attempts.data ?? []) {
  const view = a.response_body?.view;
  console.log({
    created_at: a.created_at,
    subscriptionId: a.onesignal_player_id,
    http_status: a.http_status,
    status: a.status,
    notificationId: a.onesignal_notification_id,
    error: a.error_message,
    createResponse: {
      id: a.response_body?.id,
      external_id: a.response_body?.external_id,
      errors: a.response_body?.errors,
    },
    viewCounters: view
      ? {
          successful: view.successful,
          failed: view.failed,
          errored: view.errored,
          received: view.received,
          converted: view.converted,
          headings: view.headings,
          contentsPreview: String(view.contents?.en ?? '').slice(0, 120),
          platform: view.platform_delivery_stats,
          include_player_ids: view.include_player_ids,
          isChromeWeb: view.isChromeWeb,
        }
      : null,
  });
}

// Compare 21:44 Cairo = 18:44 UTC only for contrast (brief)
const hist944 = await client
  .from('push_notification_history')
  .select(
    'created_at,audience,status,laundry_employee_id,employee_name_en,onesignal_player_id,title_en,error_message',
  )
  .gte('created_at', COMPARE_START)
  .lte('created_at', COMPARE_END)
  .order('created_at', { ascending: true });

const att944 = await client
  .from('notification_delivery_attempts')
  .select(
    'created_at,onesignal_player_id,http_status,status,onesignal_notification_id,response_body,error_message',
  )
  .gte('created_at', COMPARE_START)
  .lte('created_at', COMPARE_END)
  .order('created_at', { ascending: true });

console.log('\n=== CONTRAST ONLY: 21:44 Cairo batch (delivered) ===');
console.log({
  historyCount: hist944.data?.length ?? 0,
  sent: (hist944.data ?? []).filter((r) => r.status === 'sent'),
  attempts: (att944.data ?? []).map((a) => ({
    at: a.created_at,
    sub: a.onesignal_player_id,
    notif: a.onesignal_notification_id,
    status: a.status,
    successful: a.response_body?.view?.successful,
    failed: a.response_body?.view?.failed,
    errored: a.response_body?.view?.errored,
    title: a.response_body?.view?.headings?.en,
  })),
});

console.log('\n=== WHY 21:56 differed from 21:44 ===');
const islam = islamRows[0];
const sent956 = sentRows[0];
const att956 = attempts.data?.[0];
console.log({
  '21:44': {
    whoReceivedPush: 'wts-01 (linked device with live OneSignal sub)',
    subscription: '826fb30f-…',
    onesignalSuccessful: 1,
  },
  '21:56': {
    audience,
    islamIncluded: Boolean(islam),
    islamStatus: islam?.status ?? 'not in batch',
    islamSubscription: islam?.onesignal_player_id ?? null,
    islamError: islam?.error_message ?? null,
    anySent: sentRows.map((r) => ({
      id: r.laundry_employee_id,
      name: r.employee_name_en,
      sub: r.onesignal_player_id,
    })),
    onesignalAttempts: (attempts.data ?? []).length,
    onesignalNotificationId: att956?.onesignal_notification_id ?? null,
    onesignalSuccessful: att956?.response_body?.view?.successful ?? null,
  },
});
