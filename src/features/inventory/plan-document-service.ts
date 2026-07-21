import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';
import type {
  InventoryPlanDocument,
  PlanRowDrafts,
} from '@/features/inventory/monthly-archive-types';
import { createInitialPlanRowDrafts } from '@/features/inventory/inventory-plan-schema';
import type { DepartmentItemCategory } from '@/features/inventory/department-items-types';
import { mergePlanRowDraftsWithCatalog } from '@/features/inventory/department-items-catalog';

const PLAN_DOCUMENT_KEY = STORAGE_KEYS.inventoryPlan;

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKeyFromTimestamp(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return getCurrentMonthKey(date);
}

export function isTimestampInMonth(value: string, monthKey: string) {
  return getMonthKeyFromTimestamp(value) === monthKey;
}

export function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const next = new Date(year, month, 1);
  return getCurrentMonthKey(next);
}

export function mergePlanRowDrafts(
  saved?: PlanRowDrafts,
  categories: readonly DepartmentItemCategory[] = [],
): PlanRowDrafts {
  return mergePlanRowDraftsWithCatalog(
    saved,
    categories,
    createInitialPlanRowDrafts,
  );
}

export function createEmptyPlanDocument(
  workingMonth = getCurrentMonthKey(),
): InventoryPlanDocument {
  return {
    workingMonth,
    rowDrafts: createInitialPlanRowDrafts(),
  };
}

function normalizePlanDocument(
  parsed: unknown,
  workingMonth: string,
  categories: readonly DepartmentItemCategory[] = [],
): InventoryPlanDocument {
  if (!parsed || typeof parsed !== 'object') {
    return createEmptyPlanDocument(workingMonth);
  }

  const record = parsed as Partial<InventoryPlanDocument>;
  const month =
    typeof record.workingMonth === 'string' &&
    /^\d{4}-\d{2}$/.test(record.workingMonth)
      ? record.workingMonth
      : workingMonth;

  return {
    workingMonth: month,
    rowDrafts: mergePlanRowDrafts(record.rowDrafts, categories),
  };
}

export async function loadPlanDocument(
  categories: readonly DepartmentItemCategory[] = [],
): Promise<InventoryPlanDocument> {
  const client = requireClient();
  const currentMonth = getCurrentMonthKey();
  const seed = createEmptyPlanDocument(currentMonth);

  const { data, error } = await client
    .from('app_data_documents')
    .select('data')
    .eq('document_key', PLAN_DOCUMENT_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.data) {
    return seed;
  }

  return normalizePlanDocument(data.data, currentMonth, categories);
}

export async function savePlanDocument(
  document: InventoryPlanDocument,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('app_data_documents').upsert(
    {
      document_key: PLAN_DOCUMENT_KEY,
      data: document as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'document_key' },
  );

  if (error) {
    throw error;
  }

  emitPlanDocumentChange();
}

type PlanDocumentListener = () => void;

const planDocumentListeners = new Set<PlanDocumentListener>();
let planDocumentChannel: { unsubscribe: () => Promise<unknown> } | null = null;

function emitPlanDocumentChange() {
  planDocumentListeners.forEach((listener) => listener());
}

function ensurePlanDocumentChannel() {
  if (planDocumentChannel) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  planDocumentChannel = client
    .channel('inventory-plan-document-v1')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_data_documents',
        filter: `document_key=eq.${PLAN_DOCUMENT_KEY}`,
      },
      () => {
        emitPlanDocumentChange();
      },
    )
    .subscribe();
}

export function subscribePlanDocument(listener: PlanDocumentListener) {
  planDocumentListeners.add(listener);
  ensurePlanDocumentChannel();

  return () => {
    planDocumentListeners.delete(listener);

    if (planDocumentListeners.size === 0 && planDocumentChannel) {
      void planDocumentChannel.unsubscribe();
      planDocumentChannel = null;
    }
  };
}
