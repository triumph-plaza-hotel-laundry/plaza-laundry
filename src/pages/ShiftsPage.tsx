import { WeeklyShiftScheduleTable } from '@/components/shifts/WeeklyShiftScheduleTable';
import { employeesRepository } from '@/data/repositories';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { useSyncStore } from '@/hooks';

export function ShiftsPage() {
  const shifts = useSyncStore(shiftsRepository);
  const employees = useSyncStore(employeesRepository);

  return (
    <WeeklyShiftScheduleTable
      employees={employees}
      weeklySchedule={shifts.weeklySchedule}
    />
  );
}
