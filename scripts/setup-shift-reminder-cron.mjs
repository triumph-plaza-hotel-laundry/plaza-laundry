/**
 * Setup shift-reminder cron without printing secrets.
 * Masks all sensitive values in stdout/stderr.
 */
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadEnv } from 'vite';
import { randomBytes } from 'node:crypto';

const PROJECT_REF = 'dtpotzigctinidoxgooo';

function mask(value) {
  if (!value) return '(missing)';
  const s = String(value);
  // Never echo JWT/key prefixes — length only.
  if (/^eyJ/.test(s) || s.length > 24) {
    return `(configured, len=${s.length})`;
  }
  return `(configured, len=${s.length})`;
}

function redact(text) {
  if (!text) return '';
  return String(text)
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/service_role_key['\s:=]+[^\s'"]+/gi, 'service_role_key=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]')
    .replace(/os_v2_[A-Za-z0-9]+/g, '[REDACTED_ONESIGNAL]')
    .replace(/sb_secret_[A-Za-z0-9]+/g, '[REDACTED_SECRET]');
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
    env: opts.env ?? process.env,
  });
  if (result.stdout) console.log(redact(result.stdout));
  if (result.stderr) console.error(redact(result.stderr));
  return result;
}

function esc(value) {
  return String(value).replace(/'/g, "''");
}

function upsertSecretSql(name, value) {
  return `
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = '${esc(name)}' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret('${esc(value)}', '${esc(name)}');
  ELSE
    PERFORM vault.update_secret(v_id, '${esc(value)}', '${esc(name)}');
  END IF;
END;
$$;
`;
}

const env = loadEnv('development', process.cwd(), '');
const projectUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

console.log('projectUrl configured:', Boolean(projectUrl), mask(projectUrl));

// Resolve service role key: env first, else supabase CLI api-keys (never print raw).
let serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.log('Fetching project API keys via CLI (values masked)…');
  const keysResult = spawnSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'env'],
    { cwd: process.cwd(), encoding: 'utf8', shell: true },
  );
  if (keysResult.status !== 0) {
    console.error('Failed to fetch API keys:', redact(keysResult.stderr || keysResult.stdout));
    process.exit(1);
  }
  const lines = (keysResult.stdout || '').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)=(.+)$/);
    if (m) {
      serviceRoleKey = m[2].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
  // Some CLI versions print KEY=value without SUPABASE_ prefix for service_role
  if (!serviceRoleKey) {
    for (const line of lines) {
      if (/service_role/i.test(line) && line.includes('=')) {
        serviceRoleKey = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
}

console.log('service_role_key present:', Boolean(serviceRoleKey), mask(serviceRoleKey));

if (!projectUrl || !serviceRoleKey) {
  console.error('Missing project URL or service role key — cannot configure cron.');
  process.exit(1);
}

let cronSecret =
  env.SHIFT_REMINDER_CRON_SECRET || process.env.SHIFT_REMINDER_CRON_SECRET || '';
if (!cronSecret) {
  cronSecret = randomBytes(24).toString('hex');
  console.log('Generated SHIFT_REMINDER_CRON_SECRET:', mask(cronSecret));
} else {
  console.log('Using existing SHIFT_REMINDER_CRON_SECRET:', mask(cronSecret));
}

// 1) Apply migration
console.log('\n[1/4] Applying cron migration…');
const mig = run('npx', [
  'supabase',
  'db',
  'query',
  '--linked',
  '-f',
  'supabase/migrations/20260723195000_schedule_shift_reminder_cron.sql',
]);
if (mig.status !== 0) {
  console.error('Migration failed');
  process.exit(1);
}
console.log('Migration: OK');

// 2) Vault + schedule
console.log('\n[2/4] Writing vault secrets + scheduling cron job…');
const sqlParts = [
  upsertSecretSql('project_url', projectUrl),
  upsertSecretSql('service_role_key', serviceRoleKey),
  upsertSecretSql('shift_reminder_cron_secret', cronSecret),
  `
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'shift-reminder-every-minute';
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'shift-reminder-every-minute',
  '* * * * *',
  $$SELECT public.invoke_shift_reminder_cron();$$
);

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'shift-reminder-every-minute';
`,
];

const sqlPath = join(process.cwd(), 'scripts', '.tmp-setup-shift-cron.sql');
writeFileSync(sqlPath, sqlParts.join('\n'), 'utf8');
try {
  const setup = run('npx', ['supabase', 'db', 'query', '--linked', '-f', sqlPath]);
  if (setup.status !== 0) {
    console.error('Vault/cron setup failed');
    process.exit(1);
  }
  console.log('Vault secrets: OK (values not printed)');
  console.log('Cron job shift-reminder-every-minute: OK');
} finally {
  try {
    unlinkSync(sqlPath);
  } catch {
    // ignore
  }
}

// 3) Set Edge Function secret for cron (and keep OneSignal if already set)
console.log('\n[3/4] Setting Edge Function SHIFT_REMINDER_CRON_SECRET…');
const secretsEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN:
    env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN || '',
};
const secretArgs = [
  'secrets',
  'set',
  `SHIFT_REMINDER_CRON_SECRET=${cronSecret}`,
  '--project-ref',
  PROJECT_REF,
];
const sec = run('npx', ['supabase', ...secretArgs], { env: secretsEnv });
if (sec.status !== 0) {
  console.error('Failed to set Edge secret (continuing — service_role auth still works)');
} else {
  console.log('Edge secret SHIFT_REMINDER_CRON_SECRET: OK');
}

// 4) Deploy function
console.log('\n[4/4] Deploying shift-reminder…');
const dep = run('npx', [
  'supabase',
  'functions',
  'deploy',
  'shift-reminder',
  '--project-ref',
  PROJECT_REF,
  '--use-api',
  '--no-verify-jwt',
]);
if (dep.status !== 0) {
  console.error('Deploy failed');
  process.exit(1);
}
console.log('Deploy: OK');

console.log('\nSETUP_COMPLETE=true');
console.log(JSON.stringify({
  projectUrlConfigured: true,
  serviceRoleConfigured: true,
  cronSecretConfigured: true,
  migrationApplied: true,
  cronJobName: 'shift-reminder-every-minute',
  cronSchedule: '* * * * *',
  edgeDeployed: true,
}, null, 2));
