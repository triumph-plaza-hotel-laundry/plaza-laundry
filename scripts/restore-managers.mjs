import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const MANAGER_IDS = ['gm-01', 'dm-01'];

const managersToRestore = [
  {
    id: 'gm-01',
    employeeId: '',
    tier: 'generalManager',
    sortOrder: 0,
    name: { en: 'Ahmed Debaka', ar: 'أحمد دبكه' },
    jobTitle: { en: 'Director Manager', ar: 'المدير المسؤول' },
    department: { en: '', ar: '' },
    phone: '',
    dateOfBirth: { en: '', ar: '' },
    shift: { en: '', ar: '' },
    salary: '',
    hireDate: { en: '', ar: '' },
    notes: { en: '', ar: '' },
  },
  {
    id: 'dm-01',
    employeeId: '',
    tier: 'departmentManager',
    sortOrder: 1,
    name: { en: 'Ramadan Mahmoud', ar: 'رمضان محمود' },
    jobTitle: { en: 'Laundry Manager', ar: 'مدير المغسلة' },
    department: { en: '', ar: '' },
    phone: '',
    dateOfBirth: { en: '', ar: '' },
    shift: { en: '', ar: '' },
    salary: '',
    hireDate: { en: '', ar: '' },
    notes: { en: '', ar: '' },
  },
];

const env = loadEnv('development', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const client = createClient(url, anonKey);

const { data: employeesDoc, error: readEmployeesError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', 'tpl-employees-v1')
  .maybeSingle();

if (readEmployeesError) {
  console.error('Failed to read employees:', readEmployeesError.message);
  process.exit(1);
}

const currentEmployees = Array.isArray(employeesDoc?.data) ? [...employeesDoc.data] : [];
const byId = new Map(currentEmployees.map((employee) => [employee.id, employee]));

for (const manager of managersToRestore) {
  byId.set(manager.id, manager);
}

const mergedEmployees = [...byId.values()].sort(
  (left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0),
);

const { error: employeesError } = await client.from('app_data_documents').upsert(
  {
    document_key: 'tpl-employees-v1',
    data: mergedEmployees,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (employeesError) {
  console.error('Failed to upsert employees:', employeesError.message);
  process.exit(1);
}

const { data: shiftsDoc, error: readShiftsError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', 'tpl-shifts')
  .maybeSingle();

if (readShiftsError) {
  console.error('Failed to read shifts:', readShiftsError.message);
  process.exit(1);
}

if (shiftsDoc?.data && typeof shiftsDoc.data === 'object') {
  const shifts = structuredClone(shiftsDoc.data);
  const weeklySchedule = shifts.weeklySchedule;

  if (weeklySchedule && typeof weeklySchedule === 'object') {
    for (const day of Object.values(weeklySchedule)) {
      if (!day || typeof day !== 'object') {
        continue;
      }

      for (const cell of Object.values(day)) {
        if (!cell || typeof cell !== 'object') {
          continue;
        }

        for (const period of ['morning', 'evening']) {
          const slots = cell[period];
          if (!Array.isArray(slots)) {
            continue;
          }

          cell[period] = slots.map((id) => (MANAGER_IDS.includes(id) ? '' : id));
        }
      }
    }

    const { error: shiftsError } = await client.from('app_data_documents').upsert(
      {
        document_key: 'tpl-shifts',
        data: shifts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'document_key' },
    );

    if (shiftsError) {
      console.error('Failed to upsert shifts:', shiftsError.message);
      process.exit(1);
    }
  }
}

const { data: verifyDoc, error: verifyError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', 'tpl-employees-v1')
  .maybeSingle();

if (verifyError) {
  console.error('Failed to verify employees:', verifyError.message);
  process.exit(1);
}

const stored = Array.isArray(verifyDoc?.data) ? verifyDoc.data : [];
const storedManagers = stored.filter((employee) => MANAGER_IDS.includes(employee?.id));

if (storedManagers.length !== 2) {
  console.error(`Expected 2 managers in Supabase, found ${storedManagers.length}.`);
  process.exit(1);
}

const ahmed = storedManagers.find((employee) => employee.id === 'gm-01');
const ramadan = storedManagers.find((employee) => employee.id === 'dm-01');

console.log(`Restored managers in Supabase (${stored.length} total employees).`);
console.log(`- ${ahmed?.name?.en ?? 'gm-01'} (${ahmed?.jobTitle?.en ?? ''})`);
console.log(`- ${ramadan?.name?.en ?? 'dm-01'} (${ramadan?.jobTitle?.en ?? ''})`);
console.log('Removed manager IDs from shift assignments if present.');
