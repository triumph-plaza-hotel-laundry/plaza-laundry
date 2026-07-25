import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {
  getDepartmentTargetLabel,
  getEmployeesForDepartmentTarget,
} from '../_shared/employee-department-targets.ts';
import {
  buildTomorrowShiftAssignments,
  formatShiftReminderNotification,
  getTomorrowCairoDateKey,
  getTomorrowWeekDayId,
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
import {
  sendOneSignalNotificationLegacy,
  sendToSubscriptionId,
} from '../_shared/notification-delivery.ts';

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
  action?: string;
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
  is_valid?: boolean | null;
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
  options?: {
    supabase?: ReturnType<typeof createClient>;
    historyId?: string | null;
    data?: Record<string, unknown>;
    launchUrl?: string;
  },
): Promise<{ ok: boolean; error?: string; invalidPlayerIds?: string[] }> {
  console.log('[shift-reminder] sendOneSignalNotification start', {
    subscriptionId: playerId,
    historyId: options?.historyId ?? null,
    titlePreview: title.slice(0, 40),
    launchUrl: options?.launchUrl ?? null,
  });

  try {
    const result = await sendToSubscriptionId({
      appId,
      restKey,
      playerId,
      title,
      body,
      maxAttempts: 3,
      data: options?.data,
      launchUrl: options?.launchUrl,
    });

    if (options?.supabase) {
      console.log('[shift-reminder] writing delivery attempts', {
        count: result.attempts.length,
        subscriptionId: playerId,
      });
      for (const attempt of result.attempts) {
        const { error: attemptError } = await options.supabase
          .from('notification_delivery_attempts')
          .insert({
            history_id: options.historyId ?? null,
            onesignal_player_id: playerId,
            attempt_number: attempt.attemptNumber,
            http_status: attempt.httpStatus,
            recipients: attempt.recipients,
            onesignal_notification_id: attempt.onesignalNotificationId,
            response_body: attempt.responseBody,
            error_message: attempt.errorMessage,
            status: attempt.ok ? 'sent' : 'failed',
            recovery_action: attempt.ok
              ? null
              : result.invalidPlayerIds.includes(playerId)
                ? 'mark_invalid'
                : 'retry',
          });
        if (attemptError) {
          console.error(
            '[shift-reminder] delivery attempt insert failed',
            attemptError.message,
          );
        }
      }

      for (const invalidId of result.invalidPlayerIds) {
        console.warn('[shift-reminder] marking subscription invalid', invalidId);
        await options.supabase.rpc('mark_onesignal_subscription_invalid', {
          p_player_id: invalidId,
          p_reason: 'OneSignal reported invalid/zero recipients',
        });
      }

      const { error: eventError } = await options.supabase
        .from('notification_platform_events')
        .insert({
          category: 'delivery',
          severity: result.ok ? 'info' : 'error',
          message: result.ok
            ? 'Push delivered'
            : result.final.errorMessage ?? 'Push delivery failed',
          onesignal_player_id: playerId,
          payload: {
            recipients: result.final.recipients,
            httpStatus: result.final.httpStatus,
            attempts: result.attempts.length,
            onesignalNotificationId: result.final.onesignalNotificationId,
          },
          recovery_action: result.ok ? null : 'smart_retry_exhausted',
          retry_count: Math.max(0, result.attempts.length - 1),
          final_status: result.ok ? 'sent' : 'failed',
        });
      if (eventError) {
        console.error(
          '[shift-reminder] delivery event insert failed',
          eventError.message,
        );
      }
    }

    console.log('[shift-reminder] sendOneSignalNotification done', {
      ok: result.ok,
      error: result.ok ? null : result.final.errorMessage,
      onesignalNotificationId: result.final.onesignalNotificationId,
    });

    return {
      ok: result.ok,
      error: result.ok ? undefined : result.final.errorMessage ?? 'Send failed',
      invalidPlayerIds: result.invalidPlayerIds,
    };
  } catch (error) {
    console.error('[shift-reminder] sendOneSignalNotification catch', error);
    // Fallback to legacy single-shot if shared pipeline throws.
    const legacy = await sendOneSignalNotificationLegacy(
      appId,
      restKey,
      playerId,
      title,
      body,
    );
    return {
      ok: legacy.ok,
      error:
        legacy.error ??
        (error instanceof Error ? error.message : 'Delivery pipeline error'),
    };
  }
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

/** Resolve the single active player_id for an employee. No heal, no pools. */
async function resolveSubscriptions(
  supabase: ReturnType<typeof createClient>,
  laundryEmployeeId: string,
): Promise<SubscriptionRow[]> {
  console.log('[shift-reminder] resolve active device', { laundryEmployeeId });

  const { data, error } = await supabase
    .from('employee_notification_devices')
    .select('id, employee_id, player_id')
    .eq('employee_id', laundryEmployeeId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[shift-reminder] load device failed', error.message);
    throw new Error(error.message);
  }

  const playerId =
    typeof data?.player_id === 'string' ? data.player_id.trim() : '';
  if (!playerId) {
    console.warn('[shift-reminder] employee is not linked', {
      laundryEmployeeId,
    });
    return [];
  }

  console.log('[shift-reminder] resolved player_id', {
    laundryEmployeeId,
    playerId,
  });

  return [
    {
      id: (data?.id as string) ?? playerId,
      employee_id: laundryEmployeeId,
      onesignal_player_id: playerId,
      laundry_employee_id: laundryEmployeeId,
    },
  ];
}

async function logHistory(
  supabase: ReturnType<typeof createClient>,
  row: HistoryInsert,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('push_notification_history')
    .insert(row)
    .select('id')
    .maybeSingle();

  if (error) {
    // Unique cron dedupe: treat as already logged
    if (/duplicate|unique/i.test(error.message)) {
      console.warn('[shift-reminder] history dedupe hit', error.message);
      return null;
    }
    console.error('[shift-reminder] history insert failed', error.message);
    console.error('[push-trace:edge] STAGE history_insert_failed', {
      message: error.message,
      laundry_employee_id: row.laundry_employee_id,
      admin_user_id: row.admin_user_id,
      onesignal_player_id: row.onesignal_player_id,
    });
    return null;
  }
  return typeof data?.id === 'string' ? data.id : null;
}

async function upsertInboxNotification(
  supabase: ReturnType<typeof createClient>,
  input: {
    employeeId: string;
    title: string;
    body: string;
    status: 'sent' | 'failed' | 'skipped' | 'pending';
    historyId: string | null;
    dedupeKey: string;
    createdAt?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('employee_inbox_notifications')
    .upsert(
      {
        employee_id: input.employeeId,
        title: input.title,
        body: input.body,
        status: input.status,
        source: 'push',
        history_id: input.historyId,
        dedupe_key: input.dedupeKey,
        created_at: input.createdAt ?? new Date().toISOString(),
      },
      {
        onConflict: 'employee_id,dedupe_key',
        ignoreDuplicates: false,
      },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[shift-reminder] inbox upsert failed', error.message);
    console.error('[push-trace:edge] STAGE inbox_upsert_failed', {
      employeeId: input.employeeId,
      dedupeKey: input.dedupeKey,
      message: error.message,
    });
    return null;
  }

  const inboxId = typeof data?.id === 'string' ? data.id : null;
  console.log('[push-trace:edge] STAGE inbox_upsert_ok', {
    employeeId: input.employeeId,
    dedupeKey: input.dedupeKey,
    title: input.title,
    status: input.status,
    historyId: input.historyId,
    inboxId,
  });
  return inboxId;
}

function resolvePublicAppOrigin(): string {
  const configured =
    Deno.env.get('PUBLIC_APP_URL')?.trim() ||
    Deno.env.get('APP_ORIGIN')?.trim() ||
    Deno.env.get('VITE_PUBLIC_APP_URL')?.trim() ||
    'https://plaza-laundry-xi.vercel.app';
  return configured.replace(/\/$/, '');
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

  console.log('[shift-reminder] deliverAssignment start', {
    employeeId: assignment.employeeId,
    audience,
    type,
    title: message.title.slice(0, 40),
  });

  const subscriptions = await resolveSubscriptions(
    supabase,
    assignment.employeeId,
  );

  if (subscriptions.length === 0) {
    console.warn('[shift-reminder] no subscriptions — skipping', {
      employeeId: assignment.employeeId,
    });
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
      error_message: 'Employee is not linked.',
      triggered_by: triggeredBy,
      audience,
      sent_at: null,
    }).then(async (historyId) => {
      await upsertInboxNotification(supabase, {
        employeeId: assignment.employeeId,
        title: message.title,
        body: message.body,
        status: 'skipped',
        historyId,
        dedupeKey: `${type}:${assignment.targetDateKey}:${assignment.employeeId}:${triggeredBy}:unlinked`,
      });
    });
    return { sent: 0, failed: 0, skipped: 1 };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    console.log('[shift-reminder] selected subscription_id/player_id', {
      subscriptionId: subscription.onesignal_player_id,
      adminUserId: subscription.employee_id,
      laundryEmployeeId: subscription.laundry_employee_id,
    });

    if (
      type === 'shift_reminder' &&
      (await hasCronReminderBeenSent(
        supabase,
        assignment.targetDateKey,
        assignment.employeeId,
        subscription.onesignal_player_id,
      ))
    ) {
      console.log('[shift-reminder] skip — cron already sent for this player');
      continue;
    }

    const dedupeKey = `${type}:${assignment.targetDateKey}:${assignment.employeeId}:${triggeredBy}:${subscription.onesignal_player_id}`;

    // Create/update inbox row before send so the OS notification can deep-link.
    const pendingInboxId = await upsertInboxNotification(supabase, {
      employeeId: assignment.employeeId,
      title: message.title,
      body: message.body,
      status: 'pending',
      historyId: null,
      dedupeKey,
    });

    const appOrigin = resolvePublicAppOrigin();
    const launchUrl = pendingInboxId
      ? `${appOrigin}/?openNotification=${encodeURIComponent(pendingInboxId)}`
      : `${appOrigin}/?notifications=1`;

    const result = await sendOneSignalNotification(
      appId,
      restKey,
      subscription.onesignal_player_id,
      message.title,
      message.body,
      {
        supabase,
        data: {
          tpl_action: 'open_notification',
          inbox_id: pendingInboxId,
          employee_id: assignment.employeeId,
          type,
        },
        launchUrl,
      },
    );

    console.log('[shift-reminder] writing notification history', {
      status: result.ok ? 'sent' : 'failed',
      subscriptionId: subscription.onesignal_player_id,
      inboxId: pendingInboxId,
      launchUrl,
    });

    const sentAt = result.ok ? new Date().toISOString() : null;
    // admin_user_id FK → admin_users.id. Never store laundry employee ids here.
    const adminUserId =
      triggeredBy && triggeredBy !== 'cron' ? triggeredBy : null;
    const historyId = await logHistory(supabase, {
      type,
      target_date: assignment.targetDateKey,
      laundry_employee_id: assignment.employeeId,
      employee_name_en: assignment.employeeNameEn,
      employee_name_ar: assignment.employeeNameAr,
      admin_user_id: adminUserId,
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
      sent_at: sentAt,
    });

    console.log('[push-trace:edge] STAGE history_write', {
      historyId,
      adminUserId,
      playerId: subscription.onesignal_player_id,
      status: result.ok ? 'sent' : 'failed',
      wrote: Boolean(historyId),
    });

    await upsertInboxNotification(supabase, {
      employeeId: assignment.employeeId,
      title: message.title,
      body: message.body,
      status: result.ok ? 'sent' : 'failed',
      historyId,
      dedupeKey,
      createdAt: sentAt,
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }
  console.log('[shift-reminder] deliverAssignment done', {
    employeeId: assignment.employeeId,
    sent,
    failed,
  });

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
      console.error('[shift-reminder] missing SUPABASE_URL or SERVICE_ROLE_KEY');
      return jsonResponse({ error: 'Supabase not configured' }, 500);
    }

    const earlyBody = (await request.json().catch(() => ({}))) as RequestBody & {
      subscriptionId?: string;
      notificationId?: string;
    };
    if (earlyBody.action === 'health_ping') {
      return jsonResponse({
        ok: true,
        service: 'shift-reminder',
        ts: new Date().toISOString(),
      });
    }

    // TEMP diagnostics only — inspect OneSignal subscription / notification.
    if (
      earlyBody.action === 'inspect_subscription' ||
      earlyBody.action === 'inspect_notification'
    ) {
      if (!oneSignalAppId || !oneSignalRestKey) {
        return jsonResponse({ error: 'OneSignal not configured' }, 500);
      }
      const headers = {
        Authorization: `Key ${oneSignalRestKey}`,
        Accept: 'application/json',
      };

      if (earlyBody.action === 'inspect_subscription') {
        const subscriptionId = (
          earlyBody.subscriptionId ||
          earlyBody.employeeId ||
          ''
        ).trim();
        if (!subscriptionId) {
          return jsonResponse({ error: 'subscriptionId required' }, 400);
        }
        const urls = [
          `https://api.onesignal.com/apps/${oneSignalAppId}/subscriptions/${subscriptionId}`,
          `https://onesignal.com/api/v1/players/${subscriptionId}?app_id=${encodeURIComponent(oneSignalAppId)}`,
        ];
        const results = [];
        for (const url of urls) {
          const response = await fetch(url, { method: 'GET', headers });
          const text = await response.text();
          let json: unknown = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = text;
          }
          results.push({
            url: url.replace(oneSignalAppId, 'APP_ID'),
            httpStatus: response.status,
            body: json,
          });
        }
        return jsonResponse({
          ok: true,
          action: 'inspect_subscription',
          subscriptionId,
          results,
        });
      }

      const notificationId = (earlyBody.notificationId || '').trim();
      if (!notificationId) {
        return jsonResponse({ error: 'notificationId required' }, 400);
      }
      const url = `https://api.onesignal.com/notifications/${notificationId}?app_id=${encodeURIComponent(oneSignalAppId)}`;
      const response = await fetch(url, { method: 'GET', headers });
      const text = await response.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }
      return jsonResponse({
        ok: true,
        action: 'inspect_notification',
        notificationId,
        httpStatus: response.status,
        body: json,
      });
    }

    if (!oneSignalAppId || !oneSignalRestKey) {
      console.error('[shift-reminder] missing ONESIGNAL_APP_ID or REST API KEY');
      return jsonResponse({ error: 'OneSignal server keys not configured' }, 500);
    }

    console.log('[shift-reminder] request boot', {
      appIdPrefix: `${oneSignalAppId.slice(0, 8)}…`,
      restKeyPrefix: `${oneSignalRestKey.slice(0, 10)}…`,
      restKeyLen: oneSignalRestKey.length,
      hasServiceRole: Boolean(serviceRoleKey),
    });

    const body = sanitizeManualBody(earlyBody);

    const mode = body.mode ?? 'cron';
    console.log('[shift-reminder] request body', {
      mode,
      audience: body.audience,
      employeeId: body.employeeId,
      departmentId: body.departmentId,
      triggeredBy: body.triggeredBy,
      title: body.title?.slice(0, 40),
    });

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

    if (mode === 'cron') {
      // Safe non-destructive cleanup: expire stale QR tickets only.
      const { error: cleanupError } = await supabase.rpc(
        'expire_stale_notification_link_tickets',
      );
      if (cleanupError) {
        console.error(
          '[shift-reminder] ticket cleanup skipped',
          cleanupError.message,
        );
      }
    }

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

    console.log('[shift-reminder] schedule loaded', {
      employeesLoaded: employees.length,
      employeeIds: employees.map((entry) => entry.id),
      shiftsUpdatedAt,
      audience,
      mode,
      requestTitle: body.title ?? null,
      requestBodyPreview: body.body?.slice(0, 80) ?? null,
    });

    let assignments = buildTomorrowShiftAssignments(shifts, employees);
    const builtTargetDate =
      assignments[0]?.targetDateKey ?? getTomorrowCairoDateKey();
    const builtWeekDayId =
      assignments[0]?.weekDayId ?? getTomorrowWeekDayId();

    const inclusion = employees.map((employee) => {
      const assigned = assignments.find((row) => row.employeeId === employee.id);
      if (assigned) {
        return {
          employeeId: employee.id,
          included: true,
          reason: `on_shift_${assigned.period}_${assigned.role}`,
        };
      }

      let reason = 'not_in_assignments';
      if (employee.status !== 'active') {
        reason = `status_${employee.status}`;
      } else if (
        employee.id === 'gm-01' ||
        employee.id === 'dm-01' ||
        employee.tier === 'generalManager' ||
        employee.tier === 'departmentManager'
      ) {
        reason = 'manager_excluded';
      } else {
        reason = 'day_off_or_leave';
      }

      return {
        employeeId: employee.id,
        included: false,
        reason,
      };
    });

    console.log('[shift-reminder] tomorrow targeting', {
      targetDate: builtTargetDate,
      weekDayId: builtWeekDayId,
      assignmentCount: assignments.length,
      assignmentEmployeeIds: assignments.map((row) => row.employeeId),
      wts01: inclusion.find((row) => row.employeeId === 'wts-01') ?? {
        employeeId: 'wts-01',
        included: false,
        reason: 'employee_missing_from_tpl_employees_v1',
      },
    });

    if (mode === 'manual') {
      const manualTargetDateKey = builtTargetDate;

      if (audience === 'shift_tomorrow') {
        console.log(
          '[shift-reminder] audience=shift_tomorrow — keeping tomorrow assignments',
          {
            count: assignments.length,
            ids: assignments.map((row) => row.employeeId),
          },
        );
      } else if (audience === 'employee' && body.employeeId) {
        const employee = employees.find((entry) => entry.id === body.employeeId);
        const existing = assignments.find((a) => a.employeeId === body.employeeId);
        console.log('[shift-reminder] audience=employee', {
          employeeId: body.employeeId,
          foundInEmployees: Boolean(employee),
          foundInTomorrowAssignments: Boolean(existing),
          hasCustomCopy: Boolean(body.title && body.body),
        });
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
              targetDateKey: manualTargetDateKey,
              weekDayId: builtWeekDayId,
            },
          ];
        } else {
          console.warn(
            '[shift-reminder] employee audience produced zero assignments',
            {
              employeeId: body.employeeId,
              reason: !employee
                ? 'employee_not_found'
                : 'missing_title_or_body_and_not_on_tomorrow_shift',
            },
          );
          assignments = [];
        }
      } else if (audience === 'department' && body.departmentId) {
        const deptEmployees = getEmployeesForDepartmentTarget(
          employees,
          body.departmentId,
        ).filter((entry) => entry.status === 'active');

        const departmentLabel =
          getDepartmentTargetLabel(employees, body.departmentId) ?? body.departmentId;

        console.log('[shift-reminder] audience=department', {
          departmentId: body.departmentId,
          deptEmployeeIds: deptEmployees.map((entry) => entry.id),
          hasCustomCopy: Boolean(body.title && body.body),
        });

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
            targetDateKey: manualTargetDateKey,
            weekDayId: builtWeekDayId,
          }));
        } else {
          const deptEmployeeIds = new Set(deptEmployees.map((entry) => entry.id));
          assignments = assignments.filter((entry) =>
            deptEmployeeIds.has(entry.employeeId),
          );
        }
      } else if (audience === 'everyone') {
        console.log('[shift-reminder] audience=everyone', {
          hasCustomCopy: Boolean(body.title && body.body),
          activeEmployees: employees.filter((entry) => entry.status === 'active')
            .length,
        });
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
              targetDateKey: manualTargetDateKey,
              weekDayId: builtWeekDayId,
            }));
        } else {
          console.warn(
            '[shift-reminder] everyone without title/body — falling through to tomorrow shift assignments',
            { count: assignments.length },
          );
        }
      } else {
        console.warn('[shift-reminder] unrecognized manual audience', {
          audience,
          body,
        });
      }
    }

    console.log('[shift-reminder] final assignments before delivery', {
      audience,
      targetDate: builtTargetDate,
      count: assignments.length,
      ids: assignments.map((row) => row.employeeId),
      wts01Included: assignments.some((row) => row.employeeId === 'wts-01'),
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const assignment of assignments) {
      const custom =
        mode === 'manual' &&
        audience !== 'shift_tomorrow' &&
        body.title &&
        body.body
          ? {
              title: body.title,
              body: body.body.replace(/\{name\}/g, assignment.employeeNameEn),
            }
          : undefined;

      console.log('[shift-reminder] delivering assignment', {
        employeeId: assignment.employeeId,
        period: assignment.period,
        role: assignment.role,
        targetDateKey: assignment.targetDateKey,
        usingCustomCopy: Boolean(custom),
        title: (custom?.title ?? 'template:تذكير بشفت الغد').slice(0, 40),
      });

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
      console.log('[shift-reminder] assignment result', {
        employeeId: assignment.employeeId,
        ...result,
      });
    }

    return jsonResponse({
      ok: true,
      mode,
      audience,
      targetDate: builtTargetDate,
      shiftsUpdatedAt,
      reminderTime,
      cairoTime: cairoNow,
      timeZone: SHIFT_REMINDER_TIMEZONE,
      targeted: assignments.length,
      sent,
      failed,
      skipped,
      assignmentEmployeeIds: assignments.map((row) => row.employeeId),
      inclusion,
    });
  } catch (error) {
    console.error('[shift-reminder] fatal catch', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
