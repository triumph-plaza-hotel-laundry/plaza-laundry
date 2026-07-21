import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  CreateUnderExecutionInput,
  UnderExecutionRecord,
  UpdateUnderExecutionInput,
} from '@/features/inventory/under-execution-types';

type DbUnderExecutionRow = {
  id: string;
  supplier: string;
  department: string;
  supplier_name: string;
  item_code: string;
  item_name: string;
  quantity: number;
  date: string;
  created_at: string;
};

const SELECT_COLUMNS =
  'id, supplier, department, supplier_name, item_code, item_name, quantity, date, created_at';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function mapRow(row: DbUnderExecutionRow): UnderExecutionRecord {
  return {
    id: row.id,
    supplier: row.supplier,
    department: row.department ?? '',
    itemCode: row.item_code,
    itemName: row.item_name,
    quantity: row.quantity,
    date: row.date,
    createdAt: row.created_at,
  };
}

function toWritePayload(input: CreateUnderExecutionInput | UpdateUnderExecutionInput) {
  return {
    supplier: input.supplier.trim(),
    department: input.department.trim(),
    item_code: input.itemCode.trim(),
    item_name: input.itemName.trim(),
    quantity: input.quantity,
    date: input.date,
  };
}

export async function listUnderExecutionRecords(): Promise<
  UnderExecutionRecord[]
> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_under_execution')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbUnderExecutionRow[]).map(mapRow);
}

/** Immutable archive — read only from the app. */
export async function listUnderExecutionHistory(): Promise<
  UnderExecutionRecord[]
> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_under_execution_history')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbUnderExecutionRow[]).map(mapRow);
}

export async function createUnderExecutionRecord(
  input: CreateUnderExecutionInput,
): Promise<UnderExecutionRecord> {
  const client = requireClient();
  const payload = toWritePayload(input);

  const { data, error } = await client
    .from('inventory_under_execution')
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const active = mapRow(data as DbUnderExecutionRow);

  // Snapshot linked by created_at; kept in sync on edit (not duplicated).
  const { error: historyError } = await client
    .from('inventory_under_execution_history')
    .insert({
      supplier: payload.supplier,
      department: payload.department,
      item_code: payload.item_code,
      item_name: payload.item_name,
      quantity: payload.quantity,
      date: payload.date,
      created_at: active.createdAt,
    });

  if (historyError) {
    await client.from('inventory_under_execution').delete().eq('id', active.id);
    throw new Error(historyError.message);
  }

  return active;
}

export async function updateUnderExecutionRecord(
  id: string,
  input: UpdateUnderExecutionInput,
): Promise<UnderExecutionRecord> {
  const client = requireClient();
  const payload = toWritePayload(input);

  const { data, error } = await client
    .from('inventory_under_execution')
    .update(payload)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = mapRow(data as DbUnderExecutionRow);

  // Sync the existing history snapshot (same created_at). Do not insert a new row.
  const { error: historyError } = await client
    .from('inventory_under_execution_history')
    .update({
      supplier: payload.supplier,
      department: payload.department,
      item_code: payload.item_code,
      item_name: payload.item_name,
      quantity: payload.quantity,
      date: payload.date,
    })
    .eq('created_at', updated.createdAt);

  if (historyError) {
    throw new Error(historyError.message);
  }

  return updated;
}

export async function deleteUnderExecutionRecord(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('inventory_under_execution')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Empties the immutable history archive.
 * Allowed only for authenticated admin portal users (OWNER / SUPER_ADMIN / ADMIN).
 * Does not touch inventory_under_execution.
 */
export async function clearUnderExecutionHistory(
  actor: { id: string; role: string; isOwner?: boolean },
): Promise<void> {
  const allowedRoles = new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN']);
  if (!actor.isOwner && !allowedRoles.has(actor.role)) {
    throw new Error('Permission denied');
  }

  const client = requireClient();
  const { error } = await client.rpc(
    'admin_clear_inventory_under_execution_history',
    { p_actor_id: actor.id },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeUnderExecutionChanges(onChange: () => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const channel = client.channel(
    `inventory-under-execution-v1:${crypto.randomUUID()}`,
  );
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_under_execution' },
    () => {
      onChange();
    },
  );
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'inventory_under_execution_history',
    },
    () => {
      onChange();
    },
  );
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
