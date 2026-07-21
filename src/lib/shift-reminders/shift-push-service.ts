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
    return { ok: false, error: 'Supabase is not configured' };
  }

  const { data, error } = await client.functions.invoke('shift-reminder', {
    body: {
      mode: 'manual',
      audience: input.audience,
      departmentId: input.departmentId,
      employeeId: input.employeeId,
      title: input.title,
      body: input.body,
      triggeredBy: input.ownerId,
    },
    headers: {
      'x-owner-id': input.ownerId,
    },
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
