/**
 * Heal stale employee_linked_devices rows when a fresher valid
 * onesignal_subscriptions id exists for the same admin + device_label.
 */
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function findStale() {
  const { data: devices, error } = await client
    .from('employee_linked_devices')
    .select(
      'laundry_employee_id, onesignal_player_id, device_label, paired_by_admin_id',
    )
    .eq('status', 'active');
  if (error) {
    throw error;
  }

  const { data: subs } = await client
    .from('onesignal_subscriptions')
    .select('employee_id, onesignal_player_id, device, is_valid, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  const heals = [];
  for (const device of devices ?? []) {
    const linkedId = device.onesignal_player_id?.trim();
    const adminId = device.paired_by_admin_id?.trim();
    const label = device.device_label?.trim();
    if (!linkedId || !adminId) continue;

    const candidates = (subs ?? []).filter((row) => {
      if (row.employee_id !== adminId) return false;
      if (row.is_valid === false) return false;
      if (label && row.device && row.device !== label) return false;
      return Boolean(row.onesignal_player_id?.trim());
    });
    const newest = candidates[0]?.onesignal_player_id?.trim();
    if (newest && newest !== linkedId) {
      heals.push({
        laundryEmployeeId: device.laundry_employee_id,
        from: linkedId,
        to: newest,
      });
    }
  }
  return heals;
}

function esc(value) {
  return String(value).replace(/'/g, "''");
}

async function run() {
  const heals = await findStale();
  if (heals.length === 0) {
    console.log('No DB heal required — linked devices already match freshest subs.');
    return;
  }

  console.log('Applying DB heal for:', heals);
  const statements = heals.flatMap((heal) => [
    `UPDATE employee_linked_devices
SET onesignal_player_id = '${esc(heal.to)}',
    last_synced_at = now(),
    subscription_status = 'active',
    updated_at = now()
WHERE laundry_employee_id = '${esc(heal.laundryEmployeeId)}'
  AND status = 'active'
  AND onesignal_player_id = '${esc(heal.from)}';`,
    `UPDATE onesignal_subscriptions
SET is_valid = false,
    updated_at = now()
WHERE onesignal_player_id = '${esc(heal.from)}';`,
  ]);

  statements.push(
    `SELECT laundry_employee_id, onesignal_player_id, status, subscription_status
FROM employee_linked_devices
WHERE status = 'active'
ORDER BY laundry_employee_id;`,
  );

  const sqlPath = join(process.cwd(), 'scripts', '.tmp-heal-push.sql');
  writeFileSync(sqlPath, `${statements.join('\n\n')}\n`, 'utf8');

  try {
    const result = spawnSync(
      'npx',
      ['supabase', 'db', 'query', '--linked', '-f', sqlPath],
      { cwd: process.cwd(), encoding: 'utf8', shell: true },
    );
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    if (result.status !== 0) {
      throw new Error(`Heal SQL failed with exit ${result.status}`);
    }
    console.log('DB heal applied.');
  } finally {
    try {
      unlinkSync(sqlPath);
    } catch {
      // ignore
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
