import { createContext } from 'react';
import type {
  InventoryPlanDocument,
  MonthlyArchiveRecord,
} from '@/features/inventory/monthly-archive-types';

export type InventoryArchiveContextValue = {
  archiveMonths: string[];
  currentMonth: string;
  drawerOpen: boolean;
  exitArchiveView: () => void;
  formatMonthLabel: (monthKey: string) => string;
  isArchiveView: boolean;
  isReady: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  planDocument: InventoryPlanDocument | null;
  savePlanDrafts: (
    rowDrafts: InventoryPlanDocument['rowDrafts'],
  ) => Promise<void>;
  selectArchiveMonth: (monthKey: string) => Promise<void>;
  syncError: string | null;
  viewingArchive: MonthlyArchiveRecord | null;
  viewingMonth: string | null;
};

export const InventoryArchiveContext =
  createContext<InventoryArchiveContextValue | null>(null);
