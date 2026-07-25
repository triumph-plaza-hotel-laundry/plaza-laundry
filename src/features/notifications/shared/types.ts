/** Shared contracts for the notifications feature modules. */

export type NotificationDeviceStatus = 'active' | 'unlinked';

export type NotificationDevice = {
  id: string;
  employeeId: string;
  playerId: string;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  operatingSystem: string | null;
  browser: string | null;
  appVersion: string | null;
  linkedAt: string;
  updatedAt: string;
  status: NotificationDeviceStatus;
};

export type LinkTicket = {
  token: string;
  employeeId: string;
  expiresAt: string;
};

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type HealthComponentId =
  | 'notification_service'
  | 'onesignal'
  | 'database'
  | 'edge_functions'
  | 'scheduled_jobs'
  | 'device_links'
  | 'player_ids'
  | 'service_worker'
  | 'sync_status'
  | 'qr_service';

export type HealthComponentReport = {
  component: HealthComponentId;
  status: HealthStatus;
  message: string;
  detail?: Record<string, unknown>;
  checkedAt: string;
};

export type AuditResult = 'ok' | 'error' | 'denied';

export type AuditEntry = {
  id: string;
  action: string;
  actorAdminId: string | null;
  targetEmployeeId: string | null;
  detail: Record<string, unknown>;
  result: AuditResult;
  createdAt: string;
};

export type DiagnosticsHistoryEntry = {
  id: string;
  component: string;
  severity: 'healthy' | 'warning' | 'critical' | 'info';
  issueCode: string;
  message: string;
  targetEmployeeId: string | null;
  actionTaken: string | null;
  verificationResult: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export const LINK_QR_PAYLOAD_TYPE = 'tpl-notification-link-v1' as const;

export type LinkQrPayload = {
  v: 1;
  type: typeof LINK_QR_PAYLOAD_TYPE;
  token: string;
};
