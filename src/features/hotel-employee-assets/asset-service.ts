import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getErrorMessage,
  isMissingTableError,
  toServiceError,
} from '@/lib/supabase/errors';
import type {
  AssetDepartment,
  AssetEmployee,
  AssetItem,
  AssetReceipt,
  AssetReceiptItem,
  AssetReceiptItemInput,
} from '@/features/hotel-employee-assets/types';

const DEPARTMENTS = 'asset_departments';
const ITEMS = 'asset_items';
const EMPLOYEES = 'asset_employees';
const RECEIPTS = 'asset_receipts';
const RECEIPT_ITEMS = 'asset_receipt_items';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function missingTable(error: { code?: string; message?: string }, table: string) {
  if (isMissingTableError(error, table)) {
    throw new Error(
      'Hotel Employee Assets tables are missing. Apply migration 20260722190000_hotel_employee_assets.sql.',
    );
  }
}

function mapDepartment(row: {
  id: string;
  name: string;
  next_employee_seq: number;
  created_at: string;
}): AssetDepartment {
  return {
    id: row.id,
    name: row.name,
    nextEmployeeSeq: row.next_employee_seq,
    createdAt: row.created_at,
  };
}

function mapItem(row: { id: string; name: string; created_at: string }): AssetItem {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function mapEmployee(row: {
  id: string;
  department_id: string;
  employee_number: number;
  employee_name: string;
  created_at: string;
}): AssetEmployee {
  return {
    id: row.id,
    departmentId: row.department_id,
    employeeNumber: row.employee_number,
    employeeName: row.employee_name,
    createdAt: row.created_at,
  };
}

export async function listAssetDepartments(): Promise<AssetDepartment[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(DEPARTMENTS)
    .select('id, name, next_employee_seq, created_at')
    .order('name', { ascending: true });

  if (error) {
    missingTable(error, DEPARTMENTS);
    throw toServiceError(error, 'Unable to load asset departments.');
  }

  return (data ?? []).map(mapDepartment);
}

export async function listAssetItems(): Promise<AssetItem[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(ITEMS)
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) {
    missingTable(error, ITEMS);
    throw toServiceError(error, 'Unable to load asset items.');
  }

  return (data ?? []).map(mapItem);
}

export async function listAssetEmployeesByDepartment(
  departmentId: string,
): Promise<AssetEmployee[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(EMPLOYEES)
    .select('id, department_id, employee_number, employee_name, created_at')
    .eq('department_id', departmentId)
    .order('employee_number', { ascending: true });

  if (error) {
    missingTable(error, EMPLOYEES);
    throw toServiceError(error, 'Unable to load asset employees.');
  }

  return (data ?? []).map(mapEmployee);
}

export async function createAssetEmployee(input: {
  departmentId: string;
  employeeName: string;
}): Promise<AssetEmployee> {
  const name = input.employeeName.trim();
  if (!name) {
    throw new Error('Employee name is required.');
  }

  const client = requireClient();
  const { data: numberData, error: numberError } = await client.rpc(
    'allocate_asset_employee_number',
    { p_department_id: input.departmentId },
  );

  if (numberError) {
    missingTable(numberError, DEPARTMENTS);
    throw toServiceError(
      numberError,
      getErrorMessage(numberError, 'Unable to allocate employee number.'),
    );
  }

  const employeeNumber = Number(numberData);
  if (!Number.isFinite(employeeNumber) || employeeNumber < 1) {
    throw new Error('Unable to allocate employee number.');
  }

  const { data, error } = await client
    .from(EMPLOYEES)
    .insert({
      department_id: input.departmentId,
      employee_number: employeeNumber,
      employee_name: name,
    })
    .select('id, department_id, employee_number, employee_name, created_at')
    .single();

  if (error) {
    missingTable(error, EMPLOYEES);
    throw toServiceError(error, 'Unable to create employee.');
  }

  return mapEmployee(data);
}

export async function deleteAssetEmployee(employeeId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from(EMPLOYEES).delete().eq('id', employeeId);

  if (error) {
    missingTable(error, EMPLOYEES);
    throw toServiceError(error, 'Unable to delete employee.');
  }
}

async function listReceiptItemsForReceipts(
  receiptIds: string[],
): Promise<Map<string, AssetReceiptItem[]>> {
  const map = new Map<string, AssetReceiptItem[]>();
  if (receiptIds.length === 0) {
    return map;
  }

  const client = requireClient();
  const [{ data, error }, items] = await Promise.all([
    client
      .from(RECEIPT_ITEMS)
      .select('id, receipt_id, item_id, quantity')
      .in('receipt_id', receiptIds),
    listAssetItems(),
  ]);

  if (error) {
    missingTable(error, RECEIPT_ITEMS);
    throw toServiceError(error, 'Unable to load receipt items.');
  }

  const itemNameById = new Map(items.map((item) => [item.id, item.name]));

  for (const row of data ?? []) {
    const item: AssetReceiptItem = {
      id: row.id as string,
      receiptId: row.receipt_id as string,
      itemId: row.item_id as string,
      itemName: itemNameById.get(row.item_id as string) ?? 'Item',
      quantity: row.quantity as number,
    };
    const list = map.get(item.receiptId) ?? [];
    list.push(item);
    map.set(item.receiptId, list);
  }

  return map;
}

