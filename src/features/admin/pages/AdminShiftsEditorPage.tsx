import { useCallback, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';

import { AdminShiftsDaySelector } from '@/features/admin/components/admin-shifts/AdminShiftsDaySelector';

import { AdminShiftsDepartmentAccordion } from '@/features/admin/components/admin-shifts/AdminShiftsDepartmentAccordion';

import { AdminShiftsSummaryCard } from '@/features/admin/components/admin-shifts/AdminShiftsSummaryCard';

import { AdminShiftsTimeCard } from '@/features/admin/components/admin-shifts/AdminShiftsTimeCard';

import { useDraftState } from '@/features/admin/hooks/useDraftState';

import {

  getCairoWeekDay,

  type ShiftPeriod,

  type ShiftRole,

  type WeekDayId,

} from '@/data/laundry-shifts';

import { employeesRepository } from '@/data/repositories/employees-repository';

import { shiftsRepository } from '@/data/repositories/shifts-repository';

import {

  getAdminShiftDepartments,

  type AdminShiftDepartmentView,

} from '@/lib/admin-shift-departments';

import { findDuplicateEmployeeIds } from '@/lib/admin-shift-validation';

import { getShiftEligibleEmployees } from '@/lib/employee-roles';

import { useAuth, useLanguage, useSyncStore } from '@/hooks';

import '@/features/admin/components/admin-shifts/admin-shifts-editor.css';



type SlotKey = 'morning0' | 'morning1' | 'evening0' | 'evening1';



const slotMap: Record<SlotKey, { period: ShiftPeriod; index: 0 | 1 }> = {

  morning0: { period: 'morning', index: 0 },

  morning1: { period: 'morning', index: 1 },

  evening0: { period: 'evening', index: 0 },

  evening1: { period: 'evening', index: 1 },

};



export function AdminShiftsEditorPage() {

  const { t } = useLanguage();

  const { assertCan, logAction } = useAuth();

  const employees = useSyncStore(employeesRepository);

  const { draft, isDirty, setField, commitDraft } = useDraftState(shiftsRepository);

  const [selectedDay, setSelectedDay] = useState<WeekDayId>(() => getCairoWeekDay());

  const [openDepartmentId, setOpenDepartmentId] = useState<AdminShiftDepartmentView['id']>('laundry');

  const [isSaving, setIsSaving] = useState(false);

  const [saveNotice, setSaveNotice] = useState<'saved' | null>(null);

  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);



  const shiftEmployees = useMemo(() => getShiftEligibleEmployees(employees), [employees]);

  const departments = useMemo(() => getAdminShiftDepartments(shiftEmployees), [shiftEmployees]);

  const baselineDaySchedule = shiftsRepository.getSnapshot().weeklySchedule[selectedDay];

  const daySchedule = draft.weeklySchedule[selectedDay];

  const dayHours = draft.workingHours[selectedDay];

  const duplicateIds = useMemo(() => findDuplicateEmployeeIds(daySchedule), [daySchedule]);



  const updateSlot = useCallback(

    (role: ShiftRole, slot: SlotKey, employeeId: string) => {

      const { period, index } = slotMap[slot];

      setSaveNotice(null);

      setSaveError(null);

      setField((current) => {

        const cell = current.weeklySchedule[selectedDay][role];

        const pair = [...cell[period]] as [string, string];

        pair[index] = employeeId;

        return {

          ...current,

          weeklySchedule: {

            ...current.weeklySchedule,

            [selectedDay]: {

              ...current.weeklySchedule[selectedDay],

              [role]: {

                ...cell,

                [period]: pair,

              },

            },

          },

        };

      });

    },

    [selectedDay, setField],

  );



  const updateHours = useCallback(

    (period: ShiftPeriod, value: string) => {

      setSaveNotice(null);

      setSaveError(null);

      setField((current) => ({

        ...current,

        workingHours: {

          ...current.workingHours,

          [selectedDay]: {

            ...current.workingHours[selectedDay],

            [period]: { en: value, ar: value },

          },

        },

      }));

    },

    [selectedDay, setField],

  );



  const resetDepartment = useCallback(

    (role: ShiftRole) => {

      const savedRole = shiftsRepository.getSnapshot().weeklySchedule[selectedDay][role];

      setSaveNotice(null);

      setSaveError(null);

      setField((current) => ({

        ...current,

        weeklySchedule: {

          ...current.weeklySchedule,

          [selectedDay]: {

            ...current.weeklySchedule[selectedDay],

            [role]: structuredClone(savedRole),

          },

        },

      }));

    },

    [selectedDay, setField],

  );



  const handleSave = useCallback(async () => {

    if (duplicateIds.length > 0) {

      const proceed = window.confirm(t('admin.shifts.duplicateWarning'));

      if (!proceed) {

        return;

      }

    }



    setIsSaving(true);

    setSaveNotice(null);

    setSaveError(null);

    setSaveNoticeIsError(false);



    try {

      assertCan('shifts', 'update');

      await commitDraft(async (value) => {

        await shiftsRepository.replaceAll(value);

        logAction({ action: 'shifts.replaceAll', page: 'admin/shifts', newValue: value });

      });

      setSaveNotice('saved');

    } catch (error) {

      setSaveError(error instanceof Error ? error.message : t('admin.editor.saveError'));

      setSaveNoticeIsError(true);

    } finally {

      setIsSaving(false);

    }

  }, [assertCan, commitDraft, duplicateIds.length, logAction, t]);



  const toggleDepartment = useCallback((departmentId: AdminShiftDepartmentView['id']) => {

    setOpenDepartmentId((current) => (current === departmentId ? current : departmentId));

  }, []);



  return (

    <section className="admin-editor-page admin-shifts-editor mx-auto">

      <AdminPageHeader

        subtitle={t('admin.editor.shiftsSubtitle')}

        titleAr="إدارة الشيفتات"

        titleEn="Manage Shifts"

      />



      <AdminShiftsSummaryCard daySchedule={daySchedule} selectedDay={selectedDay} />



      {(isDirty || saveNotice === 'saved') && !saveNoticeIsError ? (

        <p

          className={`admin-shifts-editor__status${

            saveNotice === 'saved' ? ' admin-shifts-editor__status--saved' : ' admin-shifts-editor__status--dirty'

          }`}

        >

          <span aria-hidden="true" className="admin-shifts-editor__status-dot">

            {saveNotice === 'saved' ? '✔' : '●'}

          </span>

          {saveNotice === 'saved' ? t('admin.shifts.status.saved') : t('admin.shifts.status.unsaved')}

        </p>

      ) : null}



      {saveError ? <p className="admin-shifts-editor__warning">{saveError}</p> : null}



      {duplicateIds.length > 0 ? (

        <p className="admin-shifts-editor__warning">{t('admin.shifts.duplicateWarning')}</p>

      ) : null}



      <AdminShiftsDaySelector

        onSelectDay={(day) => {

          setSelectedDay(day);

          setSaveNotice(null);

          setSaveError(null);

        }}

        selectedDay={selectedDay}

      />



      <AdminShiftsTimeCard
        eveningValue={dayHours.evening.en}
        morningValue={dayHours.morning.en}
        onUpdateHours={updateHours}
      />



      <div className="admin-shifts-editor__departments">

        {departments.map((department) => (

          <AdminShiftsDepartmentAccordion

            baselineDaySchedule={baselineDaySchedule}

            currentDaySchedule={daySchedule}

            department={department}

            isOpen={openDepartmentId === department.id}

            isSaving={isSaving}

            key={department.id}

            onResetDepartment={() => resetDepartment(department.shiftRole)}

            onSaveDepartment={() => void handleSave()}

            onToggle={() => toggleDepartment(department.id)}

            onUpdateSlot={updateSlot}

          />

        ))}

      </div>



      <footer className="admin-shifts-editor__footer">

        <button

          className="admin-shifts-editor__save-all"

          disabled={isSaving || !isDirty}

          onClick={() => void handleSave()}

          type="button"

        >

          {isSaving ? t('admin.editor.saving') : t('admin.shifts.saveAll')}

        </button>

      </footer>

    </section>

  );

}


