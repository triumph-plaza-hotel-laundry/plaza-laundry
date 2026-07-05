import {
  computeLeaveTotalDays,
  createDefaultLeavesState,
  normalizeLeavesState,
  type LeaveEntry,
  type LeaveSlot,
  type LeaveStatus,
  type LeaveType,
  type LeavesState,
} from '@/data/laundry-leaves';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  LeaveEntry,
  LeaveSlot,
  LeaveStatus,
  LeaveType,
  LeavesState,
} from '@/data/laundry-leaves';

export type SaveLeaveInput = {
  slotId: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  status?: LeaveStatus;
  entryId?: string;
};

const store = createLocalStore<LeavesState>({
  key: STORAGE_KEYS.leaves,
  seed: createDefaultLeavesState,
  normalize(parsed) {
    return normalizeLeavesState(parsed as Partial<LeavesState>);
  },
});

registerRepository(STORAGE_KEYS.leaves, store);

function persist(next: LeavesState) {
  store.replaceState(next);
}

export const leavesRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  get slots(): LeaveSlot[] {
    return store.getSnapshot().slots;
  },
  saveLeave(
    input: SaveLeaveInput,
    actor: { id?: string; displayName?: string; username?: string },
  ) {
    const snapshot = store.getSnapshot();
    const totalDays = computeLeaveTotalDays(input.startDate, input.endDate);

    if (totalDays <= 0) {
      throw new Error('Invalid leave dates');
    }

    const existingSlot = snapshot.slots.find((slot) => slot.slotId === input.slotId);
    if (!existingSlot) {
      throw new Error('Leave slot not found');
    }

    const isEdit = Boolean(input.entryId);
    const nextStatus = input.status ?? existingSlot.entry?.status ?? 'pending';
    const wasApproved = existingSlot.entry?.status === 'approved';
    const isNowApproved = nextStatus === 'approved';

    const entry: LeaveEntry = {
      id: input.entryId ?? crypto.randomUUID(),
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason.trim(),
      notes: (input.notes ?? existingSlot.entry?.notes ?? '').trim(),
      status: nextStatus,
      approvedBy:
        isNowApproved && !wasApproved
          ? actor.displayName || actor.username || 'Admin'
          : (existingSlot.entry?.approvedBy ?? ''),
      approvalDate:
        isNowApproved && !wasApproved
          ? new Date().toISOString()
          : nextStatus === 'pending'
            ? ''
            : (existingSlot.entry?.approvalDate ?? ''),
      requesterUserId: existingSlot.entry?.requesterUserId ?? actor.id ?? '',
      createdAt: existingSlot.entry?.createdAt ?? new Date().toISOString(),
    };

    const nextSlots = snapshot.slots.map((slot) =>
      slot.slotId === input.slotId ? { ...slot, entry } : slot,
    );

    persist({ slots: nextSlots });

    return { entry, isEdit, oldValue: existingSlot.entry };
  },
  deleteLeave(slotId: string) {
    const snapshot = store.getSnapshot();
    const slot = snapshot.slots.find((item) => item.slotId === slotId);

    if (!slot?.entry) {
      return null;
    }

    const nextSlots = snapshot.slots.map((item) =>
      item.slotId === slotId ? { ...item, entry: null } : item,
    );

    persist({ slots: nextSlots });
    return slot.entry;
  },
  setLeaveStatus(
    slotId: string,
    status: LeaveStatus,
    actor: { displayName?: string; username?: string },
  ) {
    const snapshot = store.getSnapshot();
    const slot = snapshot.slots.find((item) => item.slotId === slotId);

    if (!slot?.entry) {
      return null;
    }

    const approver = actor.displayName || actor.username || 'Admin';
    const entry: LeaveEntry = {
      ...slot.entry,
      status,
      approvedBy: status === 'pending' ? '' : approver,
      approvalDate: status === 'pending' ? '' : new Date().toISOString(),
    };

    const nextSlots = snapshot.slots.map((item) =>
      item.slotId === slotId ? { ...item, entry } : item,
    );

    persist({ slots: nextSlots });
    return { oldValue: slot.entry, entry };
  },
  replaceAll(next: LeavesState) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};