export async function listAssetReceiptsByEmployee(
  employeeId: string,
): Promise<AssetReceipt[]> {
  const client = requireClient();
  const { data, error } = await client
    .from(RECEIPTS)
    .select('id, employee_id, receipt_date, notes, created_at')
    .eq('employee_id', employeeId)
    .order('receipt_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    missingTable(error, RECEIPTS);
    throw toServiceError(error, 'Unable to load receipts.');
  }

  const rows = data ?? [];
  const itemsByReceipt = await listReceiptItemsForReceipts(
    rows.map((row) => row.id as string),
  );

  return rows.map((row) => ({
    id: row.id as string,
    employeeId: row.employee_id as string,
    receiptDate: row.receipt_date as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    items: itemsByReceipt.get(row.id as string) ?? [],
  }));
}

export async function createAssetReceipt(input: {
  employeeId: string;
  receiptDate: string;
  notes?: string;
  items: AssetReceiptItemInput[];
}): Promise<AssetReceipt> {
  const items = input.items.filter((item) => item.itemId && item.quantity > 0);
  if (items.length === 0) {
    throw new Error('Add at least one item to the receipt.');
  }
  if (!input.receiptDate.trim()) {
    throw new Error('Receipt date is required.');
  }

  const client = requireClient();
  const { data: receipt, error } = await client
    .from(RECEIPTS)
    .insert({
      employee_id: input.employeeId,
      receipt_date: input.receiptDate,
      notes: input.notes?.trim() || null,
    })
    .select('id, employee_id, receipt_date, notes, created_at')
    .single();

  if (error) {
    missingTable(error, RECEIPTS);
    throw toServiceError(error, 'Unable to create receipt.');
  }

  const { error: itemsError } = await client.from(RECEIPT_ITEMS).insert(
    items.map((item) => ({
      receipt_id: receipt.id,
      item_id: item.itemId,
      quantity: item.quantity,
    })),
  );

  if (itemsError) {
    await client.from(RECEIPTS).delete().eq('id', receipt.id);
    missingTable(itemsError, RECEIPT_ITEMS);
    throw toServiceError(itemsError, 'Unable to save receipt items.');
  }

  const created = (await listAssetReceiptsByEmployee(input.employeeId)).find(
    (entry) => entry.id === receipt.id,
  );
  return (
    created ?? {
      id: receipt.id as string,
      employeeId: receipt.employee_id as string,
      receiptDate: receipt.receipt_date as string,
      notes: (receipt.notes as string | null) ?? null,
      createdAt: receipt.created_at as string,
      items: [],
    }
  );
}

export async function updateAssetReceipt(input: {
  receiptId: string;
  employeeId: string;
  receiptDate: string;
  notes?: string;
  items: AssetReceiptItemInput[];
}): Promise<AssetReceipt> {
  const items = input.items.filter((item) => item.itemId && item.quantity > 0);
  if (items.length === 0) {
    throw new Error('Add at least one item to the receipt.');
  }
  if (!input.receiptDate.trim()) {
    throw new Error('Receipt date is required.');
  }

  const client = requireClient();
  const { error } = await client
    .from(RECEIPTS)
    .update({
      receipt_date: input.receiptDate,
      notes: input.notes?.trim() || null,
    })
    .eq('id', input.receiptId);

  if (error) {
    missingTable(error, RECEIPTS);
    throw toServiceError(error, 'Unable to update receipt.');
  }

  const { error: deleteError } = await client
    .from(RECEIPT_ITEMS)
    .delete()
    .eq('receipt_id', input.receiptId);

  if (deleteError) {
    throw toServiceError(deleteError, 'Unable to update receipt items.');
  }

  const { error: insertError } = await client.from(RECEIPT_ITEMS).insert(
    items.map((item) => ({
      receipt_id: input.receiptId,
      item_id: item.itemId,
      quantity: item.quantity,
    })),
  );

  if (insertError) {
    throw toServiceError(insertError, 'Unable to save receipt items.');
  }

  const updated = (await listAssetReceiptsByEmployee(input.employeeId)).find(
    (entry) => entry.id === input.receiptId,
  );
  if (!updated) {
    throw new Error('Receipt not found after update.');
  }
  return updated;
}

export async function deleteAssetReceipt(receiptId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from(RECEIPTS).delete().eq('id', receiptId);

  if (error) {
    missingTable(error, RECEIPTS);
    throw toServiceError(error, 'Unable to delete receipt.');
  }
}
