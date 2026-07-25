# Employee Linked Devices — Root Cause Investigation

**Project:** plaza-laundry  
**Date:** 2026-07-25  
**Scope:** Investigation only — no code changes  
**Status:** Complete

---

## Problem Statement

- Multiple employee devices were linked successfully.
- Linked employees included:
  - Mohamed Sayed
  - Ahmed Shaaban (main admin)
  - Mohamed Salama
- Later, only Ahmed Shaaban and Mohamed Salama remained linked.
- Mohamed Sayed disappeared.
- The current device also became unlinked automatically.
- No one intentionally unlinked these devices.

---

## Investigation Questions (Answered)

| # | Question | Short answer |
|---|----------|--------------|
| 1 | Automatic removal of linked devices? | **Yes** — soft-replace via heal, rotation, pair, guardian (no hard DELETE of link rows in app code). |
| 2 | Keep only one device / one employee? | **One device per employee** at pair/guardian; **one player ID globally** via unique constraint. Not “one employee system-wide.” |
| 3 | Linking a new employee overwrite previous? | **Yes if same OneSignal player ID** (same phone). Different phones: no — unless heal/rotation collides. |
| 4 | Wrong UPSERT conflict key? | Conflict key is `onesignal_player_id` (matches schema). Dangerous because ON CONFLICT **rewrites ownership**. |
| 5 | UPDATE/DELETE affecting multiple employees? | Heal candidate pool + rotation reassignment can affect employees other than the one being processed. |
| 6 | OneSignal refresh cause unlinking? | **Indirectly yes** — drives `sync_onesignal_subscription_rotation`. |
| 7 | Recovery Engine unlink? | **Can** — calls rotation with local laundry employee id. |
| 8 | Service worker re-registration? | Creates new subscription IDs → rotation; does not write Supabase itself. |
| 9 | Logout clear device links? | **No** when device still has an active linked row (preserve path). |
| 10 | Admin special handling? | Pairing stores subs under admin `employee_id`; admin becomes heal hub. |
| 11–15 | SQL / Edge / triggers / cron / RLS | See Findings below. |
| 16–19 | Why each person / current device | See Root Cause explanations. |

---

## Findings

For every suspicious piece of code: file, line numbers, snippet, explanation, severity.

### F1 — Unique constraint: one OneSignal ID → one linked row

- **File:** `supabase/migrations/20260722150000_employee_device_pairing.sql`
- **Lines:** 67–84
- **Snippet:**

```sql
CONSTRAINT employee_linked_devices_player_unique UNIQUE (onesignal_player_id)
```

- **Explanation:** Two laundry employees cannot both hold an active link to the same `onesignal_player_id`. Any path that moves employee A onto B’s player ID must replace or reassign B.
- **Severity:** Critical (architectural)

---

### F2 — Pairing always replaces whatever currently owns this player ID

- **File:** `supabase/migrations/20260723180000_fix_pair_employee_device_ambiguous_conflict.sql`
- **Lines:** 90–142
- **Snippet:**

```sql
UPDATE employee_linked_devices AS d
SET status = 'replaced', replaced_at = v_now, updated_at = v_now
WHERE d.onesignal_player_id = v_session.onesignal_player_id
  AND d.status = 'active';

INSERT INTO employee_linked_devices ...
ON CONFLICT ON CONSTRAINT employee_linked_devices_player_unique DO UPDATE
SET laundry_employee_id = EXCLUDED.laundry_employee_id,
    status = 'active',
    ...
```

- **Explanation:** Linking employee B on a phone already linked to employee A **always** marks A as `replaced` and assigns the player ID to B. Conflict key is **`onesignal_player_id`**, not employee id.
- **Severity:** High (by design for same-device re-pair; accidental if same phone reused)

---

### F3 — “Replace existing” only affects that employee’s other devices

- **File:** `supabase/migrations/20260723180000_fix_pair_employee_device_ambiguous_conflict.sql` (lines 65–88); legacy `src/features/employee-devices/device-pairing-service.ts` (402–434, 579–583)
- **Snippet:**

```sql
IF v_active_count > 0 AND NOT COALESCE(p_replace_existing, false) THEN
  RAISE EXCEPTION 'This employee already has a linked device...';
END IF;
```

- **Explanation:** One active device per employee is enforced at pair time. `replaceExisting` only retires **that** employee’s other actives — it does not wipe other employees unless F2 (same player ID) applies.
- **Severity:** Medium

---

### F4 — UPSERT conflict key is player ID (schema-correct, ownership-dangerous)

