import {
  asJson,
  requireSupabase,
} from '@/features/notifications/shared/supabase';
import type { AuditResult } from '@/features/notifications/shared/types';

const TABLE = 'notification_audit_log';

export async function logNotificationAction(input: {
  action: string;
  actorAdminId?: string | null;
  targetEmployeeId?: string | null;
  detail?: Record<string, unknown>;
  result?: AuditResult;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).insert({
    action: input.action,
    actor_admin_id: input.actorAdminId ?? null,
    target_employee_id: input.targetEmployeeId ?? null,
    detail: asJson(input.detail ?? {}),
    result: input.result ?? 'ok',
  });
  if (error) {
    console.error('[notifications/audit] log failed', error.message);
  }
}

export async function listAuditLog(options?: {
  limit?: number;
  employeeId?: string;
  action?: string;
}) {
  const client = requireSupabase();
  let query = client
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.employeeId) {
    query = query.eq('target_employee_id', options.employeeId);
  }
  if (options?.action) {
    query = query.eq('action', options.action);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    action: row.action as string,
    actorAdminId: (row.actor_admin_id as string | null) ?? null,
    targetEmployeeId: (row.target_employee_id as string | null) ?? null,
    detail: (row.detail as Record<string, unknown>) ?? {},
    result: row.result as AuditResult,
    createdAt: row.created_at as string,
  }));
}

export async function recordDiagnosticsHistory(input: {
  component: string;
  severity: 'healthy' | 'warning' | 'critical' | 'info';
  issueCode: string;
  message: string;
  targetEmployeeId?: string | null;
  actionTaken?: string | null;
  verificationResult?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('notification_diagnostics_history').insert({
    component: input.component,
    severity: input.severity,
    issue_code: input.issueCode,
    message: input.message,
    target_employee_id: input.targetEmployeeId ?? null,
    action_taken: input.actionTaken ?? null,
    verification_result: input.verificationResult ?? null,
    detail: asJson(input.detail ?? {}),
  });
  if (error) {
    console.error('[notifications/audit] diagnostics history failed', error.message);
  }
}

export async function listDiagnosticsHistory(options?: {
  limit?: number;
  employeeId?: string;
  component?: string;
}) {
  const client = requireSupabase();
  let query = client
    .from('notification_diagnostics_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.employeeId) {
    query = query.eq('target_employee_id', options.employeeId);
  }
  if (options?.component) {
    query = query.eq('component', options.component);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    component: row.component as string,
    severity: row.severity as 'healthy' | 'warning' | 'critical' | 'info',
    issueCode: row.issue_code as string,
    message: row.message as string,
    targetEmployeeId: (row.target_employee_id as string | null) ?? null,
    actionTaken: (row.action_taken as string | null) ?? null,
    verificationResult: (row.verification_result as string | null) ?? null,
    detail: (row.detail as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}

export async function deleteAuditLogEntry(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}

/** Deletes every row in notification_audit_log only — never other tables. */
export async function clearAuditLog(): Promise<number> {
  const client = requireSupabase();
  // Match all rows without touching other notification tables.
  const { data, error } = await client
    .from(TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');
  if (error) {
    throw new Error(error.message);
  }
  return data?.length ?? 0;
}

export function exportEntriesAsJson(entries: unknown[], filename: string) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
