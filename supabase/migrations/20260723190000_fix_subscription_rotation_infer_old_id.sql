-- When subscription rotation has no old_id but we know the laundry employee,
-- rewrite that employee's active linked device to the new subscription id.
-- Fixes silent push failure: OneSignal accepts stale ids (HTTP 200) while
-- the live browser only holds the new subscription.

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

  -- Infer old id from active linked device when caller only has the new id.
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

  IF v_inferred_old IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM employee_linked_devices
      WHERE onesignal_player_id = p_new_id
    ) THEN
      UPDATE employee_linked_devices
      SET status = 'replaced',
          replaced_at = v_now,
          updated_at = v_now
      WHERE onesignal_player_id = v_inferred_old
        AND status = 'active'
        AND onesignal_player_id <> p_new_id;

      UPDATE employee_linked_devices
      SET device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label),
          last_seen_at = v_now,
          last_synced_at = v_now,
          subscription_status = 'active',
          status = 'active',
          replaced_at = NULL,
          removed_at = NULL,
          updated_at = v_now,
          laundry_employee_id = COALESCE(v_laundry_id, laundry_employee_id)
      WHERE onesignal_player_id = p_new_id;
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
        AND status = 'active';
      GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
    END IF;

    UPDATE employee_device_pairing_sessions
    SET onesignal_player_id = p_new_id
    WHERE onesignal_player_id = v_inferred_old
      AND status = 'pending';

    SELECT employee_id, laundry_employee_id
    INTO v_employee_id, v_laundry_id
    FROM onesignal_subscriptions
    WHERE onesignal_player_id = v_inferred_old
    LIMIT 1;

    IF v_employee_id IS NULL THEN
      v_employee_id := NULLIF(trim(COALESCE(p_admin_employee_id, '')), '');
    END IF;
    IF v_laundry_id IS NULL THEN
      v_laundry_id := NULLIF(trim(COALESCE(p_laundry_employee_id, '')), '');
    END IF;

    IF v_employee_id IS NOT NULL THEN
      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        v_employee_id,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        v_laundry_id,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET employee_id = EXCLUDED.employee_id,
          device = EXCLUDED.device,
          laundry_employee_id = COALESCE(EXCLUDED.laundry_employee_id, onesignal_subscriptions.laundry_employee_id),
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at;
      v_subs_updated := 1;

      UPDATE onesignal_subscriptions
      SET is_valid = false,
          updated_at = v_now
      WHERE onesignal_player_id = v_inferred_old;
    END IF;

    IF p_primary_admin_device_id IS NOT NULL
       AND length(trim(p_primary_admin_device_id)) > 0 THEN
      UPDATE primary_admin_device
      SET onesignal_subscription_id = p_new_id,
          updated_at = v_now
      WHERE device_id = p_primary_admin_device_id
        AND (
          onesignal_subscription_id = v_inferred_old
          OR onesignal_subscription_id IS DISTINCT FROM p_new_id
        );
      GET DIAGNOSTICS v_primary_updated = ROW_COUNT;
    END IF;
  ELSE
    IF v_employee_id IS NOT NULL THEN
      INSERT INTO onesignal_subscriptions (
        employee_id,
        onesignal_player_id,
        device,
        laundry_employee_id,
        updated_at,
        is_valid,
        last_verified_at
      )
      VALUES (
        v_employee_id,
        p_new_id,
        COALESCE(NULLIF(trim(p_device_label), ''), 'web'),
        v_laundry_id,
        v_now,
        true,
        v_now
      )
      ON CONFLICT (onesignal_player_id) DO UPDATE
      SET employee_id = EXCLUDED.employee_id,
          device = EXCLUDED.device,
          laundry_employee_id = COALESCE(EXCLUDED.laundry_employee_id, onesignal_subscriptions.laundry_employee_id),
          updated_at = EXCLUDED.updated_at,
          is_valid = true,
          last_verified_at = EXCLUDED.last_verified_at;
      v_subs_updated := 1;
    END IF;

    UPDATE employee_linked_devices
    SET last_seen_at = v_now,
        last_synced_at = v_now,
        subscription_status = 'active',
        updated_at = v_now,
        device_label = COALESCE(NULLIF(trim(p_device_label), ''), device_label)
    WHERE onesignal_player_id = p_new_id
      AND status = 'active';
    GET DIAGNOSTICS v_linked_updated = ROW_COUNT;

    -- Still no match on new id: rewrite laundry employee's active linked row.
    IF v_linked_updated = 0 AND v_laundry_id IS NOT NULL THEN
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

    IF p_primary_admin_device_id IS NOT NULL
       AND length(trim(p_primary_admin_device_id)) > 0 THEN
      UPDATE primary_admin_device
      SET onesignal_subscription_id = p_new_id,
          updated_at = v_now
      WHERE device_id = p_primary_admin_device_id;
      GET DIAGNOSTICS v_primary_updated = ROW_COUNT;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
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
