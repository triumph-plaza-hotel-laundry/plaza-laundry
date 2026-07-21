import { getSupabaseClient } from '@/lib/supabase/client';
import {
  assertInventoryPermission,
  type InventoryPermission,
} from '@/features/inventory/inventory-permissions-service';
import type { AuthUser } from '@/features/auth/types';
import {
  applyInventoryQuantityUpdate,
  calculateRemaining,
  mapInventoryItem,
  NOT_ENOUGH_STOCK_MESSAGE,
  DUPLICATE_INVENTORY_CODE_MESSAGE,
  INVENTORY_ITEM_DISABLED_MESSAGE,
  INVENTORY_ITEM_HAS_REFERENCES_MESSAGE,
  type CreateInventoryItemInput,
  type InventoryItem,
  type InventoryQuantityField,
  type InventoryTransaction,
  type IssueItemsInput,
  type ReceiveItemsInput,
  type UpdateInventoryItemInput,
  type UpdateInventoryQuantityInput,
} from '@/features/inventory/types';
import type { ArchivedInventoryData } from '@/features/inventory/monthly-archive-types';
import type { Json } from '@/lib/supabase/types';
import { inventoryItems as OFFICIAL_SEED_ITEMS } from '@/data/laundry-inventory';

type DbItemRow = {
  id: string;
  code: string;
  name: string | null;
  name_ar: string;
  total_quantity: number | null;
  incoming_quantity: number;
  quantity: number;
  issued_quantity: number;
  remaining_quantity: number;
  created_at: string;
  updated_at: string | null;
  last_updated_at: string;
  disabled_at: string | null;
};

export type InventoryItemsScope = 'active' | 'managed';

export type InventorySnapshot = {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  cachedAt: number;
  itemsScope: InventoryItemsScope;
};

const ITEMS_SELECT =
  'id, code, name, name_ar, total_quantity, incoming_quantity, quantity, issued_quantity, remaining_quantity, created_at, updated_at, last_updated_at, disabled_at';

const RECEIPTS_SELECT =
  'id, item_id, supplier, receiver, employee, quantity, created_at';
const ISSUES_SELECT =
  'id, item_id, employee, department, quantity, reason, created_at';

const CACHE_TTL_MS = 60_000;
const TRANSACTION_LIMIT = 200;
const SESSION_CACHE_KEY = 'tpl-inventory-snapshot-v2';

type SnapshotCacheEntry = {
  active: InventorySnapshot | null;
  managed: InventorySnapshot | null;
};

let snapshotCache: SnapshotCacheEntry = { active: null, managed: null };
const inflightSnapshot: Partial<
  Record<InventoryItemsScope, Promise<InventorySnapshot>>
> = {};

function isCacheFresh(cache: InventorySnapshot | null) {
  return Boolean(cache && Date.now() - cache.cachedAt < CACHE_TTL_MS);
}

