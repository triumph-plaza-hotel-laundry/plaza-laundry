import { useCallback } from 'react';
import {
  leavesRepository,
  type LeaveSlot,
  type LeaveStatus,
  type SaveLeaveInput,
} from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export type { SaveLeaveInput } from '@/data/repositories';

export function useLeaveStorage() {
  const leaves = useSyncStore(leavesRepository);
  const { assertCan, logAction, user } = useAuth();

  const saveLeave = useCallback(
    (input: SaveLeaveInput) => {
      const isEdit = Boolean(input.entryId);
      assertCan('leaves', isEdit ? 'update' : 'create');
      const result = leavesRepository.saveLeave(input, {
        id: user?.id,
        displayName: user?.displayName,
        username: user?.username,
      });
      logAction({
        action: isEdit ? 'leaves.update' : 'leaves.create',
        page: 'admin/leaves',
        oldValue: result.oldValue,
        newValue: result.entry,
      });
    },
    [assertCan, logAction, user?.displayName, user?.id, user?.username],
  );

  const deleteLeave = useCallback(
    (slotId: string) => {
      assertCan('leaves', 'delete');
      const oldValue = leavesRepository.deleteLeave(slotId);
      logAction({
        action: 'leaves.delete',
        page: 'admin/leaves',
        oldValue,
        newValue: null,
      });
    },
    [assertCan, logAction],
  );

  const setLeaveStatus = useCallback(
    (slotId: string, status: LeaveStatus) => {
      assertCan('leaves', 'update');
      const result = leavesRepository.setLeaveStatus(slotId, status, {
        displayName: user?.displayName,
        username: user?.username,
      });

      if (!result) {
        return;
      }

      logAction({
        action: status === 'approved' ? 'leaves.approve' : 'leaves.reject',
        page: 'admin/leaves',
        oldValue: result.oldValue,
        newValue: result.entry,
      });
    },
    [assertCan, logAction, user?.displayName, user?.username],
  );

  return {
    slots: leaves.slots as LeaveSlot[],
    saveLeave,
    deleteLeave,
    approveLeave: (slotId: string) => setLeaveStatus(slotId, 'approved'),
    rejectLeave: (slotId: string) => setLeaveStatus(slotId, 'rejected'),
  };
}