- **Files:**
  - RPC: `supabase/migrations/20260723180000_fix_pair_employee_device_ambiguous_conflict.sql` line 129
  - Legacy: `src/features/employee-devices/device-pairing-service.ts` line 625
- **Snippet:**

```ts
{ onConflict: 'onesignal_player_id' }
```

- **Explanation:** Conflict key matches the unique constraint. ON CONFLICT **rewrites `laundry_employee_id`**, so “upsert success” can mean “stole this subscription from another employee.”
- **Severity:** High

---

### F5 — Pairing stores employee phone subscriptions under the admin’s `employee_id`

- **File:** `supabase/migrations/20260723180000_fix_pair_employee_device_ambiguous_conflict.sql`
- **Lines:** 169–193
- **Snippet:**

```sql
INSERT INTO onesignal_subscriptions AS sub (
  employee_id,              -- p_paired_by_admin_id
  onesignal_player_id,      -- employee phone subscription
  laundry_employee_id,      -- laundry employee
  ...
)
VALUES (
  p_paired_by_admin_id,
  v_session.onesignal_player_id,
  ...
)
```

- **Explanation:** Every QR-paired phone is indexed as a subscription belonging to the **pairing admin**, alongside the admin’s own browser subscription(s). Later heal logic treats that whole pool as interchangeable candidates for “freshest subscription.”
- **Severity:** Critical (root enabler of cross-employee heal)

---

### F6 — Shift-reminder heal can rewrite any linked employee to the admin’s newest subscription

- **File:** `supabase/functions/shift-reminder/index.ts`
- **Lines:** 269–399 (especially 295–377); called at 519–527
- **Snippet:**

```ts
const { data: adminSubs } = await supabase
  .from('onesignal_subscriptions')
  .select(...)
  .eq('employee_id', adminId)   // ALL subs stored under pairing admin
  .order('updated_at', { ascending: false });

const newestId = newest.onesignal_player_id.trim();
// if newestId !== linkedId:
await supabase.from('employee_linked_devices').update({
  onesignal_player_id: newestId, ...
})
.eq('laundry_employee_id', device.laundry_employee_id)
.eq('status', 'active')
.eq('onesignal_player_id', linkedId);

// on unique violation → sync_onesignal_subscription_rotation(...)
```

- **Explanation:** For each active linked device, heal loads **all** valid `onesignal_subscriptions` for `paired_by_admin_id` (optionally same `device_label`, commonly `mobile-web` / `web`). It then forces that laundry employee’s link onto the **globally newest** admin-pool ID — not “this employee’s subscription,” but “newest ID among everyone this admin ever paired / registered.”
- **Severity:** Critical (automatic; no human unpair)

---

### F7 — Rotation RPC can mark one employee `replaced` and reassign another’s player ID

- **File:** `supabase/migrations/20260723190000_fix_subscription_rotation_infer_old_id.sql`
- **Lines:** 62–85 (also “no old id” rewrite at 204–216)
- **Snippet:**

```sql
UPDATE employee_linked_devices
SET status = 'replaced', replaced_at = v_now, ...
WHERE onesignal_player_id = v_inferred_old AND status = 'active';

UPDATE employee_linked_devices
SET status = 'active',
    laundry_employee_id = COALESCE(v_laundry_id, laundry_employee_id),
    ...
WHERE onesignal_player_id = p_new_id;
```

- **Explanation:** When heal’s direct UPDATE hits the unique constraint (target ID already linked to someone else), this RPC:

  1. Marks the **source** employee’s old ID `replaced` (they “disappear” in UI).
  2. Updates the **existing** row for `p_new_id`, optionally rewriting `laundry_employee_id` to the employee being healed.

  Net: one employee loses their active badge; ownership of the shared ID can flip.

- **Severity:** Critical

---

### F8 — Recovery Engine calls rotation (can unlink / reassign)

- **File:** `src/lib/notification-platform/self-healing-engine.ts`
- **Lines:** 268–285
- **Snippet:**

```ts
await onSubscriptionIdChanged({
  previousId: previousFromLocal,
  nextId: subscriptionId,
  deviceLabel: detectDeviceLabel(),
  laundryEmployeeId: local?.laundryEmployeeId ?? null,
  adminEmployeeId: null,
  primaryAdminDeviceId,
});
```

- **Explanation:** Recovery on subscription change / online / visibility runs `sync_onesignal_subscription_rotation` via `live-subscription-sync.ts` (lines 97–104). Stale local `laundryEmployeeId` or wrong previous ID can rewrite the wrong employee’s linked row.
- **Severity:** High

