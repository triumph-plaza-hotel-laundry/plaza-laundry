import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { laundryEmployees } from '../src/data/laundry-employees.ts';

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', 'tpl-employees-v1')
  .maybeSingle();
if (error) throw error;

const byId = new Map(laundryEmployees.map((e) => [e.id, e]));
const current = Array.isArray(data?.data) ? data.data : [];
const seen = new Set();
const merged = [];

for (const row of current) {
  const seed = byId.get(row.id);
  seen.add(row.id);
  if (!seed) {
    merged.push(row);
    continue;
  }
  merged.push({
    ...row,
    id: seed.id,
    employeeId: seed.id,
    name: seed.name,
    jobTitle: seed.jobTitle,
    department: seed.department,
    tier: seed.tier,
    sortOrder: seed.sortOrder,
  });
}

for (const seed of laundryEmployees) {
  if (seen.has(seed.id)) continue;
  merged.push(seed);
}

merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const { error: upErr } = await client.from('app_data_documents').upsert(
  {
    document_key: 'tpl-employees-v1',
    data: merged,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);
if (upErr) throw upErr;
console.log(
  'synced',
  merged.length,
  merged
    .slice(0, 11)
    .map((e) => `${e.id}:${e.name.en}`)
    .join(' | '),
);
