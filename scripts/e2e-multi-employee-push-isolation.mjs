/**
 * Multi-employee live push isolation check.
 * Sends a unique manual push per active linked employee and verifies
 * history rows are employee-scoped (no cross-link).
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const stamp = new Date().toISOString().slice(11, 19);
const targets = [
  { id: 'ws-01', name: 'Ahmed Shabban' },
  { id: 'lw-04', name: 'Kamel Ahmed' },
];

const results = [];

for (const target of targets) {
  const title = `Isolation E2E ${stamp} → ${target.id}`;
  const body = `Identity isolation test for ${target.name} (${target.id}).`;

  console.log('\n--- Sending to', target.id, target.name, '---');
  const { data, error } = await client.functions.invoke('shift-reminder', {
    body: {
      mode: 'manual',
      audience: 'employee',
      employeeId: target.id,
      title,
      body,
      triggeredBy: 'primary-admin-kamel',
    },
    headers: {
      'x-owner-id': 'primary-admin-kamel',
    },
  });

  console.log('invoke error:', error?.message ?? null);
  console.log('invoke data:', JSON.stringify(data, null, 2));

  await new Promise((r) => setTimeout(r, 2500));

  const history = await client
    .from('push_notification_history')
    .select(
      'id, status, error_message, onesignal_player_id, title_en, laundry_employee_id, created_at',
    )
    .eq('title_en', title)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('history rows:', JSON.stringify(history.data, null, 2));

  const ownRows = (history.data ?? []).filter(
    (row) => row.laundry_employee_id === target.id,
  );
  const foreignRows = (history.data ?? []).filter(
    (row) => row.laundry_employee_id && row.laundry_employee_id !== target.id,
  );

  const sent = Number(data?.sent ?? 0);
  const ok =
    !error &&
    data?.ok === true &&
    sent >= 1 &&
    ownRows.some((row) => row.status === 'sent' && row.onesignal_player_id) &&
    foreignRows.length === 0;

  results.push({
    target: target.id,
    name: target.name,
    ok,
    sent,
    invokeOk: data?.ok === true,
    ownHistorySent: ownRows.filter((r) => r.status === 'sent').length,
    foreignHistoryCount: foreignRows.length,
    playerIds: ownRows.map((r) => r.onesignal_player_id),
    error: error?.message ?? data?.error ?? null,
  });
}

console.log('\n========== MULTI-EMPLOYEE E2E SUMMARY ==========');
console.log(JSON.stringify(results, null, 2));

const allOk = results.every((r) => r.ok);
if (!allOk) {
  console.error('FAIL: one or more employee deliveries failed or crossed.');
  process.exit(1);
}

// Cross-check: player IDs must be unique across employees for this run.
const allPlayers = results.flatMap((r) => r.playerIds.filter(Boolean));
const uniquePlayers = new Set(allPlayers);
if (allPlayers.length !== uniquePlayers.size) {
  console.error('FAIL: shared OneSignal player id across employees in this run');
  process.exit(1);
}

console.log('PASS: each employee got their own delivery; no shared player ids.');
