export const LEAVE_SLOT_COUNT = 8;

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'other';

export type LeaveEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  notes: string;
  status: LeaveStatus;
  approvedBy: string;
  approvalDate: string;
  requesterUserId: string;
  createdAt: string;
};

export type LeaveSlot = {
  slotId: string;
  entry: LeaveEntry | null;
};

export type LeavesState = {
  slots: LeaveSlot[];
};

export const AUTH_USER_EMPLOYEE_MAP: Record<string, string> = {
  'employee-1': 'lw-01',
};

export function computeLeaveTotalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isDateInLeaveRange(dateKey: string, startDate: string, endDate: string): boolean {
  return dateKey >= startDate && dateKey <= endDate;
}

export function isApprovedLeaveActiveOnDate(entry: LeaveEntry, dateKey: string): boolean {
  return entry.status === 'approved' && isDateInLeaveRange(dateKey, entry.startDate, entry.endDate);
}

export function getTodaysApprovedLeaves(slots: LeaveSlot[], dateKey: string): LeaveEntry[] {
  return slots
    .map((slot) => slot.entry)
    .filter((entry): entry is LeaveEntry => entry !== null && isApprovedLeaveActiveOnDate(entry, dateKey))
    .slice(0, LEAVE_SLOT_COUNT);
}

export function getApprovedLeaveEmployeeIdsOnDate(slots: LeaveSlot[], dateKey: string): Set<string> {
  return new Set(getTodaysApprovedLeaves(slots, dateKey).map((entry) => entry.employeeId));
}

function normalizeLeaveEntry(entry: Partial<LeaveEntry> | null | undefined): LeaveEntry | null {
  if (!entry?.id || !entry.employeeId) {
    return null;
  }

  return {
    id: entry.id,
    employeeId: entry.employeeId,
    employeeName: entry.employeeName ?? '',
    leaveType: entry.leaveType ?? 'annual',
    startDate: entry.startDate ?? '',
    endDate: entry.endDate ?? '',
    totalDays: entry.totalDays ?? computeLeaveTotalDays(entry.startDate ?? '', entry.endDate ?? ''),
    reason: entry.reason ?? '',
    notes: entry.notes ?? '',
    status: entry.status ?? 'pending',
    approvedBy: entry.approvedBy ?? '',
    approvalDate: entry.approvalDate ?? '',
    requesterUserId: entry.requesterUserId ?? '',
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

export function createDefaultLeavesState(): LeavesState {
  return {
    slots: Array.from({ length: LEAVE_SLOT_COUNT }, (_, index) => ({
      slotId: `leave-slot-${index + 1}`,
      entry: null,
    })),
  };
}

export function normalizeLeavesState(raw: Partial<LeavesState> | null | undefined): LeavesState {
  const defaults = createDefaultLeavesState();

  if (!raw?.slots?.length) {
    return defaults;
  }

  const slots = defaults.slots.map((defaultSlot, index) => {
    const match =
      raw.slots?.find((slot) => slot.slotId === defaultSlot.slotId) ?? raw.slots?.[index];
    return {
      slotId: defaultSlot.slotId,
      entry: normalizeLeaveEntry(match?.entry ?? null),
    };
  });

  return { slots };
}
