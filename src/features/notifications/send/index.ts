import { requireSupabase } from '@/features/notifications/shared/supabase';
import { getActiveDeviceByEmployeeId } from '@/features/notifications/devices';
import { logNotificationAction } from '@/features/notifications/audit';

export async function resolvePlayerIdForEmployee(
  employeeId: string,
): Promise<string | null> {
  const device = await getActiveDeviceByEmployeeId(employeeId);
  return device?.playerId ?? null;
}

export async function sendTestNotification(input: {
  employeeId: string;
  adminId?: string | null;
  title?: string;
  body?: string;
}) {
  const playerId = await resolvePlayerIdForEmployee(input.employeeId);
  if (!playerId) {
    await logNotificationAction({
      action: 'test_send',
      actorAdminId: input.adminId,
      targetEmployeeId: input.employeeId,
      result: 'error',
      detail: { reason: 'Employee is not linked.' },
    });
    throw new Error('Employee is not linked.');
  }

  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('shift-reminder', {
    body: {
      mode: 'manual',
      audience: 'employee',
      employeeId: input.employeeId,
      title: input.title ?? 'Test notification',
      body: input.body ?? 'Notification system test from Admin',
      triggeredBy: input.adminId ?? 'admin',
    },
  });

  if (error) {
    await logNotificationAction({
      action: 'test_send',
      actorAdminId: input.adminId,
      targetEmployeeId: input.employeeId,
      result: 'error',
      detail: { message: error.message },
    });
    throw new Error(error.message);
  }

  await logNotificationAction({
    action: 'test_send',
    actorAdminId: input.adminId,
    targetEmployeeId: input.employeeId,
    detail: { playerId, response: data },
  });

  return data;
}
