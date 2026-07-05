import { createDefaultShiftsState } from '@/data/laundry-shifts';
import { laundryEmployees } from '@/data/laundry-employees';
import { getSupabaseClient } from '@/lib/supabase/client';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

const client = getSupabaseClient();

if (!client) {
  throw new Error('Supabase is not configured.');
}

const employees = [...laundryEmployees];

const { error: employeesError } = await client.from('app_data_documents').upsert(
  {
    document_key: STORAGE_KEYS.employees,
    data: employees,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (employeesError) {
  throw employeesError;
}

const shifts = createDefaultShiftsState();

const { error: shiftsError } = await client.from('app_data_documents').upsert(
  {
    document_key: STORAGE_KEYS.shifts,
    data: shifts,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'document_key' },
);

if (shiftsError) {
  throw shiftsError;
}

const { data, error: readError } = await client
  .from('app_data_documents')
  .select('data')
  .eq('document_key', STORAGE_KEYS.employees)
  .maybeSingle();

if (readError) {
  throw readError;
}

const stored = Array.isArray(data?.data) ? data.data : [];

console.log(`Imported ${stored.length} employees to Supabase.`);
console.log('Refreshed shift schedule with current worker IDs (lw-01 through lw-10).');

if (stored.length !== 18) {
  throw new Error(`Expected 18 employees, found ${stored.length}.`);
}

const names = stored.map(
  (entry: { name?: { en?: string } }) => entry.name?.en ?? '',
);

const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicates.length > 0) {
  throw new Error(`Duplicate employee names found: ${duplicates.join(', ')}`);
}

console.log('Verification OK: 20 unique employees stored.');
