import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const client = createClient(url, anonKey);

const tables = [
  'app_data_documents',
  'admin_users',
  'audit_log_entries',
  'inventory_items',
  'inventory_receipts',
  'inventory_issues',
  'inventory_movements',
  'washing_programs',
  'washing_program_parameters',
  'washing_program_steps',
  'laundry_chemicals',
  'chemical_technical_info',
];

const documentKeys = [
  'tpl-employees-v1',
  'tpl-shifts',
  'tpl-leaves-v1',
  'tpl-price-list-v2',
  'tpl-fabrics-v1',
  'tpl-stains-v1',
  'tpl-care-symbols-v1',
  'tpl-home-content-v1',
  'tpl-training',
  'tpl-ai-settings-v1',
  'tpl-inventory-archives-v1',
];

async function checkTable(name) {
  const { error } = await client.from(name).select('*').limit(1);
  if (error) {
    throw new Error(`${name}: ${error.code ?? error.message}`);
  }
}

async function checkDocuments() {
  const { data, error } = await client
    .from('app_data_documents')
    .select('document_key')
    .in('document_key', documentKeys);

  if (error) {
    throw error;
  }

  const found = new Set((data ?? []).map((row) => row.document_key));
  const missing = documentKeys.filter((key) => !found.has(key));
  return { seeded: documentKeys.length - missing.length, missing };
}

async function checkRealtime() {
  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    return 'skipped (no DB password for Realtime check)';
  }

  const ref = new URL(url).hostname.split('.')[0];
  const { default: postgres } = await import('postgres');
  const regions = ['eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'us-east-1', 'ap-south-1', 'me-central-1'];
  let sql;

  const attempts = [
    { host: `db.${ref}.supabase.co`, port: 5432, username: 'postgres' },
    ...regions.flatMap((region) => [
      { host: `aws-0-${region}.pooler.supabase.com`, port: 6543, username: `postgres.${ref}` },
    ]),
  ];

  for (const attempt of attempts) {
    try {
      sql = postgres({ ...attempt, database: 'postgres', password, ssl: 'require', connect_timeout: 8, max: 1 });
      await sql`select 1`;
      break;
    } catch {
      sql = undefined;
    }
  }

  if (!sql) {
    return 'skipped (db connection unavailable)';
  }

  try {
    const rows = await sql`
      SELECT tablename
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
    `;
    const enabled = new Set(rows.map((row) => row.tablename));
    const required = [
      'app_data_documents',
      'inventory_items',
      'inventory_receipts',
      'inventory_issues',
      'inventory_movements',
      'admin_users',
      'audit_log_entries',
      'washing_programs',
      'washing_program_parameters',
      'washing_program_steps',
      'laundry_chemicals',
      'chemical_technical_info',
    ];
    const missing = required.filter((table) => !enabled.has(table));
    return missing.length === 0 ? 'enabled on all required tables' : `missing Realtime: ${missing.join(', ')}`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function checkInventoryItems() {
  const { count, error } = await client
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function checkCatalogCounts() {
  const [programs, parameters, steps, chemicals, technical] = await Promise.all([
    client.from('washing_programs').select('*', { count: 'exact', head: true }),
    client.from('washing_program_parameters').select('*', { count: 'exact', head: true }),
    client.from('washing_program_steps').select('*', { count: 'exact', head: true }),
    client.from('laundry_chemicals').select('*', { count: 'exact', head: true }),
    client.from('chemical_technical_info').select('*', { count: 'exact', head: true }),
  ]);

  for (const [name, result] of [
    ['washing_programs', programs],
    ['washing_program_parameters', parameters],
    ['washing_program_steps', steps],
    ['laundry_chemicals', chemicals],
    ['chemical_technical_info', technical],
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    programs: programs.count ?? 0,
    parameters: parameters.count ?? 0,
    steps: steps.count ?? 0,
    chemicals: chemicals.count ?? 0,
    technical: technical.count ?? 0,
  };
}

async function run() {
  for (const table of tables) {
    await checkTable(table);
  }

  const docs = await checkDocuments();
  const realtime = await checkRealtime();
  const inventoryCount = await checkInventoryItems();
  const catalog = await checkCatalogCounts();

  console.log('Supabase verification OK');
  console.log(`Tables accessible: ${tables.length}`);
  console.log(`Inventory items seeded: ${inventoryCount}`);
  console.log(`Document seeds in Supabase: ${docs.seeded}/${documentKeys.length}`);
  console.log(
    `Programs catalog: ${catalog.programs} programs, ${catalog.parameters} parameters, ${catalog.steps} steps`,
  );
  console.log(`Chemicals catalog: ${catalog.chemicals} chemicals, ${catalog.technical} technical rows`);
  console.log(`Realtime: ${realtime}`);

  if (inventoryCount < 41) {
    console.warn(`Expected at least 41 inventory items, found ${inventoryCount}. Run npm run seed:supabase.`);
  }

  if (catalog.programs < 13) {
    console.warn(`Expected 13 washing programs, found ${catalog.programs}. Run npm run seed:supabase.`);
  }

  if (catalog.chemicals < 11) {
    console.warn(`Expected 11 laundry chemicals, found ${catalog.chemicals}. Run npm run seed:supabase.`);
  }

  if (docs.missing.length > 0) {
    console.log('Documents not yet seeded (will seed on first app load):', docs.missing.length);
  }
}

run().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
