/**
 * onesignal_subscriptions table was removed.
 * Player IDs live only on employee_notification_devices via claim RPC.
 */

export async function upsertOneSignalSubscription(_input: unknown): Promise<void> {
  // no-op — identity is claim_notification_device only
}

export async function removeOneSignalSubscriptionsForEmployee(
  _employeeId: string,
): Promise<void> {
  // no-op
}

export async function removeOneSignalSubscriptionByPlayerId(
  _playerId: string,
): Promise<void> {
  // no-op
}
