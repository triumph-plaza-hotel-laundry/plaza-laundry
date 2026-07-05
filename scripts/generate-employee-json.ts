import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDefaultShiftsState } from '@/data/laundry-shifts';
import { laundryEmployees } from '@/data/laundry-employees';
import { MANAGER_EMPLOYEE_IDS } from '@/lib/employee-roles';
import { stripRemovedEmployeeIds } from '@/lib/shift-schedule-utils';

const scriptDir = dirname(fileURLToPath(import.meta.url));

writeFileSync(
  join(scriptDir, 'employees-data.json'),
  JSON.stringify([...laundryEmployees], null, 2),
);
const shifts = createDefaultShiftsState();
shifts.weeklySchedule = stripRemovedEmployeeIds(shifts.weeklySchedule, MANAGER_EMPLOYEE_IDS);

writeFileSync(join(scriptDir, 'shifts-default-data.json'), JSON.stringify(shifts, null, 2));

console.log('Generated employees-data.json and shifts-default-data.json');
