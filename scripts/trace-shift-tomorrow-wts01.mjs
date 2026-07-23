/**
 * Trace shift_tomorrow targeting for wts-01 against live schedule data.
 * Mirrors supabase/functions/_shared/shift-reminder-logic.ts selection rules.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const TARGET = 'wts-01';

const weekDays = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];
const shiftRoles = [
  'washer',
  'ghalya',
  'ironing',
  'linen',
  'calendar',
  'weeklyLeave',
  'annualLeave',
];
const MANAGER_IDS = new Set(['gm-01', 'dm-01']);

function getCairoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
  };
}

function getCairoWeekDay(date) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
  }).format(date);
  const map = {
    Sat: 'saturday',
    Sun: 'sunday',
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
  };
  return map[weekday] ?? 'sunday';
}

function addCairoDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return getCairoDateParts(date);
}

function getTomorrowCairoDateKey(now = new Date()) {
  const tomorrow = addCairoDays(getCairoDateParts(now), 1);
  return `${tomorrow.year}-${String(tomorrow.month).padStart(2, '0')}-${String(tomorrow.day).padStart(2, '0')}`;
}

function getTomorrowWeekDayId(now = new Date()) {
  const tomorrow = addCairoDays(getCairoDateParts(now), 1);
  const date = new Date(Date.UTC(tomorrow.year, tomorrow.month - 1, tomorrow.day, 12));
  return getCairoWeekDay(date);
}

function isManagerEmployee(employee) {
  return (
    MANAGER_IDS.has(employee.id) ||
    employee.tier === 'generalManager' ||
    employee.tier === 'departmentManager'
  );
}

function findEmployeeShiftSlots(employeeId, daySchedule) {
  const slots = [];
  for (const role of shiftRoles) {
    const cell = daySchedule[role];
    if (!cell) continue;
    (cell.morning ?? []).forEach((id, index) => {
      if (id === employeeId) slots.push({ role, period: 'morning', slotIndex: index });
    });
    (cell.evening ?? []).forEach((id, index) => {
      if (id === employeeId) slots.push({ role, period: 'evening', slotIndex: index });
    });
  }
  return slots;
}

function getEmployeeDayShiftStatus(employeeId, daySchedule) {
  const slots = findEmployeeShiftSlots(employeeId, daySchedule);
  if (slots.length === 0) return 'dayOff';
  if (slots.some((s) => s.role === 'weeklyLeave' || s.role === 'annualLeave')) {
    return 'dayOff';
  }
  if (slots.some((s) => s.period === 'morning')) return 'morning';
  if (slots.some((s) => s.period === 'evening')) return 'evening';
  return 'dayOff';
}

function buildTomorrowShiftAssignments(shifts, employees, now = new Date()) {
  const weekDayId = getTomorrowWeekDayId(now);
  const targetDateKey = getTomorrowCairoDateKey(now);
  const daySchedule = shifts.weeklySchedule[weekDayId];
  const exclusions = [];
  const assignments = [];

  for (const employee of employees) {
    if (employee.status !== 'active') {
      if (employee.id === TARGET) {
        exclusions.push({ id: employee.id, reason: `status=${employee.status}` });
      }
      continue;
    }
    if (isManagerEmployee(employee)) {
      if (employee.id === TARGET) {
        exclusions.push({ id: employee.id, reason: 'manager filter' });
      }
      continue;
    }
    const status = getEmployeeDayShiftStatus(employee.id, daySchedule);
    if (status === 'dayOff') {
      if (employee.id === TARGET) {
        const slots = findEmployeeShiftSlots(employee.id, daySchedule);
        exclusions.push({
          id: employee.id,
          reason: 'dayOff',
          slots,
        });
      }
      continue;
    }
    const slots = findEmployeeShiftSlots(employee.id, daySchedule);
    if (slots.length === 0) {
      if (employee.id === TARGET) {
        exclusions.push({ id: employee.id, reason: 'no slots' });
      }
      continue;
    }
    assignments.push({
      employeeId: employee.id,
      period: status,
      role: slots[0].role,
      targetDateKey,
      weekDayId,
    });
  }

  return { assignments, exclusions, weekDayId, targetDateKey, daySchedule };
}

const now = new Date();
console.log('now ISO', now.toISOString());
console.log('tomorrowCairoDateKey', getTomorrowCairoDateKey(now));
console.log('tomorrowWeekDayId', getTomorrowWeekDayId(now));

const [{ data: shiftsRow, error: shiftsError }, { data: employeesRow, error: employeesError }] =
  await Promise.all([
    client
      .from('app_data_documents')
      .select('data, updated_at')
      .eq('document_key', 'tpl-shifts')
      .maybeSingle(),
    client
      .from('app_data_documents')
      .select('data, updated_at')
      .eq('document_key', 'tpl-employees-v1')
      .maybeSingle(),
  ]);

if (shiftsError || employeesError) {
  console.error({ shiftsError, employeesError });
  process.exit(1);
}

const shifts = shiftsRow?.data;
const employees = employeesRow?.data ?? [];
console.log('employeesLoaded', employees.length);
console.log('shiftsUpdatedAt', shiftsRow?.updated_at);

const wts = employees.find((e) => e.id === TARGET);
console.log('wts-01 employee record', {
  id: wts?.id,
  status: wts?.status,
  tier: wts?.tier,
  name: wts?.name,
  department: wts?.department,
});

const { assignments, exclusions, weekDayId, targetDateKey, daySchedule } =
  buildTomorrowShiftAssignments(shifts, employees, now);

const allIdsInDay = new Set();
for (const role of shiftRoles) {
  const cell = daySchedule?.[role];
  for (const id of cell?.morning ?? []) if (id) allIdsInDay.add(id);
  for (const id of cell?.evening ?? []) if (id) allIdsInDay.add(id);
}
console.log('tomorrow weekday', weekDayId, 'date', targetDateKey);
console.log('all ids on tomorrow schedule', [...allIdsInDay].sort());
console.log(
  'ids containing wts',
  [...allIdsInDay].filter((id) => String(id).toLowerCase().includes('wts')),
);
console.log('wts-01 raw slots', findEmployeeShiftSlots(TARGET, daySchedule));
console.log('assignmentsCount', assignments.length);
console.log(
  'assignmentEmployeeIds',
  assignments.map((a) => a.employeeId),
);
const included = assignments.find((a) => a.employeeId === TARGET);
console.log('wts-01 included?', Boolean(included), included ?? null);
console.log('wts-01 exclusions', exclusions.filter((e) => e.id === TARGET));

const history = await client
  .from('push_notification_history')
  .select(
    'type, audience, status, error_message, laundry_employee_id, onesignal_player_id, title_en, triggered_by, created_at',
  )
  .eq('audience', 'shift_tomorrow')
  .order('created_at', { ascending: false })
  .limit(20);
console.log('\n=== recent shift_tomorrow history ===');
console.log(JSON.stringify(history.data, null, 2));

const anyWtsShift = await client
  .from('push_notification_history')
  .select(
    'type, audience, status, error_message, laundry_employee_id, title_en, created_at',
  )
  .eq('laundry_employee_id', TARGET)
  .order('created_at', { ascending: false })
  .limit(10);
console.log('\n=== recent wts-01 history (any audience) ===');
console.log(JSON.stringify(anyWtsShift.data, null, 2));
