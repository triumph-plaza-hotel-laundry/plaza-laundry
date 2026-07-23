/** Health status for each notification-platform component. */
export type HealthStatus = 'healthy' | 'warning' | 'recovering' | 'broken';

export type RecoveryTrigger =
  | 'app_start'
  | 'resume'
  | 'online'
  | 'onesignal_init'
  | 'permission_change'
  | 'subscription_change'
  | 'service_worker_change'
  | 'database_reconnect'
  | 'version_update'
  | 'manual'
  | 'session_change';

export type PlatformEventCategory =
  | 'recovery'
  | 'subscription'
  | 'delivery'
  | 'service_worker'
  | 'cache'
  | 'database'
  | 'permission'
  | 'pairing'
  | 'health';

export type PlatformEventSeverity = 'info' | 'warning' | 'error';

export type PlatformComponentId =
  | 'database'
  | 'onesignal'
  | 'subscriptions'
  | 'workers'
  | 'notifications'
  | 'queue'
  | 'recovery_engine'
  | 'cache'
  | 'background_sync'
  | 'linked_devices';

export type ComponentHealth = {
  id: PlatformComponentId;
  status: HealthStatus;
  message: string;
  lastRepair: string | null;
  lastSync: string | null;
};

export type HealthReport = {
  collectedAt: string;
  overall: HealthStatus;
  components: ComponentHealth[];
  recentEvents: PlatformEventRecord[];
  engineRunning: boolean;
  platformEnabled: boolean;
};

export type PlatformEventRecord = {
  id?: string;
  category: PlatformEventCategory;
  severity: PlatformEventSeverity;
  message: string;
  laundryEmployeeId?: string | null;
  onesignalPlayerId?: string | null;
  deviceLabel?: string | null;
  payload?: Record<string, unknown> | null;
  recoveryAction?: string | null;
  retryCount?: number | null;
  finalStatus?: string | null;
  createdAt?: string;
};

export type SubscriptionChangePayload = {
  previousId: string | null;
  nextId: string;
  deviceLabel: string;
  laundryEmployeeId?: string | null;
  adminEmployeeId?: string | null;
  primaryAdminDeviceId?: string | null;
};
