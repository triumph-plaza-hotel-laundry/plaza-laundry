import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

async function loadCredentials() {
  const env = loadEnv('development', process.cwd(), '');
  let password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  let accessToken = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  const url = env.VITE_SUPABASE_URL;

  if (!password && !accessToken && env.VERCEL_OIDC_TOKEN) {
    try {
      const project = JSON.parse(
        readFileSync(join(process.cwd(), '.vercel', 'project.json'), 'utf8'),
      );
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${project.projectId}/env?decrypt=true`,
        { headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}` } },
      );

      if (response.ok) {
        const payload = await response.json();
        for (const entry of payload.envs ?? []) {
          if (!password && entry.key === 'SUPABASE_DB_PASSWORD') {
            password = entry.value;
          }
          if (!accessToken && entry.key === 'SUPABASE_ACCESS_TOKEN') {
            accessToken = entry.value;
          }
        }
      }
    } catch {
      // fall through
    }
  }

  return { password, accessToken, url };
}

const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
  'me-central-1',
  'af-south-1',
];

async function connectPostgres(password, url) {
  const { default: postgres } = await import('postgres');
  const ref = new URL(url).hostname.split('.')[0];

  const attempts = [
    { host: `db.${ref}.supabase.co`, port: 5432, username: 'postgres' },
    ...regions.flatMap((region) => [
      {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        username: `postgres.${ref}`,
      },
      {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 5432,
        username: `postgres.${ref}`,
      },
    ]),
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const sql = postgres({
        host: attempt.host,
        port: attempt.port,
        database: 'postgres',
        username: attempt.username,
        password,
        ssl: 'require',
        max: 1,
        connect_timeout: 8,
      });
      await sql`select 1`;
      return sql;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Could not connect to Postgres');
}

async function run() {
  const { password, url } = await loadCredentials();
  if (!password || !url) {
    console.error(
      'Missing SUPABASE_DB_PASSWORD or VITE_SUPABASE_URL. Alternatively run supabase/manual/app_settings_setup.sql in the SQL Editor.',
    );
    process.exit(1);
  }

  const sqlFile = readFileSync(
    join(process.cwd(), 'supabase/manual/app_settings_setup.sql'),
    'utf8',
  );
  const sql = await connectPostgres(password, url);
  try {
    await sql.unsafe(sqlFile);
    const rows = await sql`
      select key, value from app_settings where key = 'shift_reminder_time'
    `;
    console.log('app_settings ready:', rows);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error('Apply failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
