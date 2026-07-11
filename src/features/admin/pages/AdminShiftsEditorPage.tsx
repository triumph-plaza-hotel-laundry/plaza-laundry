import { useCallback, useEffect, useMemo, useState } from 'react';
import { WeeklyShiftScheduleTable } from '@/components/shifts/WeeklyShiftScheduleTable';
import {
  type ShiftPeriod,
  type ShiftRole,
  type WeekDayId,
  weekDays,
} from '@/data/laundry-shifts';
import { employeesRepository } from '@/data/repositories/employees-repository';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { findDuplicateEmployeeIds } from '@/lib/admin-shift-validation';
import { getShiftEligibleEmployees } from '@/lib/employee-roles';
import { useAuth, useLanguage, useSyncStore } from '@/hooks';

export function AdminShiftsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const employees = useSyncStore(employeesRepository);
  const selectableEmployees = useMemo(
    () => getShiftEligibleEmployees(employees),
    [employees],
  );
  const { draft, isDirty, setField, resetDraft, commitDraft } =
    useDraftState(shiftsRepository);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'error';
  } | null>(null);

  const duplicateDays = useMemo(() => {
    return weekDays.filter(
      (day) => findDuplicateEmployeeIds(draft.weeklySchedule[day]).length > 0,
    );
  }, [draft.weeklySchedule]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSlotChange = useCallback(
    (
      day: WeekDayId,
      role: ShiftRole,
      period: ShiftPeriod,
      index: 0 | 1,
      employeeId: string,
    ) => {
      setToast(null);
      setField((current) => {
        const cell = current.weeklySchedule[day][role];
        const pair = [...cell[period]] as [string, string];
        pair[index] = employeeId;

        return {
          ...current,
          weeklySchedule: {
            ...current.weeklySchedule,
            [day]: {
              ...current.weeklySchedule[day],
              [role]: {
                ...cell,
                [period]: pair,
              },
            },
          },
        };
      });
    },
    [setField],
  );

  const handleSave = useCallback(async () => {
    if (duplicateDays.length > 0) {
      const proceed = window.confirm(t('admin.shifts.duplicateWarning'));
      if (!proceed) {
        return;
      }
    }

    setIsSaving(true);
    setToast(null);

    try {
      assertCan('shifts', 'update');
      await commitDraft(async (value) => {
        await shiftsRepository.replaceAll(value);
        logAction({
          action: 'shifts.replaceAll',
          page: 'admin/shifts',
          newValue: value,
        });
      });
      setToast({ message: t('admin.editor.saveSuccess'), tone: 'success' });
    } catch (error) {
      setToast({
        message:
          error instanceof Error ? error.message : t('admin.editor.saveError'),
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [assertCan, commitDraft, duplicateDays.length, logAction, t]);

  const handleReset = useCallback(() => {
    resetDraft();
    setToast(null);
  }, [resetDraft]);

  return (
    <WeeklyShiftScheduleTable
      editable
      employees={employees}
      isDirty={isDirty}
      isSaving={isSaving}
      onReset={handleReset}
      onSave={handleSave}
      onSlotChange={handleSlotChange}
      selectableEmployees={selectableEmployees}
      toast={toast}
      weeklySchedule={draft.weeklySchedule}
    />
  );
}
