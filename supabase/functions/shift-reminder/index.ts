import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {
  getDepartmentTargetLabel,
  getEmployeesForDepartmentTarget,
} from '../_shared/employee-department-targets.ts';
import {
  buildTomorrowShiftAssignments,
  formatShiftReminderNotification,
  getTomorrowCairoDateKey,
  normalizeShiftsState,
  type LaundryEmployee,
  type TomorrowShiftAssignment,
} from '../_shared/shift-reminder-logic.ts';
import {
  getCairoHHMM,
  isWithinShiftReminderSendWindow,
  loadShiftReminderTime,
  SHIFT_REMINDER_TIMEZONE,
} from '../_shared/shift-reminder-settings.ts';

const SHIFTS_KEY = 'tpl-shifts';
const EMPLOYEES_KEY = 'tpl-employees-v1';
const PRIMARY_ADMIN_ID = 'primary-admin-kamel';

type ManualAudience =
  | 'everyone'
  | 'department'
  | 'employee'
  | 'shift_tomorrow';

type RequestBody = {
  mode?: 'cron' | 'manual';
  audience?: ManualAudience;
  departmentId?: string;
  employeeId?: string;
  title?: string;
  body?: string;
  triggeredBy?: string;
};

type SubscriptionRow = {
  id: string;
  employee_id: string;
  onesignal_player_id: string;
  laundry_employee_id: string | null;
};

type HistoryInsert = {
  type: 'shift_reminder' | 'shift_manual';
  target_date: string;
  laundry_employee_id: string | null;
  employee_name_en: string | null;
  employee_name_ar: string | null;
  admin_user_id: string | null;
  onesignal_player_id: string | null;
  title_en: string;
  body_en: string;
  shift_period: string | null;
  shift_role: string | null;
  department_en: string | null;
  start_time: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error_message: string | null;
  triggered_by: string;
  audience: string;
  sent_at: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-cron-secret, x-owner-id',
    },
  });
}

async function sendOneSignalNotification(
  appId: string,
  restKey: string,
  playerId: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${restKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_subscription_ids: [playerId],
      headings: { en: title },
      contents: { en: body },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  return { ok: true };
}

async function loadFreshScheduleData(supabase: ReturnType<typeof createClient>) {
  const [{ data: shiftsRow, error: shiftsError }, { data: employeesRow, error: employeesError }] =
    await Promise.all([
      supabase
        .from('app_data_documents')
        .select('data, updated_at')
        .eq('document_key', SHIFTS_KEY)
        .maybeSingle(),
      supabase
        .from('app_data_documents')
        .select('data, updated_at')
        .eq('document_key', EMPLOYEES_KEY)
        .maybeSingle(),
    ]);

  if (shiftsError) {
    throw new Error(`Failed to load shifts: ${shiftsError.message}`);
  }
  if (employeesError) {
    throw new Error(`Failed to load employees: ${employeesError.message}`);
  }

  const shifts = normalizeShiftsState(shiftsRow?.data);
  if (!shifts) {
    throw new Error('Weekly shift schedule is missing or invalid');
  }

  const employees = (employeesRow?.data ?? []) as LaundryEmployee[];

  return {
    shifts,
    employees,
    shiftsUpdatedAt: shiftsRow?.updated_at ?? null,
  };
}

async function resolveSubscriptions(
  supabase: ReturnType<typeof createClient>,
  laundryEmployeeId: string,
): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from('onesignal_subscriptions')
    .select('id, employee_id, onesignal_player_id, laundry_employee_id')
    .or(
      `laundry_employee_id.eq.${laundryEmployeeId},employee_id.eq.${laundryEmployeeId}`,
    );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SubscriptionRow[];

  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('id, laundry_employee_id')
    .eq('laundry_employee_id', laundryEmployeeId);

  const adminIds = (adminUsers ?? []).map((row) => row.id as string);
  if (adminIds.length === 0) {
    return rows.filter((row) => row.laundry_employee_id === laundryEmployeeId);
  }

  const { data: linkedSubs } = await supabase
    .from('onesignal_subscriptions')
    .select('id, employee_id, onesignal_player_id, laundry_employee_id')
    .in('employee_id', adminIds);

  const merged = new Map<string, SubscriptionRow>();
  for (const row of [...rows, ...((linkedSubs ?? []) as SubscriptionRow[])]) {
    merged.set(row.onesignal_player_id, row);
  }

  return Array.from(merged.values());
}

async function logHistory(
  supabase: ReturnType<typeof createClient>,
  row: HistoryInsert,
) {
  const { error } = await supabase
    .from('push_notification_history')
    .insert(row);

  if (error) {
    console.error('[shift-reminder] history insert failed', error.message);
  }
}

