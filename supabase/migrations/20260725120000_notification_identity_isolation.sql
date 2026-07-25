-- Notification identity isolation.
-- Safe / additive: preserves history and existing link rows.
--
-- Goals:
-- 1. Laundry employee subscriptions are owned by laundry_employee_id (ownership).
-- 2. Primary Admin device remains orthogonal (primary_admin_device + admin ownership).
-- 3. pair_employee_device never steals another employee's active player id.
-- 4. sync_onesignal_subscription_rotation never reassigns laundry_employee_id
--    across employees.
-- 5. Heal candidates (edge) must query ownership=laundry_employee by laundry id.

-- ---------------------------------------------------------------------------
-- 1. Schema: ownership columns (additive)
-- ---------------------------------------------------------------------------

ALTER TABLE onesignal_subscriptions
  ADD COLUMN IF NOT EXISTS ownership TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE onesignal_subscriptions
  ADD COLUMN IF NOT EXISTS registered_by_admin_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onesignal_subscriptions_ownership_check'
  ) THEN
    ALTER TABLE onesignal_subscriptions
      ADD CONSTRAINT onesignal_subscriptions_ownership_check
      CHECK (ownership IN ('admin', 'laundry_employee'));
  END IF;
END $$;

-- Allow laundry-owned rows without an admin_users employee_id.
ALTER TABLE onesignal_subscriptions
  ALTER COLUMN employee_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_ownership_laundry
  ON onesignal_subscriptions (ownership, laundry_employee_id)
  WHERE ownership = 'laundry_employee' AND laundry_employee_id IS NOT NULL;

-- Permanent Primary Admin identity marker (singleton settings row).
INSERT INTO app_settings (key, value, updated_at)
SELECT
  'primary_admin_identity',
  '{"id":"primary-admin-kamel","username":"kamel ahmed","displayName":"Kamel Ahmed","note":"Permanent Primary Admin auth identity; never conflate with laundry_employee_id"}',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM app_settings WHERE key = 'primary_admin_identity'
);

-- ---------------------------------------------------------------------------
-- 2. Backfill existing paired phones → laundry ownership
-- ---------------------------------------------------------------------------

UPDATE onesignal_subscriptions AS s
SET ownership = 'laundry_employee',
    registered_by_admin_id = COALESCE(
      s.registered_by_admin_id,
      NULLIF(trim(s.employee_id), '')
    ),
    laundry_employee_id = COALESCE(
      NULLIF(trim(s.laundry_employee_id), ''),
      d.laundry_employee_id
    ),
    updated_at = now()
FROM employee_linked_devices AS d
WHERE d.onesignal_player_id = s.onesignal_player_id
  AND d.status = 'active';

UPDATE onesignal_subscriptions
SET ownership = 'laundry_employee',
    registered_by_admin_id = COALESCE(
      registered_by_admin_id,
      NULLIF(trim(employee_id), '')
    ),
    updated_at = now()
WHERE ownership = 'admin'
  AND laundry_employee_id IS NOT NULL
  AND length(trim(laundry_employee_id)) > 0
  AND onesignal_player_id IN (
    SELECT onesignal_player_id
    FROM employee_linked_devices
    WHERE status IN ('active', 'replaced', 'removed')
  );

-- ---------------------------------------------------------------------------
-- 3. pair_employee_device — never steal another employee's player id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pair_employee_device(
  p_pairing_token TEXT,
  p_laundry_employee_id TEXT,
  p_laundry_employee_name_en TEXT,
  p_laundry_employee_name_ar TEXT,
  p_paired_by_admin_id TEXT,
  p_replace_existing BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session employee_device_pairing_sessions%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_active_count INTEGER;
  v_device employee_linked_devices%ROWTYPE;
  v_old_player TEXT;
  v_foreign_owner TEXT;
