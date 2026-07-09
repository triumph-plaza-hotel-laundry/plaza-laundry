import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const client = createClient(url, anonKey);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const documentKey = 'tpl-employees-v1';
const seedEmployees = JSON.parse(readFileSync(join(scriptDir, 'employees-data.json'), 'utf8'));

function normalizeJobTitle(value) {
  return String(value ?? '').trim().toLowerCase();
}

function mergeSeedEmployee(existing, seed) {
  return {
    ...seed,
    employeeId: seed.employeeId?.trim() || seed.id,
    status: seed.status === 'inactive' ? 'inactive' : 'active',
    phone: existing.phone ?? '',
    salary: existing.salary ?? '',
    hireDate: existing.hireDate ?? { en: '', ar: '' },
    notes: existing.notes ?? { en: '', ar: '' },
    dateOfBirth: existing.dateOfBirth ?? { en: '', ar: '' },
    shift: existing.shift ?? { en: '', ar: '' },
  };
}

const { data, error: readError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', documentKey)
  .maybeSingle();

if (readError) {
  console.error('Failed to read employees:', readError.message);
  process.exit(1);
}

const current = Array.isArray(data?.data) ? data.data : [];
const byId = new Map(current.map((employee) => [employee.id, employee]));
let changed = 0;

for (const seed of seedEmployees) {
  const existing = byId.get(seed.id);

  if (!existing) {
    byId.set(seed.id, {
      ...seed,
      employeeId: seed.employeeId?.trim() || seed.id,
      status: seed.status === 'inactive' ? 'inactive' : 'active',
    });
    changed += 1;
    continue;
  }

  const needsRefresh =
    normalizeJobTitle(existing.jobTitle?.en) === 'laundry supervisor' &&
    normalizeJobTitle(seed.jobTitle?.en) === 'lead supervisor';

  if (needsRefresh) {
    byId.set(seed.id, mergeSeedEmployee(existing, seed));
    changed += 1;
  }
}

if (changed === 0) {
  console.log('No missing or stale official employees to sync.');
} else {
  const next = [...byId.values()];
  const { error: writeError } = await client.from('app_data_documents').upsert(
    {
      document_key: documentKey,
      data: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'document_key' },
  );

  if (writeError) {
    console.error('Failed to sync employees:', writeError.message);
    process.exit(1);
  }

  console.log(`Synced ${changed} employee record(s) to Supabase.`);
}

const { data: verifyData, error: verifyError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', documentKey)
  .maybeSingle();

if (verifyError) {
  console.error('Failed to verify employees:', verifyError.message);
  process.exit(1);
}

const stored = Array.isArray(verifyData?.data) ? verifyData.data : [];
const tarik = stored.find(
  (employee) =>
    normalizeJobTitle(employee?.jobTitle?.en) === 'lead supervisor' &&
    String(employee?.name?.en ?? '').trim() === 'Tarik Ali',
);

if (!tarik) {
  console.error('Verification failed: Tarik Ali (Lead Supervisor) not found in Supabase.');
  process.exit(1);
}

console.log(
  `Verification OK: Tarik Ali stored as ${tarik.jobTitle.en} (${tarik.employeeId || tarik.id}) in app_data_documents.`,
);
console.log(`Total employees in Supabase: ${stored.length}`);
