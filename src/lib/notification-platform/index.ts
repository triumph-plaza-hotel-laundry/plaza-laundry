export { notificationPlatformConfig } from '@/lib/notification-platform/config';
export {
  getRecentPlatformEvents,
  platformLog,
} from '@/lib/notification-platform/logger';
export { collectHealthReport } from '@/lib/notification-platform/health-monitor';
export {
  onSubscriptionIdChanged,
  subscribePlatformSync,
  emitPlatformSyncEvent,
} from '@/lib/notification-platform/live-subscription-sync';
export {
  startNotificationPlatform,
  runRecoveryPass,
  getEngineSnapshot,
} from '@/lib/notification-platform/self-healing-engine';
export type {
  ComponentHealth,
  HealthReport,
  HealthStatus,
  PlatformComponentId,
  PlatformEventCategory,
  PlatformEventRecord,
  PlatformEventSeverity,
  RecoveryTrigger,
  SubscriptionChangePayload,
} from '@/lib/notification-platform/types';
