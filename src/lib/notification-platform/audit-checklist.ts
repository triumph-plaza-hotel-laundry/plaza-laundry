/**
 * Static regression / isolation audit checklist for Notification Platform V2.
 * Run mentally or manually after deploy. Does not modify app behavior.
 *
 * ISOLATION (git diff --stat must only touch notification ecosystem):
 * [x] src/lib/notification-platform/** (new)
 * [x] src/lib/onesignal/client.ts (sync + safe unregister)
 * [x] employee-devices pairing service (RPC + legacy fallback)
 * [x] primary-admin-device heal helper
 * [x] shift-reminder + notification-delivery shared
 * [x] migration notification_platform_v2
 * [x] owner diagnostics page/route/i18n
 * [x] thin hooks: main.tsx, AuthProvider, useThisDeviceLinkStatus, route-preload
 * [x] No Orders / Inventory / Shifts UI / Gallery / Videos / Birthday bell changes
 *
 * RECOVERY SCENARIOS (manual / device):
 * [ ] Fresh install → bootstrap + engine start
 * [ ] PWA reinstall → autoResubscribe + recovery pass
 * [ ] Browser restart → app_start recovery
 * [ ] Permission revoke → Broken in diagnostics
 * [ ] Permission grant → soft recover subscription
 * [ ] Subscription rotation → linked devices + local cache rewrite
 * [ ] Offline → deferred; online → recovery pass
 * [ ] QR relink / replace device
 * [ ] Admin logout on paired phone → subscription rows preserved
 * [ ] Cron / manual push → smart delivery + attempts log
 *
 * REGRESSION SMOKE:
 * [ ] Login / logout
 * [ ] Admin dashboard modules (except new owner diagnostics tile)
 * [ ] Employee dashboard
 * [ ] Orders / tracking / pricing / inventory / shifts / reports
 * [ ] Gallery / videos / PWA install / offline
 * [ ] Birthday NotificationBell unchanged
 *
 * KILL SWITCH: VITE_NOTIFICATION_PLATFORM_V2=false disables client engine/sync.
 * RPC FALLBACK: pair + rotation fall back to legacy if migration not applied.
 */
export const NOTIFICATION_PLATFORM_V2_AUDIT = {
  version: 2,
  isolationVerifiedInDiff: true,
} as const;
