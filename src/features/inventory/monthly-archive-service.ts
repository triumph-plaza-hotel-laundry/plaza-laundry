import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import {
  mapInventoryItem,
  type InventoryItem,
  type InventoryTransaction,
} from '@/features/inventory/types';
import type {
  ArchivedInventoryData,
  ArchivedPlanData,
  InventoryPlanDocument,
  MonthlyArchiveRecord,
  PlanRowDrafts,
} from '@/features/inventory/monthly-archive-types';
import {
  createEmptyPlanDocument,
  getCurrentMonthKey,
  loadPlanDocument,
  mergePlanRowDrafts,
  nextMonthKey,
  savePlanDocument,
} from '@/features/inventory/plan-document-service';
import { createInitialPlanRowDrafts } from '@/features/inventory/inventory-plan-schema';
import { ensureDepartmentItemsSeeded } from '@/features/inventory/department-items-service';
import { listDepartmentItemCategories } from '@/features/inventory/department-item-categories-service';

const ITEMS_SELECT =
  'id, code, name, name_ar, total_quantity, incoming_quantity, quantity, issued_quantity, remaining_quantity, created_at, updated_at, last_updated_at';
const RECEIPTS_SELECT =
  'id, item_id, supplier, receiver, employee, quantity, created_at';
const ISSUES_SELECT = 'id, item_id, employee, quantity, reason, created_at';

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
};

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
  quantity: number;
  reason: string;
  created_at: string;
};

type ArchiveRow = {
  archive_month: string;
  inventory_data: Json;
  plan_data: Json;
  archived_at: string;
};

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function isMissingArchiveTable(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('inventory_monthly_archives') ||
    message.includes('does not exist')
  );
}

function mapTransactions(
  items: InventoryItem[],
  receipts: ReceiptRow[],
  issues: IssueRow[],
): InventoryTransaction[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const receiveRows = receipts.map((row) => {
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

  const issueRows = issues.map((row) => {
    const item = itemsById.get(row.item_id);
    return {
      id: row.id,
      type: 'issue' as const,
      itemId: row.item_id,
      itemCode: item?.code ?? '',
      itemName: item?.name ?? '—',
      quantity: row.quantity,
      supplier: '',
      receiver: '',
      employee: row.employee,
      createdAt: row.created_at,
    };
  });

  return [...receiveRows, ...issueRows].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function fetchInventorySnapshotForArchive(): Promise<ArchivedInventoryData> {
  const client = requireClient();

  const [itemsResult, receiptsResult, issuesResult] = await Promise.all([
    client
      .from('inventory_items')
      .select(ITEMS_SELECT)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    client
      .from('inventory_receipts')
      .select(RECEIPTS_SELECT)
      .order('created_at', { ascending: false }),
    client
      .from('inventory_issues')
      .select(ISSUES_SELECT)
      .order('created_at', { ascending: false }),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (receiptsResult.error) {
    throw receiptsResult.error;
  }

  if (issuesResult.error) {
    throw issuesResult.error;
  }

  const items = ((itemsResult.data ?? []) as DbItemRow[]).map(mapInventoryItem);
  const transactions = mapTransactions(
    items,
    (receiptsResult.data ?? []) as ReceiptRow[],
    (issuesResult.data ?? []) as IssueRow[],
  );

  return {
    items,
    transactions,
    capturedAt: new Date().toISOString(),
  };
}

function parseArchivedInventoryData(value: Json): ArchivedInventoryData {
  const record = value as Partial<ArchivedInventoryData>;
  return {
    items: Array.isArray(record.items) ? (record.items as InventoryItem[]) : [],
    transactions: Array.isArray(record.transactions)
      ? (record.transactions as InventoryTransaction[])
      : [],
    capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt : '',
  };
}

function parseArchivedPlanData(value: Json): ArchivedPlanData {
  const record = value as Partial<ArchivedPlanData>;
  return {
    rowDrafts: (record.rowDrafts as PlanRowDrafts) ?? {},
    capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt : '',
  };
}

function mapArchiveRow(row: ArchiveRow): MonthlyArchiveRecord {
  return {
    archiveMonth: row.archive_month,
    inventoryData: parseArchivedInventoryData(row.inventory_data),
    planData: parseArchivedPlanData(row.plan_data),
    archivedAt: row.archived_at,
  };
}

export async function listMonthlyArchiveMonths(): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_monthly_archives')
    .select('archive_month')
    .order('archive_month', { ascending: false });

  if (error) {
    if (isMissingArchiveTable(error)) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => row.archive_month);
}

export async function getMonthlyArchive(
  monthKey: string,
): Promise<MonthlyArchiveRecord | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_monthly_archives')
    .select('archive_month, inventory_data, plan_data, archived_at')
    .eq('archive_month', monthKey)
    .maybeSingle();

  if (error) {
    if (isMissingArchiveTable(error)) {
      return null;
    }
    throw error;
  }

  return data ? mapArchiveRow(data as ArchiveRow) : null;
}

async function createMonthlyArchive(
  monthKey: string,
  inventoryData: ArchivedInventoryData,
  planData: ArchivedPlanData,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('inventory_monthly_archives').insert({
    archive_month: monthKey,
    inventory_data: inventoryData as unknown as Json,
    plan_data: planData as unknown as Json,
  });

  if (error) {
    throw error;
  }
}

export type MonthlyArchiveSyncResult = {
  archiveMonths: string[];
  planDocument: InventoryPlanDocument;
  currentMonth: string;
};

export async function syncMonthlyArchiveTransition(): Promise<MonthlyArchiveSyncResult> {
  const currentMonth = getCurrentMonthKey();
  await ensureDepartmentItemsSeeded();
  const categories = await listDepartmentItemCategories();
  let planDocument = await loadPlanDocument(categories);
  const archivedMonths = new Set(await listMonthlyArchiveMonths());

  while (planDocument.workingMonth < currentMonth) {
    const monthToArchive = planDocument.workingMonth;

    if (!archivedMonths.has(monthToArchive)) {
      const inventoryData = await fetchInventorySnapshotForArchive();
      const planData: ArchivedPlanData = {
        rowDrafts: planDocument.rowDrafts,
        capturedAt: new Date().toISOString(),
      };

      try {
        await createMonthlyArchive(monthToArchive, inventoryData, planData);
        archivedMonths.add(monthToArchive);
      } catch (error) {
        if (
          !isMissingArchiveTable(error as { code?: string; message?: string })
        ) {
          throw error;
        }
      }
    }

    const nextMonth = nextMonthKey(monthToArchive);
    planDocument = {
      workingMonth: nextMonth,
      rowDrafts: mergePlanRowDrafts(createInitialPlanRowDrafts(), categories),
    };
    await savePlanDocument(planDocument);
  }

  if (planDocument.workingMonth !== currentMonth) {
    planDocument = createEmptyPlanDocument(currentMonth);
    await savePlanDocument(planDocument);
  }

  return {
    archiveMonths: [...archivedMonths].sort((left, right) =>
      right.localeCompare(left),
    ),
    planDocument,
    currentMonth,
  };
}

export function formatArchiveMonthLabel(
  monthKey: string,
  language: 'ar' | 'en',
) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}
