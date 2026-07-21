import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadEnv } from 'vite';

const PROJECT_REF = 'dtpotzigctinidoxgooo';

function listFunctionSlugs() {
  const functionsDir = join(process.cwd(), 'supabase', 'functions');
  return readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
    .map((entry) => entry.name)
    .sort();
}

function runSupabase(args, env) {
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(`supabase ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function verifyFunction(url, anonKey, functionSlug) {
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${functionSlug}`;

  const optionsResponse = await fetch(endpoint, { method: 'OPTIONS' });
  if (!optionsResponse.ok) {
    throw new Error(
      `OPTIONS ${functionSlug} failed: HTTP ${optionsResponse.status}`,
    );
  }

  const manualResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'x-owner-id': 'primary-admin-kamel',
    },
    body: JSON.stringify({
      mode: 'manual',
      audience: 'shift_tomorrow',
      triggeredBy: 'primary-admin-kamel',
    }),
  });

  const manualBody = await manualResponse.json().catch(() => ({}));
  if (!manualResponse.ok) {
    throw new Error(
      `POST ${functionSlug} failed (${manualResponse.status}): ${JSON.stringify(manualBody)}`,
    );
  }

  return { endpoint, manualBody };
}

async function run() {
  const envFile = loadEnv('development', process.cwd(), '');
  const accessToken =
    envFile.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  const oneSignalAppId =
    envFile.ONESIGNAL_APP_ID ||
    envFile.VITE_ONESIGNAL_APP_ID ||
    process.env.ONESIGNAL_APP_ID;
  const oneSignalRestKey =
    envFile.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY;
  const cronSecret =
    envFile.SHIFT_REMINDER_CRON_SECRET ||
    process.env.SHIFT_REMINDER_CRON_SECRET ||
    randomBytes(24).toString('hex');
  const url = envFile.VITE_SUPABASE_URL;
  const anonKey = envFile.VITE_SUPABASE_ANON_KEY;

  if (!accessToken) {
    throw new Error(
      'Missing SUPABASE_ACCESS_TOKEN in .env.local (Supabase Dashboard → Account → Access Tokens).',
    );
  }
  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }
  if (!oneSignalAppId) {
    throw new Error('Missing ONESIGNAL_APP_ID or VITE_ONESIGNAL_APP_ID.');
  }
  if (!oneSignalRestKey) {
    throw new Error(
      'Missing ONESIGNAL_REST_API_KEY in .env.local (OneSignal Dashboard → Keys & IDs).',
    );
  }

  const slugs = listFunctionSlugs();
  console.log('Edge Functions in repo:', slugs.join(', ') || '(none)');

  const childEnv = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: accessToken,
  };

  const secretArgs = [
    'secrets',
    'set',
    `ONESIGNAL_APP_ID=${oneSignalAppId}`,
    `ONESIGNAL_REST_API_KEY=${oneSignalRestKey}`,
    `SHIFT_REMINDER_CRON_SECRET=${cronSecret}`,
    '--project-ref',
    PROJECT_REF,
  ];
  console.log('Setting Edge Function secrets…');
  runSupabase(secretArgs, childEnv);

  for (const slug of slugs) {
    console.log(`Deploying ${slug}…`);
    runSupabase(
      [
        'functions',
        'deploy',
        slug,
        '--project-ref',
        PROJECT_REF,
        '--use-api',
        '--no-verify-jwt',
      ],
      childEnv,
    );
  }

  console.log('Listing deployed functions…');
  runSupabase(['functions', 'list', '--project-ref', PROJECT_REF], childEnv);

  for (const slug of slugs) {
    const verification = await verifyFunction(url, anonKey, slug);
    console.log(`Verified ${slug}:`, JSON.stringify(verification.manualBody));
  }

  console.log('Edge Function deployment and verification complete.');
}

run().catch((error) => {
  console.error('Deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
