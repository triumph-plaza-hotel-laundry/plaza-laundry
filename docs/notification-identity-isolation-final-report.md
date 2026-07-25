# Notification Identity Isolation — Final Report

**Branch:** `refactor/notification-identity-isolation`  
**Base:** `080f5e0` (`origin/main`)  
**Date:** 2026-07-25

---

## 1. Files modified

| Path | Change |
|------|--------|
| `docs/notification-identity-isolation-dependency-analysis.md` | Pre-change dependency analysis |
| `docs/employee-linked-devices-investigation.md` | Prior investigation (unchanged context) |
| `docs/notification-identity-isolation-final-report.md` | This report |
| `supabase/migrations/20260725120000_notification_identity_isolation.sql` | Schema + pair/rotation RPC rewrite + backfill |
| `supabase/functions/shift-reminder/index.ts` | Employee-scoped heal; remove admin-pool resolve |
| `src/features/employee-devices/device-pairing-service.ts` | Refuse foreign active player; laundry-owned upsert |
| `src/lib/onesignal/subscriptions-repository.ts` | `ownership` / `registered_by_admin_id` API |
| `src/lib/onesignal/client.ts` | Separate admin vs laundry persist; gate primary device id |
| `src/lib/notification-platform/live-subscription-sync.ts` | Scoped legacy fallback |
| `src/lib/notification-platform/self-healing-engine.ts` | Primary id only if this browser is primary device |
| `src/lib/supabase/types.ts` | Types for ownership columns |
| `scripts/heal-stale-linked-subscriptions.mjs` | Employee-scoped heal only |
| `scripts/test-notification-identity-isolation.mjs` | Unit tests for isolation rules |
| `package.json` | `test` / `test:notification-identity` scripts |
| `src/features/hotel-employee-assets/display-labels.ts` | Lint fix (pre-existing unused param) |

---

## 2. Database migrations

**New:** `supabase/migrations/20260725120000_notification_identity_isolation.sql`

- Adds `onesignal_subscriptions.ownership` (`admin` | `laundry_employee`)
- Adds `registered_by_admin_id`
- Makes `employee_id` nullable (laundry rows no longer forced under admin FK)
- Backfills active linked phones → `ownership = laundry_employee`
- Stores permanent Primary Admin identity marker in `app_settings.primary_admin_identity`
- Replaces `pair_employee_device`: **refuses** if player ID is active for another laundry employee; laundry-owned subscription upsert
- Replaces `sync_onesignal_subscription_rotation`: **never** reassigns `laundry_employee_id` across employees; returns `{ blocked: true }` instead

**Not applied to production from this environment** — local `.env.local` lacks `SUPABASE_DB_PASSWORD`. Apply via:

```bash
# after adding SUPABASE_DB_PASSWORD to .env.local
node scripts/apply-supabase-migrations.mjs
# or paste the migration into Supabase SQL Editor
```

Then deploy edge:

```bash
# requires ONESIGNAL_REST_API_KEY + Supabase CLI auth
node scripts/deploy-edge-functions.mjs
```

---

## 3. Architecture changes

### Before (broken)

```
Pairing admin → onesignal_subscriptions.employee_id = admin
Heal → newest subscription for that admin → rewrite any employee link
Rotation on conflict → reassign laundry_employee_id → steal
```

### After (isolated)

```
Primary Admin (auth: primary-admin-kamel)
  └── primary_admin_device (singleton)
  └── onesignal_subscriptions ownership=admin

Laundry Employee A
  └── employee_linked_devices (active)
  └── onesignal_subscriptions ownership=laundry_employee, laundry_employee_id=A

Laundry Employee B / C — independent chains
```

| Concern | Rule |
|---------|------|
| Pairing | Only target employee; block if device active for someone else |
| Rotation | Same laundry employee only; fail closed on foreign new id |
| Heal | Candidates = same `laundry_employee_id` + `ownership=laundry_employee` |
| Resolve | Linked devices + laundry-owned subs; **no** admin pool merge |
| Primary Admin | Permanent id in code + `app_settings`; device heal gated to registered browser |

---

## 4. Build result

**PASS** — `npm run build` exit 0 (`tsc -b && vite build`, PWA generated).

---

## 5. Lint result

**PASS (scoped)** — eslint on all modified notification files + display-labels: exit 0.

Full-repo `npm run lint` previously reported only the display-labels unused-param error (fixed) plus unrelated a11y warnings in training editor dialogs.

---

## 6. Type check result

**PASS** — `tsc -b` exit 0.

---

## 7. Test result

**PASS** — `npm run test` / `test:notification-identity`:

- heal ignores admin-owned and other-employee subscriptions
- pairing refuses foreign active owner
- rotation blocks cross-employee reassignment

3/3 passed. No pre-existing automated integration suite for OneSignal in repo.

---

## 8. Real notification delivery result

**NOT RUN against production from this agent session.**

Blocked by missing local secrets:

- `SUPABASE_DB_PASSWORD` (migration apply)
- `ONESIGNAL_REST_API_KEY` (edge deploy)
- `SUPABASE_SERVICE_ROLE_KEY` (optional for privileged verify)

**Required after you add secrets:**

1. Apply migration `20260725120000_notification_identity_isolation.sql`
2. Deploy `shift-reminder` edge function
3. Re-pair or verify existing links still `active` (backfill sets ownership)
4. `node scripts/send-test-push-wts01.mjs` (and equivalent for Sayed / Salama / Shaaban laundry ids)
5. Confirm history `status=sent` + delivery attempt OneSignal id
6. Confirm phone receives push; open deep link; status updates

---

## 9. Real notification open result

**NOT VERIFIED** — requires physical devices after deploy (step 8).

---

## 10. Remaining risks

1. **Deploy order:** Migration and edge function must ship together; old edge + new RPC is OK, new edge + old schema falls back to laundry_employee_id-only queries.
2. **Same physical phone:** Pairing a second employee on an already-linked phone now **errors** until first is unpaired (intentional).
3. **Stale admin-pool rows:** Old rows may still have `employee_id=admin` until backfill; heal no longer uses them for employee delivery.
4. **Ops scripts:** Diagnose scripts may still mention admin pools; heal script was rewritten.
5. **No merge yet:** Branch is local; do not merge until production E2E above passes.
6. **Full-repo lint warnings:** Training editor a11y warnings remain (pre-existing, unrelated).

---

## Branch / merge policy

- Created from latest `origin/main` (`080f5e0`).
- All work on `refactor/notification-identity-isolation`.
- **Do not merge** until migration applied, edge deployed, and multi-employee live push/open verification succeeds.