---

### F9 — OneSignal subscription change listener also rotates

- **File:** `src/lib/onesignal/client.ts`
- **Lines:** 130–164
- **Snippet:**

```ts
void onSubscriptionIdChanged({
  previousId,
  nextId,
  deviceLabel: detectDeviceLabel(),
  laundryEmployeeId,  // from activeLaundryEmployeeId or local cache
  adminEmployeeId: employeeId,
  primaryAdminDeviceId,
});
```

- **Explanation:** Service-worker / OneSignal subscription refresh does **not** directly delete links, but it **does** drive DB rotation. Re-registration that creates a new subscription ID mutates `employee_linked_devices`.
- **Severity:** High

---

### F10 — Guardian cleanup keeps one active device per employee

- **File:** `supabase/migrations/20260723160000_notification_platform_v2.sql`
- **Lines:** 571–595
- **Invoked from:** `supabase/functions/shift-reminder/index.ts` ~827–833
- **Snippet:**

```sql
-- For each laundry employee with multiple active devices, keep newest.
HAVING count(*) > 1
...
UPDATE ... SET status = 'replaced' ... AND id <> v_keep_id;
```

- **Explanation:** Only hurts employees with **duplicate active** rows. Would not alone remove Mohamed Sayed’s only active link.
- **Severity:** Medium (secondary)

---

### F11 — Logout does not clear linked devices when still active for this player

- **File:** `src/lib/onesignal/client.ts`
- **Lines:** 503–549
- **Snippet:**

```ts
const linked = await getActiveLinkedDeviceByPlayerId(playerId);
preserveLinked = Boolean(linked);
if (preserveLinked) {
  // Unregister skipped DB delete — active linked device preserved
} else if (targetEmployeeId) {
  await removeOneSignalSubscriptionsForEmployee(...);
}
```

- **Explanation:** Logout preserves `employee_linked_devices` for an active QR-linked phone. Logout alone does not explain DB unlinking.
- **Severity:** Low (rules out logout as primary cause)

---

### F12 — Explicit unpair is soft-remove by device id only

- **File:** `src/features/employee-devices/device-pairing-service.ts`
- **Lines:** 667–696
- **Snippet:**

```ts
.update({ status: 'removed', removed_at: now, ... })
.eq('id', input.deviceId)
.eq('status', 'active')
```

- **Explanation:** Admin Unpair updates **one** row by id. Does not mass-delete. Unlikely if no intentional unpair occurred.
- **Severity:** Low (manual path)

---

### F13 — RLS is wide open

- **File:** `supabase/migrations/20260722150000_employee_device_pairing.sql`
- **Lines:** 95–100
- **Snippet:**

```sql
CREATE POLICY employee_linked_devices_all ON employee_linked_devices
  FOR ALL USING (true) WITH CHECK (true);
```

- **Explanation:** Any client with the anon key can UPDATE/INSERT these rows. Does not by itself unlink, but amplifies blast radius of client-side writes.
- **Severity:** Medium (security / blast radius)

---

### F14 — Scheduled jobs

- **Files:**
  - `supabase/migrations/20260723195000_schedule_shift_reminder_cron.sql`
  - `supabase/functions/shift-reminder/index.ts` ~806–840
- **Explanation:** `pg_cron` → `invoke_shift_reminder_cron()` → Edge `shift-reminder` with `mode=cron`. Each cron run: (1) `notification_db_guardian_cleanup`, (2) within send window, delivery path that calls `healStaleLinkedDeviceSubscription` per targeted employee.
- **Severity:** Critical (automatic recurrence of F6/F7)

---

### F15 — Triggers

- **Finding:** No Postgres triggers on `employee_linked_devices` that auto-delete or replace. Mutations are application / RPC / Edge Function driven.
- **Severity:** Info

---

### F16 — Admin vs employee special handling

- Pairing / unpair require `devices.manage` (admin permission).
- `primary_admin_device` has separate rotation and does **not** protect laundry-employee links from heal.
- Ahmed Shaaban as **main admin** is special mainly because his `admin_users.id` is likely `paired_by_admin_id` for many links — putting every paired phone into his heal candidate pool (F5+F6).
- Being admin does **not** prevent his own laundry link from being rewritten; it makes him the hub of cross-link contamination.
- **Severity:** High

---

### F17 — `mark_onesignal_subscription_invalid` does not remove UI link

- **File:** `supabase/migrations/20260723160000_notification_platform_v2.sql`
- **Lines:** 637–641
- **Explanation:** Sets `subscription_status = 'invalid'` but leaves `status = 'active'`. Admin UI “paired” badge still shows. Not the “disappeared” symptom.
- **Severity:** Low

