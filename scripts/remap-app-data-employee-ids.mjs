/**
 * Remap tpl-employees-v1 / tpl-shifts / tpl-leaves JSON documents to EMP-XXXX.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEGACY = {
  'gm-01': 'EMP-0001',
  'dm-01': 'EMP-0002',
  'ws-01': 'EMP-0003',
  'dm-02': 'EMP-0004',
  'dm-03': 'EMP-0005',
  'wts-01': 'EMP-0006',
  'tl-01': 'EMP-0007',
  'wts-02': 'EMP-0008',
  'wts-03': 'EMP-0009',
  'ws-02': 'EMP-0010',
  'lw-06': 'EMP-0011',
  'lw-01': 'EMP-0012',
  'lw-02': 'EMP-0013',
  'lw-03': 'EMP-0014',
  'lw-04': 'EMP-0015',
  'lw-05': 'EMP-0016',
  'lw-07': 'EMP-0017',
  'lw-08': 'EMP-0018',
  'lw-09': 'EMP-0019',
  'lw-10': 'EMP-0020',
};

function remapId(value) {
  if (typeof value !== 'string' || !value) return value;
  return LEGACY[value] ?? value;
}

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function remapEmployees(data) {
  if (!Array.isArray(data)) return data;
  const seen = new Set();
  const next = [];
  for (const row of data) {
    const id = remapId(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    next.push({ ...row, id, employeeId: id });
  }
  return next;
}

function remapShifts(data) {
  if (!data || typeof data !== 'object') return data;
  const weekly = { ...(data.weeklySchedule || {}) };
  for (const day of Object.keys(weekly)) {
    const roles = { ...weekly[day] };
    for (const role of Object.keys(roles)) {
      const cell = roles[role];
      if (!cell) continue;
      roles[role] = {
        morning: [
          remapId(cell.morning?.[0] ?? ''),
          remapId(cell.morning?.[1] ?? ''),
        ],
        evening: [
          remapId(cell.evening?.[0] ?? ''),
          remapId(cell.evening?.[1] ?? ''),
        ],
      };
    }
    weekly[day] = roles;
  }
  const daily = { ...(data.dailyRosters || {}) };
  for (const day of Object.keys(daily)) {
    const roster = daily[day];
    if (!roster) continue;
    daily[day] = {
      ...roster,
      morning: (roster.morning || []).map(remapId),
      evening: (roster.evening || []).map(remapId),
    };
  }
  return { ...data, weeklySchedule: weekly, dailyRosters: daily };
}

function remapLeaves(data) {
  if (!data || typeof data !== 'object') return data;
  const slots = (data.slots || []).map((slot) => {
    if (!slot?.entry) return slot;
    return {
      ...slot,
      entry: {
        ...slot.entry,
        employeeId: remapId(slot.entry.employeeId),
      },
    };
  });
  return { ...data, slots };
}

const env = loadEnv();
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const keys = ['tpl-employees-v1', 'tpl-shifts', 'tpl-leaves'];
for (const key of keys) {
  const { data, error } = await client
    .from('app_data_documents')
    .select('document_key, data')
    .eq('document_key', key)
    .maybeSingle();
  if (error) {
    console.error(key, error.message);
    continue;
  }
  if (!data) {
    console.log(key, 'missing — skip');
    continue;
  }
  let next = data.data;
  if (key === 'tpl-employees-v1') next = remapEmployees(data.data);
  if (key === 'tpl-shifts') next = remapShifts(data.data);
  if (key === 'tpl-leaves') next = remapLeaves(data.data);

  const { error: upErr } = await client.from('app_data_documents').upsert(
    {
      document_key: key,
      data: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'document_key' },
  );
  if (upErr) console.error(key, 'upsert failed', upErr.message);
  else {
    const sample =
      key === 'tpl-employees-v1' && Array.isArray(next)
        ? next.slice(0, 3).map((e) => e.id)
        : 'ok';
    console.log(key, 'remapped', sample);
  }
}
