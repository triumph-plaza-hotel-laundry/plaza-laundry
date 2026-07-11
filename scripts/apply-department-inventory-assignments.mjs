import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

async function loadCredentials() {
  const env = loadEnv('development', process.cwd(), '');
  let password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  let accessToken = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  const url = env.VITE_SUPABASE_URL;

  if ((!password && !accessToken) && env.VERCEL_OIDC_TOKEN) {
    try {
      const project = JSON.parse(readFileSync(join(process.cwd(), '.vercel', 'project.json'), 'utf8'));
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

async function connectPostgres(ref, password) {
  const { default: postgres } = await import('postgres');
  const attempts = [
    { host: `db.${ref}.supabase.co`, port: 5432, username: 'postgres' },
    ...regions.flatMap((region) => [
      { host: `aws-0-${region}.pooler.supabase.com`, port: 6543, username: `postgres.${ref}` },
      { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, username: `postgres.${ref}` },
      { host: `aws-1-${region}.pooler.supabase.com`, port: 6543, username: `postgres.${ref}` },
    ]),
  ];

  for (const attempt of attempts) {
    try {
      const sql = postgres({
        ...attempt,
        database: 'postgres',
        password,
        ssl: 'require',
        connect_timeout: 10,
        max: 1,
      });
      await sql`select 1 as ok`;
      return sql;
    } catch {
      // try next endpoint
    }
  }

  return null;
}

async function applyViaManagementApi(ref, accessToken, sqlBody) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sqlBody }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Management API apply failed (${response.status}): ${message}`);
  }
}

async function run() {
  const { password, accessToken, url } = await loadCredentials();
  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL.');
  }

  const ref = new URL(url).hostname.split('.')[0];
  const sqlBody = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '20260711170000_department_inventory_assignments.sql'),
    'utf8',
  );

  if (password) {
    const sql = await connectPostgres(ref, password);
    if (sql) {
      try {
        await sql.unsafe(sqlBody);
        console.log('department_inventory_assignments migration applied successfully (postgres).');
        return;
      } finally {
        await sql.end({ timeout: 5 });
      }
    }
  }

  if (accessToken) {
    await applyViaManagementApi(ref, accessToken, sqlBody);
    console.log('department_inventory_assignments migration applied successfully (management API).');
    return;
  }

  throw new Error(
    'No database credentials available. Add SUPABASE_DB_PASSWORD or SUPABASE_ACCESS_TOKEN to .env.local, or run supabase/manual/department_inventory_assignments_setup.sql in the Supabase SQL Editor.',
  );
}

run().catch((error) => {
  console.error('Apply failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