BEGIN
  IF p_pairing_token IS NULL OR length(trim(p_pairing_token)) = 0 THEN
    RAISE EXCEPTION 'Pairing code was not found.';
  END IF;

  IF p_laundry_employee_id IS NULL OR length(trim(p_laundry_employee_id)) = 0 THEN
    RAISE EXCEPTION 'Laundry employee id is required.';
  END IF;

  SELECT s.* INTO v_session
  FROM employee_device_pairing_sessions AS s
  WHERE s.pairing_token = trim(p_pairing_token)
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pairing code was not found.';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'This pairing code was already used.';
  END IF;

  IF v_session.status <> 'pending' THEN
    RAISE EXCEPTION 'This pairing code is no longer valid.';
  END IF;

  IF v_session.expires_at < v_now THEN
    UPDATE employee_device_pairing_sessions AS s
    SET status = 'expired'
    WHERE s.id = v_session.id;
    RAISE EXCEPTION 'This pairing code has expired.';
  END IF;

  -- Hard isolation: this device must not be active for a different employee.
  SELECT d.laundry_employee_id
  INTO v_foreign_owner
  FROM employee_linked_devices AS d
  WHERE d.onesignal_player_id = v_session.onesignal_player_id
    AND d.status = 'active'
    AND d.laundry_employee_id IS DISTINCT FROM p_laundry_employee_id
  LIMIT 1;

  IF v_foreign_owner IS NOT NULL THEN
    RAISE EXCEPTION
      'This device is already linked to another employee. Unlink that employee before pairing.';
  END IF;

  SELECT count(*)::integer INTO v_active_count
  FROM employee_linked_devices AS d
  WHERE d.laundry_employee_id = p_laundry_employee_id
    AND d.status = 'active'
    AND d.onesignal_player_id <> v_session.onesignal_player_id;

  IF v_active_count > 0 AND NOT COALESCE(p_replace_existing, false) THEN
    RAISE EXCEPTION 'This employee already has a linked device. Choose replace to continue.';
  END IF;

  -- Replace only THIS employee's other active devices.
  IF COALESCE(p_replace_existing, false) THEN
    FOR v_old_player IN
      SELECT d.onesignal_player_id
      FROM employee_linked_devices AS d
      WHERE d.laundry_employee_id = p_laundry_employee_id
        AND d.status = 'active'
        AND d.onesignal_player_id <> v_session.onesignal_player_id
    LOOP
      UPDATE employee_linked_devices AS d
      SET status = 'replaced',
          replaced_at = v_now,
          updated_at = v_now
      WHERE d.laundry_employee_id = p_laundry_employee_id
        AND d.onesignal_player_id = v_old_player
        AND d.status = 'active';

      DELETE FROM onesignal_subscriptions AS sub
      WHERE sub.onesignal_player_id = v_old_player
        AND sub.ownership = 'laundry_employee'
        AND sub.laundry_employee_id = p_laundry_employee_id;
    END LOOP;
  END IF;

  -- Refresh this employee's existing active row for this player (if any).
  -- Do NOT mark other employees replaced (blocked above).
  UPDATE employee_linked_devices AS d
  SET status = 'active',
      laundry_employee_name_en = p_laundry_employee_name_en,
      laundry_employee_name_ar = p_laundry_employee_name_ar,
      device_label = v_session.device_label,
      paired_by_admin_id = p_paired_by_admin_id,
      last_seen_at = v_now,
      last_synced_at = v_now,
      subscription_status = 'active',
      replaced_at = NULL,
      removed_at = NULL,
      updated_at = v_now
  WHERE d.onesignal_player_id = v_session.onesignal_player_id
    AND d.laundry_employee_id = p_laundry_employee_id
    AND d.status = 'active';

  INSERT INTO employee_linked_devices AS d (
    laundry_employee_id,
    laundry_employee_name_en,
    laundry_employee_name_ar,
    onesignal_player_id,
    device_label,
    status,
    paired_at,
    last_seen_at,
    paired_by_admin_id,
    replaced_at,
    removed_at,
    updated_at,
    last_synced_at,
    subscription_status
  )
  VALUES (
    p_laundry_employee_id,
    p_laundry_employee_name_en,
    p_laundry_employee_name_ar,
    v_session.onesignal_player_id,
    v_session.device_label,
    'active',
    v_now,
    v_now,
    p_paired_by_admin_id,
    NULL,
    NULL,
    v_now,
    v_now,
    'active'
  )
  ON CONFLICT ON CONSTRAINT employee_linked_devices_player_unique DO UPDATE
  SET laundry_employee_id = EXCLUDED.laundry_employee_id,
      laundry_employee_name_en = EXCLUDED.laundry_employee_name_en,
      laundry_employee_name_ar = EXCLUDED.laundry_employee_name_ar,
      device_label = EXCLUDED.device_label,
      status = 'active',
      paired_at = CASE
        WHEN d.status = 'active' AND d.laundry_employee_id = EXCLUDED.laundry_employee_id
          THEN d.paired_at
        ELSE EXCLUDED.paired_at
      END,
      last_seen_at = EXCLUDED.last_seen_at,
      paired_by_admin_id = EXCLUDED.paired_by_admin_id,
      replaced_at = NULL,
      removed_at = NULL,
      updated_at = EXCLUDED.updated_at,
      last_synced_at = EXCLUDED.last_synced_at,
      subscription_status = 'active'
  WHERE d.laundry_employee_id = EXCLUDED.laundry_employee_id
     OR d.status <> 'active'
  RETURNING d.* INTO v_device;

  IF v_device.id IS NULL THEN
    -- Conflict row belongs to another employee (race) — refuse.
    RAISE EXCEPTION
      'This device is already linked to another employee. Unlink that employee before pairing.';
  END IF;

  UPDATE employee_device_pairing_sessions AS s
  SET status = 'completed',
      laundry_employee_id = p_laundry_employee_id,
      laundry_employee_name_en = p_laundry_employee_name_en,
      laundry_employee_name_ar = p_laundry_employee_name_ar,
      paired_by_admin_id = p_paired_by_admin_id,
      completed_at = v_now
  WHERE s.id = v_session.id
    AND s.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to complete pairing session.';
  END IF;

  UPDATE employee_device_pairing_sessions AS s
  SET status = 'cancelled'
  WHERE s.onesignal_player_id = v_session.onesignal_player_id
    AND s.status = 'pending'
    AND s.id <> v_session.id;

  -- Laundry-owned subscription — never pool under admin employee_id.
  INSERT INTO onesignal_subscriptions AS sub (
    employee_id,
    onesignal_player_id,
    device,
    laundry_employee_id,
    ownership,
    registered_by_admin_id,
    updated_at,
    is_valid,
    last_verified_at
  )
  VALUES (
    NULL,
    v_session.onesignal_player_id,
    v_session.device_label,
    p_laundry_employee_id,
    'laundry_employee',
    p_paired_by_admin_id,
    v_now,
    true,
    v_now
  )
  ON CONFLICT ON CONSTRAINT onesignal_subscriptions_player_unique DO UPDATE
  SET employee_id = NULL,
      device = EXCLUDED.device,
      laundry_employee_id = EXCLUDED.laundry_employee_id,
      ownership = 'laundry_employee',
      registered_by_admin_id = COALESCE(
        EXCLUDED.registered_by_admin_id,
        onesignal_subscriptions.registered_by_admin_id
      ),
      updated_at = EXCLUDED.updated_at,
      is_valid = true,
      last_verified_at = EXCLUDED.last_verified_at
  WHERE onesignal_subscriptions.ownership IS DISTINCT FROM 'admin'
     OR onesignal_subscriptions.laundry_employee_id IS NULL
     OR onesignal_subscriptions.laundry_employee_id = EXCLUDED.laundry_employee_id;

  RETURN jsonb_build_object(
    'id', v_device.id,
    'laundry_employee_id', v_device.laundry_employee_id,
    'laundry_employee_name_en', v_device.laundry_employee_name_en,
    'laundry_employee_name_ar', v_device.laundry_employee_name_ar,
    'onesignal_player_id', v_device.onesignal_player_id,
    'device_label', v_device.device_label,
    'status', v_device.status,
    'paired_at', v_device.paired_at,
    'last_seen_at', v_device.last_seen_at,
    'paired_by_admin_id', v_device.paired_by_admin_id,
    'replaced_at', v_device.replaced_at,
    'removed_at', v_device.removed_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION pair_employee_device(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Rotation — never reassign laundry_employee_id across employees
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_onesignal_subscription_rotation(
  p_old_id TEXT,
  p_new_id TEXT,
  p_device_label TEXT DEFAULT 'web',
  p_laundry_employee_id TEXT DEFAULT NULL,
  p_admin_employee_id TEXT DEFAULT NULL,
  p_primary_admin_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_linked_updated INTEGER := 0;
  v_subs_updated INTEGER := 0;
  v_primary_updated INTEGER := 0;
  v_employee_id TEXT;
  v_laundry_id TEXT;
  v_inferred_old TEXT;
  v_owner_laundry TEXT;
  v_new_owner_laundry TEXT;
  v_blocked BOOLEAN := false;
BEGIN
  IF p_new_id IS NULL OR length(trim(p_new_id)) = 0 THEN
    RAISE EXCEPTION 'new subscription id is required';
  END IF;

  IF p_old_id IS NOT NULL AND p_old_id = p_new_id THEN
    RETURN jsonb_build_object(
      'ok', true,
      'noop', true,
      'linked_updated', 0,
      'subs_updated', 0,
      'primary_updated', 0
    );
  END IF;

  v_laundry_id := NULLIF(trim(COALESCE(p_laundry_employee_id, '')), '');
  v_employee_id := NULLIF(trim(COALESCE(p_admin_employee_id, '')), '');

  v_inferred_old := NULLIF(trim(COALESCE(p_old_id, '')), '');
  IF v_inferred_old IS NULL AND v_laundry_id IS NOT NULL THEN
    SELECT onesignal_player_id
    INTO v_inferred_old
    FROM employee_linked_devices
    WHERE laundry_employee_id = v_laundry_id
      AND status = 'active'
      AND onesignal_player_id IS DISTINCT FROM p_new_id
    ORDER BY paired_at DESC
    LIMIT 1;
  END IF;

  IF v_inferred_old IS NOT NULL AND v_inferred_old = p_new_id THEN
    v_inferred_old := NULL;
  END IF;

  -- If new id is already linked to a different laundry employee → fail closed.
  SELECT laundry_employee_id
  INTO v_new_owner_laundry
  FROM employee_linked_devices
  WHERE onesignal_player_id = p_new_id
    AND status = 'active'
  LIMIT 1;

  IF v_new_owner_laundry IS NOT NULL
     AND v_laundry_id IS NOT NULL
     AND v_new_owner_laundry IS DISTINCT FROM v_laundry_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'blocked', true,
      'reason', 'new_id_owned_by_another_laundry_employee',
      'linked_updated', 0,
      'subs_updated', 0,
      'primary_updated', 0,
      'new_id', p_new_id,
      'old_id', v_inferred_old,
      'owner_laundry_employee_id', v_new_owner_laundry
    );
  END IF;

  IF v_inferred_old IS NOT NULL THEN
    SELECT laundry_employee_id
    INTO v_owner_laundry
    FROM employee_linked_devices
    WHERE onesignal_player_id = v_inferred_old
      AND status = 'active'
    LIMIT 1;

    -- Do not rotate a linked row that belongs to a different laundry employee.
    IF v_laundry_id IS NOT NULL
       AND v_owner_laundry IS NOT NULL
       AND v_owner_laundry IS DISTINCT FROM v_laundry_id THEN
      v_blocked := true;
    END IF;

    IF NOT v_blocked THEN
      IF EXISTS (
        SELECT 1 FROM employee_linked_devices
        WHERE onesignal_player_id = p_new_id
      ) THEN
        -- Same employee already has / had the new id row: activate it,
        -- retire old id for the SAME laundry employee only.
        UPDATE employee_linked_devices
        SET status = 'replaced',
            replaced_at = v_now,
            updated_at = v_now
        WHERE onesignal_player_id = v_inferred_old
          AND status = 'active'
          AND (
            v_laundry_id IS NULL
            OR laundry_employee_id = v_laundry_id
          )
          AND onesignal_player_id <> p_new_id;

        UPDATE employee_linked_devices
        SET device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label),
            last_seen_at = v_now,
            last_synced_at = v_now,
            subscription_status = 'active',
            status = 'active',
            replaced_at = NULL,
            removed_at = NULL,
            updated_at = v_now
            -- NEVER change laundry_employee_id here
        WHERE onesignal_player_id = p_new_id
          AND (
            v_laundry_id IS NULL
            OR laundry_employee_id = v_laundry_id
          );
        GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
      ELSE
        UPDATE employee_linked_devices
        SET onesignal_player_id = p_new_id,
            device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label),
            last_seen_at = v_now,
            last_synced_at = v_now,
            subscription_status = 'active',
            updated_at = v_now
        WHERE onesignal_player_id = v_inferred_old
          AND status = 'active'
          AND (
            v_laundry_id IS NULL
            OR laundry_employee_id = v_laundry_id
          );
        GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
      END IF;
    END IF;

    UPDATE employee_device_pairing_sessions
    SET onesignal_player_id = p_new_id
    WHERE onesignal_player_id = v_inferred_old
      AND status = 'pending';

    -- Laundry-owned subscription rotation (scoped).
    IF v_laundry_id IS NOT NULL AND NOT v_blocked THEN
      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        ownership,
        registered_by_admin_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        NULL,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        v_laundry_id,
        'laundry_employee',
        NULL,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET device = EXCLUDED.device,
          laundry_employee_id = COALESCE(
            EXCLUDED.laundry_employee_id,
            onesignal_subscriptions.laundry_employee_id
          ),
          ownership = CASE
            WHEN onesignal_subscriptions.ownership = 'admin'
              AND onesignal_subscriptions.laundry_employee_id IS NULL
              THEN onesignal_subscriptions.ownership
            ELSE 'laundry_employee'
          END,
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at
      WHERE onesignal_subscriptions.laundry_employee_id IS NULL
         OR onesignal_subscriptions.laundry_employee_id = EXCLUDED.laundry_employee_id
         OR onesignal_subscriptions.ownership = 'admin';
      v_subs_updated := 1;

      UPDATE onesignal_subscriptions
      SET is_valid = false,
          updated_at = v_now
      WHERE onesignal_player_id = v_inferred_old
        AND ownership = 'laundry_employee'
        AND laundry_employee_id = v_laundry_id;
    ELSIF v_employee_id IS NOT NULL AND v_laundry_id IS NULL THEN
      -- Admin-owned subscription (login / primary-admin path).
      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        ownership,
        registered_by_admin_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        v_employee_id,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        NULL,
        'admin',
        v_employee_id,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET employee_id = COALESCE(EXCLUDED.employee_id, onesignal_subscriptions.employee_id),
          device = EXCLUDED.device,
          ownership = COALESCE(onesignal_subscriptions.ownership, 'admin'),
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at
      WHERE onesignal_subscriptions.ownership IS DISTINCT FROM 'laundry_employee';
      v_subs_updated := 1;

      UPDATE onesignal_subscriptions
      SET is_valid = false,
          updated_at = v_now
      WHERE onesignal_player_id = v_inferred_old
        AND ownership = 'admin'
        AND employee_id = v_employee_id;
    END IF;
  ELSE
    -- No old id: touch matching new id or rewrite SAME laundry employee only.
    IF v_laundry_id IS NOT NULL THEN
      UPDATE employee_linked_devices
      SET last_seen_at = v_now,
          last_synced_at = v_now,
          subscription_status = 'active',
          updated_at = v_now,
          device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label)
      WHERE onesignal_player_id = p_new_id
        AND status = 'active'
        AND laundry_employee_id = v_laundry_id;
      GET DIAGNOSTICS v_linked_updated = ROW_COUNT;

      IF v_linked_updated = 0
         AND (v_new_owner_laundry IS NULL OR v_new_owner_laundry = v_laundry_id) THEN
        UPDATE employee_linked_devices
        SET onesignal_player_id = p_new_id,
            device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label),
            last_seen_at = v_now,
            last_synced_at = v_now,
            subscription_status = 'active',
            updated_at = v_now
        WHERE laundry_employee_id = v_laundry_id
          AND status = 'active'
          AND onesignal_player_id IS DISTINCT FROM p_new_id;
        GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
      END IF;

      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        ownership,
        registered_by_admin_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        NULL,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        v_laundry_id,
        'laundry_employee',
        NULL,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET laundry_employee_id = COALESCE(
            EXCLUDED.laundry_employee_id,
            onesignal_subscriptions.laundry_employee_id
          ),
          ownership = CASE
            WHEN onesignal_subscriptions.ownership = 'laundry_employee'
              THEN 'laundry_employee'
            WHEN onesignal_subscriptions.laundry_employee_id IS NULL
              THEN 'laundry_employee'
            ELSE onesignal_subscriptions.ownership
          END,
          device = EXCLUDED.device,
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at
      WHERE onesignal_subscriptions.laundry_employee_id IS NULL
         OR onesignal_subscriptions.laundry_employee_id = EXCLUDED.laundry_employee_id;
      v_subs_updated := 1;
    ELSIF v_employee_id IS NOT NULL THEN
      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        ownership,
        registered_by_admin_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        v_employee_id,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        NULL,
        'admin',
        v_employee_id,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET employee_id = COALESCE(EXCLUDED.employee_id, onesignal_subscriptions.employee_id),
          device = EXCLUDED.device,
          ownership = COALESCE(onesignal_subscriptions.ownership, 'admin'),
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at
      WHERE onesignal_subscriptions.ownership IS DISTINCT FROM 'laundry_employee';
      v_subs_updated := 1;

      UPDATE employee_linked_devices
      SET last_seen_at = v_now,
          last_synced_at = v_now,
          subscription_status = 'active',
          updated_at = v_now,
          device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label)
      WHERE onesignal_player_id = p_new_id
        AND status = 'active';
      GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
    END IF;
  END IF;

  -- Primary admin device — only when explicitly targeted.
  IF p_primary_admin_device_id IS NOT NULL
     AND length(trim(p_primary_admin_device_id)) > 0 THEN
    UPDATE primary_admin_device
    SET onesignal_subscription_id = p_new_id,
        updated_at = v_now
    WHERE device_id = p_primary_admin_device_id
      AND (
        v_inferred_old IS NULL
        OR onesignal_subscription_id = v_inferred_old
        OR onesignal_subscription_id IS DISTINCT FROM p_new_id
      );
    GET DIAGNOSTICS v_primary_updated = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', NOT v_blocked,
    'blocked', v_blocked,
    'noop', false,
    'linked_updated', v_linked_updated,
    'subs_updated', v_subs_updated,
    'primary_updated', v_primary_updated,
    'new_id', p_new_id,
    'old_id', v_inferred_old
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_onesignal_subscription_rotation(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
