import { requireSupabase } from '@/features/notifications/shared/supabase';
import {
  getActiveDeviceByEmployeeId,
  unlinkDevice,
} from '@/features/notifications/devices';
import {
  logNotificationAction,
  recordDiagnosticsHistory,
} from '@/features/notifications/audit';
import type { NotificationDevice } from '@/features/notifications/shared/types';

export type DiagnosticIssue = {
  code: string;
  severity: 'healthy' | 'warning' | 'critical';
  status: string;
  cause: string;
  recommendedFix: string;
};

export type EmployeeDiagnosticProfile = {
  employeeId: string;
  linked: boolean;
  device: NotificationDevice | null;
  lastDelivery: {
    status: string;
    createdAt: string;
    type: string;
  } | null;
  issues: DiagnosticIssue[];
};

export async function getEmployeeDiagnosticProfile(
  employeeId: string,
): Promise<EmployeeDiagnosticProfile> {
  const device = await getActiveDeviceByEmployeeId(employeeId);
  const client = requireSupabase();
  const { data: history } = await client
    .from('push_notification_history')
    .select('status, created_at, type')
    .eq('laundry_employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const issues: DiagnosticIssue[] = [];
  if (!device) {
    issues.push({
      code: 'not_linked',
      severity: 'critical',
      status: 'Not Linked',
      cause: 'No active row in employee_notification_devices',
      recommendedFix: 'Generate QR and have the employee scan to claim',
    });
  } else if (!device.playerId.trim()) {
    issues.push({
      code: 'missing_player_id',
      severity: 'critical',
      status: 'Invalid Player ID',
      cause: 'Active device row has empty player_id',
      recommendedFix: 'Unlink then Relink with a fresh QR claim',
    });
  }

  if (history?.status === 'failed') {
    issues.push({
      code: 'last_delivery_failed',
      severity: 'warning',
      status: 'Last Delivery Failed',
      cause: 'Most recent push_notification_history row is failed',
      recommendedFix: 'Send Test Notification and verify OneSignal subscription',
    });
  }

  if (issues.length === 0 && device) {
    issues.push({
      code: 'healthy',
      severity: 'healthy',
      status: 'Healthy',
      cause: 'Active device link present',
      recommendedFix: 'None',
    });
  }

  return {
    employeeId,
    linked: Boolean(device),
    device,
    lastDelivery: history
      ? {
          status: history.status as string,
          createdAt: history.created_at as string,
          type: history.type as string,
        }
      : null,
    issues,
  };
}

export type DiagnosticAction =
  | 'refresh_status'
  | 'unlink'
  | 'export_report';

export async function runDiagnosticAction(input: {
  action: DiagnosticAction;
  employeeId: string;
  adminId?: string | null;
}): Promise<{ ok: boolean; message: string; profile?: EmployeeDiagnosticProfile }> {
  const { action, employeeId, adminId } = input;

  if (action === 'unlink') {
    const unlinked = await unlinkDevice(employeeId, adminId);
    const profile = await getEmployeeDiagnosticProfile(employeeId);
    const verified = !profile.linked;
    await recordDiagnosticsHistory({
      component: 'device_links',
      severity: 'info',
      issueCode: 'admin_unlink',
      message: unlinked ? 'Device unlinked' : 'No active device to unlink',
      targetEmployeeId: employeeId,
      actionTaken: 'unlink_notification_device',
      verificationResult: verified ? 'verified' : 'failed',
    });
    await logNotificationAction({
      action: 'diagnostic_unlink',
      actorAdminId: adminId,
      targetEmployeeId: employeeId,
      result: verified ? 'ok' : 'error',
    });
    return {
      ok: verified,
      message: verified
        ? 'Unlinked and verified'
        : 'Unlink did not clear active device',
      profile,
    };
  }

  if (action === 'refresh_status') {
    const profile = await getEmployeeDiagnosticProfile(employeeId);
    await logNotificationAction({
      action: 'diagnostic_refresh',
      actorAdminId: adminId,
      targetEmployeeId: employeeId,
    });
    return { ok: true, message: 'Status refreshed', profile };
  }

  const profile = await getEmployeeDiagnosticProfile(employeeId);
  return { ok: true, message: 'Report ready', profile };
}
