import type {
  InventoryItem,
  InventoryTransaction,
} from '@/features/inventory/types';
import type { UnderExecutionRecord } from '@/features/inventory/under-execution-types';

export type PlanRowDraft = {
  day: string;
  month: string;
  year: string;
  quantity: string;
  itemVariant: string;
};

export type PlanRowDrafts = Record<string, PlanRowDraft>;

export type InventoryPlanDocument = {
  workingMonth: string;
  rowDrafts: PlanRowDrafts;
};

export type ArchivedInventoryData = {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  capturedAt: string;
};

export type ArchivedPlanData = {
  rowDrafts: PlanRowDrafts;
  capturedAt: string;
};

export type ArchivedUnderExecutionData = {
  records: UnderExecutionRecord[];
  history: UnderExecutionRecord[];
  capturedAt: string;
};

export type MonthlyArchiveRecord = {
  archiveMonth: string;
  inventoryData: ArchivedInventoryData;
  planData: ArchivedPlanData;
  underExecutionData: ArchivedUnderExecutionData;
  archivedAt: string;
};

export function createEmptyUnderExecutionArchiveData(
  capturedAt = '',
): ArchivedUnderExecutionData {
  return {
    records: [],
    history: [],
    capturedAt,
  };
}
