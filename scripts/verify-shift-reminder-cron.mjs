/**
 * Prove automatic cron invoke of shift-reminder.
 * Temporarily sets shift_reminder_time to current Cairo HH:MM,
 * waits for pg_cron tick, then checks triggered_by='cron' history.
 * Never prints secrets.
 */
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function getCairoHHMM(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function dbQuery(sql) {
  const path = join(process.cwd(), 'scripts', '.tmp-verify-cron.sql');
  writeFileSync(path, sql, 'utf8');
  try {
    const result = spawnSync(
      'npx',
      ['supabase', 'db', 'query', '--linked', '-f', path],
      { cwd: process.cwd(), encoding: 'utf8', shell: true },
    );
    return result;
  } finally {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
}

const before = await client
  .from('push_notification_history')
  .select('id', { count: 'exact', head: true })
  .eq('triggered_by', 'cron');

console.log('cron history rows before:', before.count ?? 0);

// Confirm job active
const jobCheck = dbQuery(`
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'shift-reminder-every-minute';
`);
console.log('cron.job status:');
console.log((jobCheck.stdout || '').slice(0, 800));

const cairoNow = getCairoHHMM();
console.log('Setting shift_reminder_time to Cairo now:', cairoNow);

const upsert = dbQuery(`
UPDATE app_settings
SET value = '${cairoNow}', updated_at = now()
WHERE key = 'shift_reminder_time';

INSERT INTO app_settings (key, value, updated_at)
SELECT 'shift_reminder_time', '${cairoNow}', now()
WHERE NOT EXISTS (
  SELECT 1 FROM app_settings WHERE key = 'shift_reminder_time'
);

SELECT key, value, updated_at FROM app_settings WHERE key = 'shift_reminder_time';
`);
if (upsert.status !== 0) {
  console.error('Failed to update reminder time');
  console.error(upsert.stderr);
  process.exit(1);
}
console.log('reminder time update: OK');

// Optionally force an immediate invoke once via SQL (still uses same vault path)
console.log('Triggering invoke_shift_reminder_cron() once immediately…');
const once = dbQuery(`SELECT public.invoke_shift_reminder_cron() AS request_id;`);
console.log('immediate invoke exit:', once.status);
console.log((once.stdout || '').replace(/eyJ[a-zA-Z0-9._-]+/g, '[REDACTED]').slice(0, 600));

// Wait for function + history writes
console.log('Waiting 25s for Edge Function + history…');
await new Promise((r) => setTimeout(r, 25_000));

const after = await client
  .from('push_notification_history')
  .select(
    'id, created_at, triggered_by, type, audience, status, laundry_employee_id, title_en, error_message',
  )
  .eq('triggered_by', 'cron')
  .order('created_at', { ascending: false })
  .limit(20);

console.log('\n=== cron-triggered history ===');
console.log('error:', after.error);
console.log('count returned:', after.data?.length ?? 0);
console.log(
  JSON.stringify(
    (after.data ?? []).map((r) => ({
      created_at: r.created_at,
      triggered_by: r.triggered_by,
      type: r.type,
      audience: r.audience,
      status: r.status,
      laundry_employee_id: r.laundry_employee_id,
      title_en: r.title_en,
      error_message: r.error_message,
    })),
    null,
    2,
  ),
);

const ok = (after.data ?? []).length > 0;
console.log('\nCRON_PROOF=', ok ? 'PASS' : 'FAIL');

// Also show recent cron run details if available
const runs = dbQuery(`
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 5;
`);
console.log('\nRecent cron.job_run_details:');
console.log((runs.stdout || '').replace(/eyJ[a-zA-Z0-9._-]+/g, '[REDACTED]').slice(0, 1500));

if (!ok) process.exit(1);