---

### F18 — Manual heal script mirrors Edge heal

- **File:** `scripts/heal-stale-linked-subscriptions.mjs`
- **Lines:** ~14–80
- **Explanation:** Same “newest admin + device_label subscription → rewrite linked row” pattern as Edge heal. Running this script can reproduce the same cross-employee damage.
- **Severity:** High (ops risk)

---

## Writers of `employee_linked_devices` (index)

| Source | Operation | Effect |
|--------|-----------|--------|
| `pair_employee_device` RPC | UPDATE + UPSERT | Replace prior owner of player ID; activate new employee |
| `pairDeviceFromSessionLegacy` | UPDATE + UPSERT | Same as RPC (fallback) |
| `markEmployeeDevicesReplaced` | UPDATE | Employee’s other actives → `replaced` |
| `removeLinkedDevice` | UPDATE | Single row → `removed` |
| `sync_onesignal_subscription_rotation` | UPDATE | Rewrite player ID / reassign employee / mark replaced |
| `healStaleLinkedDeviceSubscription` | UPDATE (+ RPC fallback) | Point employee at “newest” admin-pool ID |
| `notification_db_guardian_cleanup` | UPDATE | Dedupe multiple actives per employee |
| `mark_onesignal_subscription_invalid` | UPDATE | `subscription_status=invalid` only |
| `live-subscription-sync` legacy fallback | UPDATE | old player ID → new |

**No hard `DELETE FROM employee_linked_devices` in application code.** UI “disappear” = `status` not `active`, or `laundry_employee_id` reassigned.

---

## Root Cause

### Primary cause

Automatic **subscription heal + rotation under a shared admin subscription pool**:

1. Pairing writes each employee phone’s OneSignal ID into `onesignal_subscriptions` with `employee_id = pairing admin` (F5).
2. **`healStaleLinkedDeviceSubscription`** treats **all** of that admin’s subscriptions (admin browser + every phone they paired, often same `device_label`) as candidates for “freshest ID” (F6).
3. When a linked employee’s stored player ID ≠ that newest ID, heal rewrites the link — or on unique conflict calls **`sync_onesignal_subscription_rotation`**, which marks the old link `replaced` and can **reassign** the surviving player-ID row to another laundry employee (F7).
4. Cron makes this recur without anyone clicking Unpair (F14).

There is **no** intentional “keep only one employee in the whole system” rule. There **is** “one player ID → one linked row” plus a heal that **cross-wires** IDs across employees who share a pairing admin.

### Contributing mechanisms

- Same-phone re-pair (F2) if a QR was scanned from a device already linked to someone else.
- Recovery Engine / OneSignal subscription listener rotation (F8, F9) if SW re-registration produced a new ID and rotation collided.
- Guardian dedupe (F10) only if an employee had multiple actives.
- Logout is **not** the primary cause (F11).

---

### Why Ahmed Shaaban remained

- Heal/rotation likely left the shared or freshest admin-pool subscription attached to **his** laundry employee row, or his ID was already the “newest” so heal left him alone.
- As main admin, his browser keeps refreshing `onesignal_subscriptions.updated_at`, making **his** subscription frequently the newest candidate.
- His admin identity is the hub of the polluted subscription pool (not a special “protected laundry link”).

---

### Why Mohamed Salama remained

- His `onesignal_player_id` still matched the heal candidate for him (no rewrite), **or**
- He was not in the same heal collision batch (different label / admin / cron targets), **or**
- After collisions, his row was not the one marked `replaced`.

Survival is consistent with **per-employee heal order + unique-constraint outcomes**, not special-case protection for Salama.

---

### Why Mohamed Sayed disappeared

Most likely his `employee_linked_devices` row was set to **`status = 'replaced'`** (still in DB; UI shows unpaired), caused by:

1. **Heal/rotation steal (most likely):** Another employee’s (or his own) heal picked a different newest admin-pool ID; unique conflict → RPC marked Sayed’s old ID `replaced` and reassigned ownership away from him.
2. **Same-device re-pair (less likely if all three coexisted for a while):** Someone later paired another employee using Sayed’s phone session (F2).

---

### Why the current device became unlinked

1. Server row no longer `active` for this player ID after heal/rotation (replaced or ownership moved) → client reconcile shows unpaired.
2. OneSignal issued a new subscription ID; rotation failed or local cache cleared while server pointed elsewhere.
3. Not logout (F11).

