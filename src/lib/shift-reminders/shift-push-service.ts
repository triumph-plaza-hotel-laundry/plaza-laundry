import { getSupabaseClient } from '@/lib/supabase/client';
import { supabaseConfig } from '@/lib/supabase/config';

export type ManualPushAudience =
  | 'everyone'
  | 'department'
  | 'employee'
  | 'shift_tomorrow';

export type SendManualPushInput = {
  ownerId: string;
  audience: ManualPushAudience;
  departmentId?: string;
  employeeId?: string;
  title?: string;
  body?: string;
};

export type ShiftPushResult = {
  ok: boolean;
  targeted?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
  shiftsUpdatedAt?: string | null;
  error?: string;
  targetDate?: string;
  assignmentEmployeeIds?: string[];
  inclusion?: Array<{
    employeeId: string;
    included: boolean;
    reason: string;
  }>;
};

function getFunctionsBaseUrl(): string | null {
  if (!supabaseConfig.url) {
    return null;
  }
  return `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1`;
}

export async function sendManualShiftPush(
  input: SendManualPushInput,
): Promise<ShiftPushResult> {
  const client = getSupabaseClient();
  const baseUrl = getFunctionsBaseUrl();

  if (!client || !baseUrl) {
    console.error('[shift-push] abort — Supabase is not configured');
    return { ok: false, error: 'Supabase is not configured' };
  }

  // Shift-tomorrow always uses the server Arabic template — never leftover
  // title/body from a previous direct/employee send (fields are hidden in UI).
  const useCustomCopy =
    input.audience === 'everyone' ||
    input.audience === 'department' ||
    input.audience === 'employee';

  const payload = {
    mode: 'manual' as const,
    audience: input.audience,
    departmentId: input.departmentId,
    employeeId: input.employeeId,
    title: useCustomCopy ? input.title : undefined,
    body: useCustomCopy ? input.body : undefined,
    triggeredBy: input.ownerId,
  };

  console.info('[shift-push] calling shift-reminder Edge Function', {
    function: 'shift-reminder',
    baseUrl,
    payload,
  });

  const { data, error } = await client.functions.invoke('shift-reminder', {
    body: payload,
    headers: {
      'x-owner-id': input.ownerId,
    },
  });

  console.info('[shift-push] shift-reminder response', {
    error: error?.message ?? null,
    data,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return data as ShiftPushResult;
}

export async function triggerShiftReminderDryRun(
  ownerId: string,
): Promise<ShiftPushResult> {
  return sendManualShiftPush({
    ownerId,
    audience: 'shift_tomorrow',
  });
}