async function hasCronReminderBeenSent(
  supabase: ReturnType<typeof createClient>,
  targetDate: string,
  laundryEmployeeId: string,
  playerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('push_notification_history')
    .select('id')
    .eq('type', 'shift_reminder')
    .eq('target_date', targetDate)
    .eq('laundry_employee_id', laundryEmployeeId)
    .eq('onesignal_player_id', playerId)
    .eq('triggered_by', 'cron')
    .eq('status', 'sent')
    .maybeSingle();

  return Boolean(data);
}

async function deliverAssignment(
  supabase: ReturnType<typeof createClient>,
  appId: string,
  restKey: string,
  assignment: TomorrowShiftAssignment,
  triggeredBy: string,
  audience: string,
  type: 'shift_reminder' | 'shift_manual',
  custom?: { title?: string; body?: string },
) {
  const message =
    custom?.title && custom?.body
      ? { title: custom.title, body: custom.body }
      : formatShiftReminderNotification(assignment);

  const subscriptions = await resolveSubscriptions(
    supabase,
    assignment.employeeId,
  );

  if (subscriptions.length === 0) {
    await logHistory(supabase, {
      type,
      target_date: assignment.targetDateKey,
      laundry_employee_id: assignment.employeeId,
      employee_name_en: assignment.employeeNameEn,
      employee_name_ar: assignment.employeeNameAr,
      admin_user_id: null,
      onesignal_player_id: null,
      title_en: message.title,
      body_en: message.body,
      shift_period: assignment.period,
      shift_role: assignment.role,
      department_en: assignment.departmentEn,
      start_time: assignment.startTimeEn,
      status: 'skipped',
      error_message: 'No OneSignal subscription for employee',
      triggered_by: triggeredBy,
      audience,
      sent_at: null,
    });
    return { sent: 0, failed: 0, skipped: 1 };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (
      type === 'shift_reminder' &&
      (await hasCronReminderBeenSent(
        supabase,
        assignment.targetDateKey,
        assignment.employeeId,
        subscription.onesignal_player_id,
      ))
    ) {
      continue;
    }

    const result = await sendOneSignalNotification(
      appId,
      restKey,
      subscription.onesignal_player_id,
      message.title,
      message.body,
    );

    await logHistory(supabase, {
      type,
      target_date: assignment.targetDateKey,
      laundry_employee_id: assignment.employeeId,
      employee_name_en: assignment.employeeNameEn,
      employee_name_ar: assignment.employeeNameAr,
      admin_user_id: subscription.employee_id,
      onesignal_player_id: subscription.onesignal_player_id,
      title_en: message.title,
      body_en: message.body,
      shift_period: assignment.period,
      shift_role: assignment.role,
      department_en: assignment.departmentEn,
      start_time: assignment.startTimeEn,
      status: result.ok ? 'sent' : 'failed',
      error_message: result.ok ? null : result.error ?? 'Send failed',
      triggered_by: triggeredBy,
      audience,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { sent, failed, skipped: 0 };
}

async function verifyOwner(
  supabase: ReturnType<typeof createClient>,
  ownerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id, is_owner, is_protected')
    .eq('id', ownerId)
    .maybeSingle();

  return Boolean(
    data &&
      data.id === ownerId &&
      (data.is_owner || data.is_protected || data.id === PRIMARY_ADMIN_ID),
  );
}

function sanitizeManualBody(body: RequestBody): RequestBody {
  const sanitize = (value?: string) =>
    typeof value === 'string' ? value.trim().slice(0, 500) : value;

  return {
    ...body,
    mode: body.mode,
    audience: body.audience,
    departmentId: sanitize(body.departmentId),
    employeeId: sanitize(body.employeeId),
    title: sanitize(body.title),
    body: sanitize(body.body),
    triggeredBy: sanitize(body.triggeredBy),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalRestKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const cronSecret = Deno.env.get('SHIFT_REMINDER_CRON_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase not configured' }, 500);
    }
    if (!oneSignalAppId || !oneSignalRestKey) {
      return jsonResponse({ error: 'OneSignal server keys not configured' }, 500);
    }

    const body = sanitizeManualBody(
      (await request.json().catch(() => ({}))) as RequestBody,
    );
    const mode = body.mode ?? 'cron';

    if (mode === 'cron') {
      const headerSecret = request.headers.get('x-cron-secret');
      const authHeader = request.headers.get('Authorization') ?? '';
      const authorized =
        (cronSecret && headerSecret === cronSecret) ||
        authHeader === `Bearer ${serviceRoleKey}`;
      if (!authorized) {
        return jsonResponse({ error: 'Unauthorized cron invocation' }, 401);
      }
    } else {
      const ownerId = body.triggeredBy ?? request.headers.get('x-owner-id') ?? '';
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      if (!ownerId || !(await verifyOwner(supabase, ownerId))) {
        return jsonResponse({ error: 'Owner authorization required' }, 403);
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const reminderTime = await loadShiftReminderTime(supabase);
    const cairoNow = getCairoHHMM();

    if (mode === 'cron' && !isWithinShiftReminderSendWindow(reminderTime)) {
      return jsonResponse({
        ok: true,
        mode,
        skippedReason: 'outside_send_window',
        reminderTime,
        cairoTime: cairoNow,
        timeZone: SHIFT_REMINDER_TIMEZONE,
        targeted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const { shifts, employees, shiftsUpdatedAt } =
      await loadFreshScheduleData(supabase);

    const triggeredBy =
      mode === 'cron' ? 'cron' : (body.triggeredBy ?? PRIMARY_ADMIN_ID);
    const audience = body.audience ?? 'shift_tomorrow';

    let assignments = buildTomorrowShiftAssignments(shifts, employees);

    if (mode === 'manual') {
      const targetDateKey = assignments[0]?.targetDateKey ?? getTomorrowCairoDateKey();

      if (audience === 'shift_tomorrow') {
        // assignments already filtered to tomorrow shift holders
      } else if (audience === 'employee' && body.employeeId) {
        const employee = employees.find((entry) => entry.id === body.employeeId);
        const existing = assignments.find((a) => a.employeeId === body.employeeId);
        if (existing) {
          assignments = [existing];
        } else if (employee && body.title && body.body) {
          assignments = [
            {
              employeeId: employee.id,
              employeeNameEn: employee.name.en,
              employeeNameAr: employee.name.ar,
              departmentEn: employee.department.en,
              departmentAr: employee.department.ar,
              period: 'morning',
              shiftLabelEn: 'Announcement',
              shiftLabelAr: 'إعلان',
              role: 'washer',
              startTimeEn: '—',
              startTimeAr: '—',
              targetDateKey,
            },
          ];
        } else {
          assignments = [];
        }
      } else if (audience === 'department' && body.departmentId) {
        const deptEmployees = getEmployeesForDepartmentTarget(
          employees,
          body.departmentId,
        ).filter((entry) => entry.status === 'active');

        const departmentLabel =
          getDepartmentTargetLabel(employees, body.departmentId) ?? body.departmentId;

        if (body.title && body.body) {
          assignments = deptEmployees.map((employee) => ({
            employeeId: employee.id,
            employeeNameEn: employee.name.en,
            employeeNameAr: employee.name.ar,
            departmentEn: departmentLabel,
            departmentAr: employee.department.ar,
            period: 'morning' as const,
            shiftLabelEn: 'Announcement',
            shiftLabelAr: 'إعلان',
            role: 'washer' as const,
            startTimeEn: '—',
            startTimeAr: '—',
            targetDateKey,
          }));
        } else {
          const deptEmployeeIds = new Set(deptEmployees.map((entry) => entry.id));
          assignments = assignments.filter((entry) =>
            deptEmployeeIds.has(entry.employeeId),
          );
        }
      } else if (audience === 'everyone') {
        if (body.title && body.body) {
          assignments = employees
            .filter((entry) => entry.status === 'active')
            .map((employee) => ({
              employeeId: employee.id,
              employeeNameEn: employee.name.en,
              employeeNameAr: employee.name.ar,
              departmentEn: employee.department.en,
              departmentAr: employee.department.ar,
              period: 'morning' as const,
              shiftLabelEn: 'Announcement',
              shiftLabelAr: 'إعلان',
              role: 'washer' as const,
              startTimeEn: '—',
              startTimeAr: '—',
              targetDateKey,
            }));
        }
      }
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const assignment of assignments) {
      const custom =
        mode === 'manual' && body.title && body.body
          ? {
              title: body.title,
              body: body.body.replace(/\{name\}/g, assignment.employeeNameEn),
            }
          : undefined;

      const result = await deliverAssignment(
        supabase,
        oneSignalAppId,
        oneSignalRestKey,
        assignment,
        triggeredBy,
        audience,
        mode === 'cron' ? 'shift_reminder' : 'shift_manual',
        custom,
      );
      sent += result.sent;
      failed += result.failed;
      skipped += result.skipped;
    }

    return jsonResponse({
      ok: true,
      mode,
      audience,
      shiftsUpdatedAt,
      reminderTime,
      cairoTime: cairoNow,
      timeZone: SHIFT_REMINDER_TIMEZONE,
      targeted: assignments.length,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
