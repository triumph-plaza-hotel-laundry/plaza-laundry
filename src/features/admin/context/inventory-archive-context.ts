import { createContext } from 'react';
import type {
  InventoryPlanDocument,
  MonthlyArchiveRecord,
} from '@/features/inventory/monthly-archive-types';

export type InventoryArchiveContextValue = {
  archiveMonths: string[];
  currentMonth: string;
  drawerOpen: boolean;
  ensureArchiveSynced: () => Promise<void>;
  exitArchiveView: () => void;
  formatMonthLabel: (monthKey: string) => string;
  isArchiveView: boolean;
  isReady: boolean;
  /** Bumps when leaving archive view so live history reloads from the database. */
  liveDataRevision: number;
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