function readSessionCache(
  scope: InventoryItemsScope,
): InventorySnapshot | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_KEY}:${scope}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as InventorySnapshot;
    return isCacheFresh(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(snapshot: InventorySnapshot) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(
      `${SESSION_CACHE_KEY}:${snapshot.itemsScope}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function getCachedInventorySnapshot(
  scope: InventoryItemsScope = 'active',
): InventorySnapshot | null {
  const memorySnapshot = snapshotCache[scope];
  if (isCacheFresh(memorySnapshot)) {
    return memorySnapshot;
  }

  const sessionSnapshot = readSessionCache(scope);
  if (sessionSnapshot) {
    snapshotCache[scope] = sessionSnapshot;
    return sessionSnapshot;
  }

  return null;
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export function invalidateInventoryCache() {
  snapshotCache = { active: null, managed: null };

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(`${SESSION_CACHE_KEY}:active`);
      sessionStorage.removeItem(`${SESSION_CACHE_KEY}:managed`);
    } catch {
      // Ignore storage errors.
    }
  }
}

type InventoryActor =
  | Pick<AuthUser, 'id' | 'username' | 'isOwner' | 'isProtected'>
  | null
  | undefined;

async function requireInventoryPermission(
  actorId: string,
  permission: InventoryPermission,
  actor?: InventoryActor,
) {
  await assertInventoryPermission(actorId, permission, actor);
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

type ReceiptRow = {
  id: string;
  item_id: string;
  supplier: string;
  receiver: string;
  employee: string;
  quantity: number;
  created_at: string;
};

type IssueRow = {
  id: string;
  item_id: string;
  employee: string;
  department: string;
  quantity: number;
  reason: string;
  created_at: string;
};

function mapTransactions(
  items: InventoryItem[],
  receipts: ReceiptRow[] | null,
  issues: IssueRow[] | null,
): InventoryTransaction[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const receiveRows = (receipts ?? []).map((row) => {
    const item = itemsById.get(row.item_id);
    return {
      id: row.id,
      type: 'receive' as const,
      itemId: row.item_id,
      itemCode: item?.code ?? '',
      itemName: item?.name ?? '—',
      quantity: row.quantity,
      supplier: row.supplier,
      receiver: row.receiver,
      employee: row.employee,
      createdAt: row.created_at,
    };
  });

  const issueRows = (issues ?? []).map((row) => {
    const item = itemsById.get(row.item_id);
    return {
      id: row.id,
      type: 'issue' as const,
      itemId: row.item_id,
      itemCode: item?.code ?? '',
      itemName: item?.name ?? '—',
      quantity: row.quantity,
      supplier: row.department ?? '',
      receiver: row.reason ?? '',
      employee: row.employee,
      createdAt: row.created_at,
    };
  });

  return [...receiveRows, ...issueRows].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function loadInventorySnapshot(
  itemsScope: InventoryItemsScope = 'active',
): Promise<InventorySnapshot> {
  const client = requireClient();
  const startedAt = performance.now();

  let itemsQuery = client
    .from('inventory_items')
    .select(ITEMS_SELECT)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (itemsScope === 'active') {
    itemsQuery = itemsQuery.is('disabled_at', null);
  }

  const [itemsResult, receiptsResult, issuesResult] = await Promise.all([
    itemsQuery,
    client
      .from('inventory_receipts')
      .select(RECEIPTS_SELECT)
      .order('created_at', { ascending: false })
      .limit(TRANSACTION_LIMIT),
    client
      .from('inventory_issues')
      .select(ISSUES_SELECT)
      .order('created_at', { ascending: false })
      .limit(TRANSACTION_LIMIT),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (receiptsResult.error && !isMissingRelationError(receiptsResult.error)) {
    throw receiptsResult.error;
  }

  if (issuesResult.error && !isMissingRelationError(issuesResult.error)) {
    throw issuesResult.error;
  }

  const items = ((itemsResult.data ?? []) as DbItemRow[]).map(mapInventoryItem);
  const hasTransactionTables = !receiptsResult.error && !issuesResult.error;

  const transactions = hasTransactionTables
    ? mapTransactions(
        items,
        (receiptsResult.data ?? []) as ReceiptRow[],
        (issuesResult.data ?? []) as IssueRow[],
      )
    : [];

  const snapshot: InventorySnapshot = {
    items,
    transactions,
    cachedAt: Date.now(),
    itemsScope,
  };

  snapshotCache[itemsScope] = snapshot;
  writeSessionCache(snapshot);

  if (import.meta.env.DEV) {
    console.info(
      `[inventory] snapshot (${itemsScope}) loaded in ${Math.round(performance.now() - startedAt)}ms (${items.length} items, ${transactions.length} transactions, 3 queries)`,
    );
  }

  return snapshot;
}

export async function fetchInventorySnapshot(options?: {
  force?: boolean;
  itemsScope?: InventoryItemsScope;
}): Promise<InventorySnapshot> {
  const itemsScope = options?.itemsScope ?? 'active';

  if (!options?.force) {
    const cached = getCachedInventorySnapshot(itemsScope);
    if (cached) {
      return cached;
    }
  }

  if (!options?.force && inflightSnapshot[itemsScope]) {
    return inflightSnapshot[itemsScope]!;
  }

  const request = loadInventorySnapshot(itemsScope).finally(() => {
    if (inflightSnapshot[itemsScope] === request) {
      delete inflightSnapshot[itemsScope];
    }
  });

  inflightSnapshot[itemsScope] = request;
  return request;
}

export async function fetchInventoryItems(options?: {
  force?: boolean;
  itemsScope?: InventoryItemsScope;
}): Promise<InventoryItem[]> {
  const snapshot = await fetchInventorySnapshot(options);
  return snapshot.items;
}

export async function fetchInventoryTransactions(options?: {
  force?: boolean;
}): Promise<InventoryTransaction[]> {
  const snapshot = await fetchInventorySnapshot(options);
  return snapshot.transactions;
}

export async function seedOfficialInventoryItems() {
  const client = requireClient();

  const { data: existingRows, error: existingError } = await client
    .from('inventory_items')
    .select('code, name')
    .is('deleted_at', null);

  if (existingError) {
    throw existingError;
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => row.code?.trim()).filter(Boolean),
  );
  const existingNames = new Set(
    (existingRows ?? []).map((row) => row.name?.trim()).filter(Boolean),
  );

  const missingSeeds = OFFICIAL_SEED_ITEMS.filter((seed) => {
    if (seed.code.trim()) {
      return !existingCodes.has(seed.code);
    }
    return !existingNames.has(seed.name);
  });

  if (missingSeeds.length === 0) {
    return;
  }

  const rows = missingSeeds.map((seed, index) => ({
    code: seed.code,
    name: seed.name,
    name_ar: seed.name,
    name_en: seed.name,
    total_quantity: 0,
    incoming_quantity: 0,
    issued_quantity: 0,
    remaining_quantity: 0,
    quantity: 0,
    minimum_quantity: 0,
    unit: 'piece',
    notes: '',
    sort_order: OFFICIAL_SEED_ITEMS.indexOf(seed) + 1 || index + 1,
  }));

  const { error } = await client.from('inventory_items').insert(rows);
  if (error && !error.message.includes('duplicate')) {
    throw error;
  }

  invalidateInventoryCache();
}

export async function createInventoryItem(
  actorId: string,
  input: CreateInventoryItemInput,
  actor?: InventoryActor,
): Promise<InventoryItem> {
  await requireInventoryPermission(actorId, 'inventory.add', actor);

  const client = requireClient();
  const code = input.code.trim();
  const name = input.name.trim();

  if (!code) {
    throw new Error('Item code is required.');
  }

  if (!name) {
    throw new Error('Item name is required.');
  }

  const { data: existing, error: lookupError } = await client
    .from('inventory_items')
    .select('id')
    .eq('code', code)
    .is('deleted_at', null)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    throw new Error(DUPLICATE_INVENTORY_CODE_MESSAGE);
  }

  const { data: sortRow, error: sortError } = await client
    .from('inventory_items')
    .select('sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) {
    throw sortError;
  }

  const sortOrder = (sortRow?.sort_order ?? 0) + 1;

  const { data, error } = await client
    .from('inventory_items')
    .insert({
      code,
      name,
      name_ar: name,
      name_en: name,
      total_quantity: 0,
      incoming_quantity: 0,
      issued_quantity: 0,
      remaining_quantity: 0,
      quantity: 0,
      minimum_quantity: 0,
      unit: 'piece',
      notes: '',
      sort_order: sortOrder,
    })
    .select(ITEMS_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(DUPLICATE_INVENTORY_CODE_MESSAGE);
    }
    throw error;
  }

  const item = mapInventoryItem(data as DbItemRow);
  invalidateInventoryCache();
  return item;
}

export async function updateInventoryItem(
  actorId: string,
  itemId: string,
  input: UpdateInventoryItemInput,
  actor?: InventoryActor,
): Promise<InventoryItem> {
  await requireInventoryPermission(actorId, 'inventory.edit', actor);

  const client = requireClient();
  const code = input.code.trim();
  const name = input.name.trim();

  if (!code) {
    throw new Error('Item code is required.');
  }

  if (!name) {
    throw new Error('Item name is required.');
  }

  const { data: existingItem, error: existingError } = await client
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existingItem) {
    throw new Error('Item not found.');
  }

  const { data: duplicate, error: duplicateError } = await client
    .from('inventory_items')
    .select('id')
    .eq('code', code)
    .is('deleted_at', null)
    .neq('id', itemId)
    .maybeSingle();

  if (duplicateError) {
    throw duplicateError;
  }

  if (duplicate) {
    throw new Error(DUPLICATE_INVENTORY_CODE_MESSAGE);
  }

  const { data, error } = await client
    .from('inventory_items')
    .update({
      code,
      name,
      name_ar: name,
      name_en: name,
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select(ITEMS_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(DUPLICATE_INVENTORY_CODE_MESSAGE);
    }
    throw error;
  }

  invalidateInventoryCache();
  return mapInventoryItem(data as DbItemRow);
}

export async function setInventoryItemEnabled(
  actorId: string,
  itemId: string,
  enabled: boolean,
  actor?: InventoryActor,
): Promise<InventoryItem> {
  await requireInventoryPermission(actorId, 'inventory.enable_disable', actor);

  const client = requireClient();
  const timestamp = enabled ? null : new Date().toISOString();

  const { data, error } = await client
    .from('inventory_items')
    .update({
      disabled_at: timestamp,
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .is('deleted_at', null)
    .select(ITEMS_SELECT)
    .single();

  if (error) {
    throw error;
  }

  invalidateInventoryCache();
  return mapInventoryItem(data as DbItemRow);
}

export type InventoryItemReferenceCounts = {
  receipts: number;
  issues: number;
  movements: number;
  archives: number;
  total: number;
};

function countArchivedItemReferences(
  archives: { inventory_data: Json }[] | null,
  itemId: string,
) {
  let count = 0;

  for (const archive of archives ?? []) {
    const inventoryData =
      archive.inventory_data as Partial<ArchivedInventoryData>;
    const items = Array.isArray(inventoryData.items) ? inventoryData.items : [];
    if (items.some((item) => item.id === itemId)) {
      count += 1;
    }
  }

  return count;
}

export async function getInventoryItemReferenceCounts(
  itemId: string,
): Promise<InventoryItemReferenceCounts> {
  const client = requireClient();

  const [receiptsResult, issuesResult, movementsResult, archivesResult] =
    await Promise.all([
      client
        .from('inventory_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId),
      client
        .from('inventory_issues')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId),
      client
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId),
      client
        .from('inventory_monthly_archives')
        .select('inventory_data')
        .limit(500),
    ]);

  if (receiptsResult.error && !isMissingRelationError(receiptsResult.error)) {
    throw receiptsResult.error;
  }

  if (issuesResult.error && !isMissingRelationError(issuesResult.error)) {
    throw issuesResult.error;
  }

  if (movementsResult.error && !isMissingRelationError(movementsResult.error)) {
    throw movementsResult.error;
  }

  if (archivesResult.error && !isMissingRelationError(archivesResult.error)) {
    throw archivesResult.error;
  }

  const receipts = receiptsResult.count ?? 0;
  const issues = issuesResult.count ?? 0;
  const movements = movementsResult.count ?? 0;
  const archives = archivesResult.error
    ? 0
    : countArchivedItemReferences(archivesResult.data, itemId);

  return {
    receipts,
    issues,
    movements,
    archives,
    total: receipts + issues + movements + archives,
  };
}

export async function permanentlyDeleteInventoryItem(
  actorId: string,
  itemId: string,
  actor?: InventoryActor,
): Promise<void> {
  await requireInventoryPermission(actorId, 'inventory.delete', actor);

  const references = await getInventoryItemReferenceCounts(itemId);
  if (references.total > 0) {
    throw new Error(INVENTORY_ITEM_HAS_REFERENCES_MESSAGE);
  }

  const client = requireClient();
  const { error } = await client
    .from('inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw error;
  }

  invalidateInventoryCache();
}

function assertItemIsActive(item: { disabled_at?: string | null }) {
  if (item.disabled_at) {
    throw new Error(INVENTORY_ITEM_DISABLED_MESSAGE);
  }
}

export async function receiveInventoryItems(input: ReceiveItemsInput) {
  const client = requireClient();
  const quantity = Math.max(0, Math.floor(input.quantity));

  if (!input.itemId || quantity <= 0) {
    throw new Error('Invalid receive quantity.');
  }

  const { data: item, error: itemError } = await client
    .from('inventory_items')
    .select(
      'id, total_quantity, incoming_quantity, quantity, issued_quantity, remaining_quantity, disabled_at',
    )
    .eq('id', input.itemId)
    .is('deleted_at', null)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Item not found.');
  }

  assertItemIsActive(item);

  const currentTotal =
    item.total_quantity ?? item.incoming_quantity ?? item.quantity ?? 0;
  const issued = item.issued_quantity ?? 0;
  const nextTotal = currentTotal + quantity;
  const nextRemaining = calculateRemaining(nextTotal, issued);

  const { error: receiptError } = await client
    .from('inventory_receipts')
    .insert({
      item_id: input.itemId,
      supplier: input.supplier.trim(),
      receiver: input.receiver.trim(),
      employee: input.employee.trim(),
      quantity,
      notes: input.notes.trim(),
    });

  if (receiptError) {
    throw receiptError;
  }

  const { error: updateError } = await client
    .from('inventory_items')
    .update({
      total_quantity: nextTotal,
      incoming_quantity: nextTotal,
      remaining_quantity: nextRemaining,
      quantity: nextRemaining,
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId);

  if (updateError) {
    throw updateError;
  }

  invalidateInventoryCache();
}

function buildQuantityUpdatePayload(
  field: InventoryQuantityField,
  item: InventoryItem,
) {
  const timestamp = new Date().toISOString();

  if (field === 'issuedQuantity') {
    return {
      issued_quantity: item.issuedQuantity,
      updated_at: timestamp,
      last_updated_at: timestamp,
    };
  }

  if (field === 'totalQuantity') {
    return {
      total_quantity: item.totalQuantity,
      issued_quantity: item.issuedQuantity,
      updated_at: timestamp,
      last_updated_at: timestamp,
    };
  }

  return {
    total_quantity: item.totalQuantity,
    updated_at: timestamp,
    last_updated_at: timestamp,
  };
}

export async function updateInventoryItemQuantity(
  input: UpdateInventoryQuantityInput,
): Promise<InventoryItem> {
  const client = requireClient();

  const { data: item, error: itemError } = await client
    .from('inventory_items')
    .select(
      'id, code, name, name_ar, total_quantity, incoming_quantity, quantity, issued_quantity, remaining_quantity, created_at, updated_at, last_updated_at',
    )
    .eq('id', input.itemId)
    .is('deleted_at', null)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Item not found.');
  }

  const current = mapInventoryItem(item as DbItemRow);
  const next = applyInventoryQuantityUpdate(current, input.field, input.value);
  const { error: updateError } = await client
    .from('inventory_items')
    .update(buildQuantityUpdatePayload(input.field, next))
    .eq('id', input.itemId);

  if (updateError) {
    throw updateError;
  }

  invalidateInventoryCache();

  return next;
}

export async function issueInventoryItems(input: IssueItemsInput) {
  const client = requireClient();
  const quantity = Math.max(0, Math.floor(input.quantity));

  if (!input.itemId || quantity <= 0) {
    throw new Error('Invalid issue quantity.');
  }

  if (!input.department.trim()) {
    throw new Error('Department is required.');
  }

  const { data: item, error: itemError } = await client
    .from('inventory_items')
    .select(
      'id, total_quantity, incoming_quantity, quantity, issued_quantity, remaining_quantity, disabled_at',
    )
    .eq('id', input.itemId)
    .is('deleted_at', null)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Item not found.');
  }

  assertItemIsActive(item);

  const total =
    item.total_quantity ?? item.incoming_quantity ?? item.quantity ?? 0;
  const issued = item.issued_quantity ?? 0;
  const remaining = calculateRemaining(total, issued);

  if (quantity > remaining) {
    throw new Error(NOT_ENOUGH_STOCK_MESSAGE);
  }

  const nextIssued = issued + quantity;
  const nextRemaining = calculateRemaining(total, nextIssued);

  const { error: issueError } = await client.from('inventory_issues').insert({
    item_id: input.itemId,
    employee: input.employee.trim(),
    department: input.department.trim(),
    quantity,
    reason: input.reason.trim(),
  });

  if (issueError) {
    throw issueError;
  }

  const { error: updateError } = await client
    .from('inventory_items')
    .update({
      issued_quantity: nextIssued,
      remaining_quantity: nextRemaining,
      quantity: nextRemaining,
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId);

  if (updateError) {
    throw updateError;
  }

  invalidateInventoryCache();
}

export function subscribeInventoryChanges(onChange: () => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  // Unique channel name per subscriber so .on() is never called on an
  // already-subscribed channel (Inventory tab stays mounted while Under
  // Execution also calls useInventoryManagement).
  const channel = client.channel(
    `inventory-management-v2:${crypto.randomUUID()}`,
  );
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_items' },
    onChange,
  );
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_receipts' },
    onChange,
  );
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_issues' },
    onChange,
  );
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