“Current device” unlinking together with Sayed disappearing strongly suggests the phone/browser that held Sayed’s (or the contested) subscription was the one whose player ID got rotated/replaced.

---

## DB Verification Queries

Run against live Supabase to confirm:

```sql
-- Status of the three employees
SELECT laundry_employee_id,
       laundry_employee_name_en,
       onesignal_player_id,
       status,
       subscription_status,
       paired_by_admin_id,
       device_label,
       paired_at,
       replaced_at,
       removed_at,
       updated_at
FROM employee_linked_devices
WHERE laundry_employee_name_en ILIKE '%Sayed%'
   OR laundry_employee_name_en ILIKE '%Shaaban%'
   OR laundry_employee_name_en ILIKE '%Salama%'
   OR laundry_employee_name_ar ILIKE '%سيد%'
   OR laundry_employee_name_ar ILIKE '%شعبان%'
   OR laundry_employee_name_ar ILIKE '%سلامة%'
ORDER BY updated_at DESC;

-- Shared / colliding player IDs
SELECT onesignal_player_id,
       count(*) AS rows,
       array_agg(DISTINCT laundry_employee_id) AS employees,
       array_agg(status) AS statuses
FROM employee_linked_devices
GROUP BY onesignal_player_id
HAVING count(*) > 1;

-- Admin subscription pool (heal candidates)
SELECT employee_id,
       onesignal_player_id,
       laundry_employee_id,
       device,
       is_valid,
       updated_at
FROM onesignal_subscriptions
WHERE employee_id IN (
  SELECT DISTINCT paired_by_admin_id
  FROM employee_linked_devices
  WHERE paired_by_admin_id IS NOT NULL
)
ORDER BY employee_id, updated_at DESC;
```

Also check Edge Function logs for:

`heal: rotating stale linked subscription`

around the time Sayed disappeared.

---

## Recommended Fix

*(Guidance only — not implemented in this investigation.)*

1. **Stop indexing paired employee phones under the admin’s `employee_id`.** Key subscriptions by laundry employee (or a dedicated pairing-owner field) so heal cannot treat all paired phones as one pool.
2. **Rewrite `healStaleLinkedDeviceSubscription`:** only rotate using subscriptions that already belong to **that** `laundry_employee_id` (or the exact previous player ID), never “newest among all admin-owned subs.”
3. **Harden `sync_onesignal_subscription_rotation`:** when `p_new_id` is already linked to a **different** laundry employee, **do not** reassign `laundry_employee_id`; fail closed or only update the matching employee’s row.
4. **Add an audit trail** (`source`: `pair` | `heal` | `rotation` | `guardian` | `admin_unpair`) so the next incident is attributable.
5. **Verify live data** with the SQL above + Edge logs.
6. Optionally: partial unique index `UNIQUE (laundry_employee_id) WHERE status = 'active'` to enforce one active device per employee in the database.

---

## File Index

| Path | Role |
|------|------|
| `src/features/employee-devices/device-pairing-service.ts` | Pair / replace / remove / list |
| `src/features/admin/pages/AdminEmployeeDevicesPage.tsx` | Admin UI |
| `src/lib/notification-platform/live-subscription-sync.ts` | Rotation client |
| `src/lib/notification-platform/self-healing-engine.ts` | Recovery → rotation |
| `src/lib/onesignal/client.ts` | Change listener + logout preserve |
| `supabase/functions/shift-reminder/index.ts` | Heal + guardian cron |
| `supabase/migrations/20260722150000_employee_device_pairing.sql` | Table + unique + RLS |
| `supabase/migrations/20260723160000_notification_platform_v2.sql` | Guardian, invalid mark, early rotation |
| `supabase/migrations/20260723180000_fix_pair_employee_device_ambiguous_conflict.sql` | Current pair RPC |
| `supabase/migrations/20260723190000_fix_subscription_rotation_infer_old_id.sql` | Current rotation RPC |
| `supabase/migrations/20260723195000_schedule_shift_reminder_cron.sql` | pg_cron invoke |
| `scripts/heal-stale-linked-subscriptions.mjs` | Manual heal (same antipattern) |

---

## Bottom Line

Unlinking was almost certainly **automatic heal + subscription rotation under a shared admin subscription pool**, not intentional Unpair and not logout.

- Mohamed Sayed’s active link was soft-replaced / ownership-stolen.
- Ahmed Shaaban and Mohamed Salama’s active rows survived the same collision window.
- The current device followed the contested OneSignal player ID and appeared unlinked after server state changed.

---

*End of investigation report.*
