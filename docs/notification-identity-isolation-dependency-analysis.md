# Notification Identity Isolation — Dependency Analysis

**Branch:** `refactor/notification-identity-isolation`  
**Base commit:** `080f5e0` (matches `origin/main`)  
**Date:** 2026-07-25  
**Status:** Pre-implementation analysis (approved for implementation on this branch)

---

## Goals

1. Primary Admin identity is permanent and never confused with laundry-employee identity.
2. Each laundry employee owns an independent notification chain: Device → Player ID → Subscription → Linked Device.
3. No shared admin subscription pool for employee phones.
4. Pairing / rotation / heal never steal or rewrite another employee’s link.
5. Safe migrations; preserve history and existing links.

---

## Current failure mode (summary)

Pairing upserts `onesignal_subscriptions` with `employee_id = pairing admin`.  
Shift-reminder heal then picks the **newest** subscription for that admin and rewrites any linked employee to it. On unique conflict, rotation reassigns `laundry_employee_id`. Cross-employee unlink follows.

---

## Target architecture

```
Primary Admin (auth: primary-admin-kamel)
  └── primary_admin_device.onesignal_subscription_id   (admin-only)

Laundry Employee A
  └── employee_linked_devices (active, laundry_employee_id=A)
  └── onesignal_subscriptions (ownership=laundry_employee, laundry_employee_id=A)

Laundry Employee B
  └── … independent …
```

Heal/rotate/resolve for employee delivery **only** query by `laundry_employee_id` + `ownership = 'laundry_employee'`.

---

## Affected files

### Must change

| File | Modification |
|------|----------------|
| New migration `…notification_identity_isolation.sql` | Add `ownership`, `registered_by_admin_id`; nullable `employee_id`; backfill; replace pair + rotation RPCs |
| `supabase/functions/shift-reminder/index.ts` | Rewrite heal + narrow resolveSubscriptions |
| `src/features/employee-devices/device-pairing-service.ts` | Legacy pair uses laundry ownership; never replace other employees |
| `src/lib/onesignal/subscriptions-repository.ts` | Support ownership + registered_by_admin_id |
| `src/lib/onesignal/client.ts` | Gate primaryAdminDeviceId; admin vs laundry write paths |
| `src/lib/notification-platform/live-subscription-sync.ts` | Pass laundry ownership; fail-closed semantics |
| `src/lib/notification-platform/self-healing-engine.ts` | Do not pass primary id for employee phones |
| `src/lib/supabase/types.ts` | Types for new columns / RPC |
| `scripts/heal-stale-linked-subscriptions.mjs` | Same-employee-only heal (or no-op warning) |
| `docs/notification-identity-isolation-dependency-analysis.md` | This file |

### Likely minor / verify

| File | Note |
|------|------|
| `src/context/AuthProvider.tsx` | Keep primary-admin register separate from laundry |
| `src/features/primary-admin-device/*` | Keep isolated; confirm rotation payloads |
| `src/features/employee-devices/onesignal-pairing.ts` | Anonymous prepare unchanged |
| `src/features/admin/pages/AdminEmployeeDevicesPage.tsx` | Surface clearer pair-conflict errors |
| Ops diagnose/trace scripts | Prefer laundry ownership in queries |

### No change

Auth owner protection (`PRIMARY_ADMIN_ID`), cron schedule DDL, OneSignal SDK workers, shift assignment builders, inventory permissions.

---

## Modification plan (ordered)

1. **Migration (additive):** `ownership`, `registered_by_admin_id`; drop NOT NULL on `employee_id`; backfill from `employee_linked_devices`.
2. **Replace `pair_employee_device`:** refuse if player ID active for *another* laundry employee; upsert sub as `ownership=laundry_employee`.
3. **Replace `sync_onesignal_subscription_rotation`:** never reassign `laundry_employee_id` across employees; fail closed on foreign ownership of `p_new_id`.
4. **Edge heal:** candidates = same `laundry_employee_id` + `ownership=laundry_employee` only.
5. **Edge resolve:** linked devices (+ employee-owned subs) as source of truth; remove admin-pool merge for employee delivery.
6. **Client:** align upserts and recovery payloads.
7. **Tests:** node unit tests for isolation helpers + verify scripts.
8. **Deploy + real push E2E.**

---

## Risks

| Risk | Mitigation |
|------|------------|
| Partial deploy (new RPC, old edge) | Deploy edge in same release as migration |
| Old heal script re-run | Rewrite script first |
| FK: laundry rows need nullable `employee_id` | Migration makes nullable; keep FK when set |
| Same physical phone pairing second employee | Now **blocked** until first unlinked (product change, per requirements) |

---

## Primary Admin identity

- Canonical ID remains `PRIMARY_ADMIN_ID = 'primary-admin-kamel'` (`src/features/auth/owner-protection.ts`).
- Device singleton: `primary_admin_device`.
- If that person is also a laundry employee, their laundry link uses `laundry_employee_id` and `ownership=laundry_employee` — never the admin subscription pool.
