import { getSupabaseClient } from '@/lib/supabase/client';
import { OWNER_USER_ID } from '@/features/auth/owner-protection';
import type { AuthUser, UserRole } from '@/features/auth/types';

export type AuditLogEntry = {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  page: string;
  timestamp: string;
  oldValue: string;
  newValue: string;
};

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

function serializeAuditValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function appendAuditLog(input: {
  user: AuthUser;
  action: string;
  page: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<AuditLogEntry> {
  const client = requireSupabase();
  const row = {
    user_id: input.user.id,
    user_name: input.user.displayName || input.user.username,
    role: input.user.role,
    action: input.action,
    page: input.page,
    old_value: serializeAuditValue(input.oldValue),
    new_value: serializeAuditValue(input.newValue),
  };

  const { data, error } = await client
    .from('audit_log_entries')
    .insert(row)
    .select('*')
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to write audit log');
  }

  return {
    id: data.id,
    userId: data.user_id,
    userName: data.user_name,
    role: data.role as UserRole,
    action: data.action,
    page: data.page,
    timestamp: data.created_at,
    oldValue: data.old_value,
    newValue: data.new_value,
  };
}

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('audit_log_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role as UserRole,
    action: row.action,
    page: row.page,
    timestamp: row.created_at,
    oldValue: row.old_value,
    newValue: row.new_value,
  }));
}

export async function clearAuditLogs(actor: AuthUser): Promise<void> {
  if (actor.id !== OWNER_USER_ID && !actor.isOwner) {
    throw new Error('Permission denied');
  }

  const client = requireSupabase();
  const { error } = await client
    .from('audit_log_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    throw error;
  }
}
