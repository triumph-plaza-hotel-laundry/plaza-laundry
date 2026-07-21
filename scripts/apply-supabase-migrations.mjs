import { loadEnv } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const env = loadEnv('development', process.cwd(), '');
const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];

if (!password || !ref) {
  console.error('Missing SUPABASE_DB_PASSWORD or VITE_SUPABASE_URL.');
  process.exit(1);
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

const REALTIME_TABLES = [
  'app_data_documents',
  'inventory_items',
  'inventory_receipts',
  'inventory_issues',
  'inventory_under_execution',
  'inventory_under_execution_history',
  'inventory_movements',
  'department_items',
  'department_item_categories',
  'department_inventory_assignments',
  'admin_inventory_permissions',
  'admin_users',
  'audit_log_entries',
  'washing_programs',
  'washing_program_parameters',
  'washing_program_steps',
  'laundry_chemicals',
  'chemical_technical_info',
  'onesignal_subscriptions',
  'push_notification_history',
];

async function connectPostgres() {
  const { default: postgres } = await import('postgres');

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
      {
        host: `aws-1-${region}.pooler.supabase.com`,
        port: 6543,
        username: `postgres.${ref}`,
      },
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
  const sql = await connectPostgres();
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const body = readFileSync(join(migrationsDir, file), 'utf8');
      await sql.unsafe(body);
    }

    for (const table of REALTIME_TABLES) {
      await sql.unsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = '${table}'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};
          END IF;
        END $$;
      `);
    }

    await sql.unsafe(`NOTIFY pgrst, 'reload schema';`);

    console.log('Migrations applied, Realtime enabled, PostgREST schema reloaded.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error('Setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
