import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
const url = env.VITE_SUPABASE_URL;

if (!password || !url) {
  console.error('Missing SUPABASE_DB_PASSWORD or VITE_SUPABASE_URL.');
  console.error('Add SUPABASE_DB_PASSWORD to .env.local, or run supabase/manual/department_items_setup.sql in the Supabase SQL Editor.');
  process.exit(1);
}

const ref = new URL(url).hostname.split('.')[0];
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

async function connectPostgres() {
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

  throw new Error('Could not connect to Supabase Postgres with configured credentials.');
}

async function run() {
  const sqlFile = join(process.cwd(), 'supabase', 'manual', 'department_items_setup.sql');
  const body = readFileSync(sqlFile, 'utf8');
  const sql = await connectPostgres();

  try {
    await sql.unsafe(body);
    console.log('department_items setup applied successfully.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error('Apply failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
