-- Fix pair_employee_device: RETURNS TABLE output columns (id, status,
-- onesignal_player_id, …) were shadowing SQL identifiers inside the function.
-- Unqualified WHERE id = … / AND status = 'pending' compared NULL variables,
-- so the pairing session never flipped to completed and related UPDATEs matched
-- 0 rows. Re-create the function with table aliases on every SQL reference.

CREATE OR REPLACE FUNCTION pair_employee_device(
  p_pairing_token TEXT,
  p_laundry_employee_id TEXT,
  p_laundry_employee_name_en TEXT,
  p_laundry_employee_name_ar TEXT,
  p_paired_by_admin_id TEXT,
  p_replace_existing BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  laundry_employee_id TEXT,
  laundry_employee_name_en TEXT,
  laundry_employee_name_ar TEXT,
  onesignal_player_id TEXT,
  device_label TEXT,
  status TEXT,
  paired_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  paired_by_admin_id TEXT,
  replaced_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ
)
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
BEGIN
  IF p_pairing_token IS NULL OR length(trim(p_pairing_token)) = 0 THEN
    RAISE EXCEPTION 'Pairing code was not found.';
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

  SELECT count(*)::integer INTO v_active_count
  FROM employee_linked_devices AS d
  WHERE d.laundry_employee_id = p_laundry_employee_id
    AND d.status = 'active'
    AND d.onesignal_player_id <> v_session.onesignal_player_id;

  IF v_active_count > 0 AND NOT COALESCE(p_replace_existing, false) THEN
    RAISE EXCEPTION 'This employee already has a linked device. Choose replace to continue.';
  END IF;

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
      WHERE sub.onesignal_player_id = v_old_player;
    END LOOP;
  END IF;

  -- Drop previous active link on this exact player id.
  UPDATE employee_linked_devices AS d
  SET status = 'replaced',
      replaced_at = v_now,
      updated_at = v_now
  WHERE d.onesignal_player_id = v_session.onesignal_player_id
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
  ON CONFLICT (onesignal_player_id) DO UPDATE
  SET laundry_employee_id = EXCLUDED.laundry_employee_id,
      laundry_employee_name_en = EXCLUDED.laundry_employee_name_en,
      laundry_employee_name_ar = EXCLUDED.laundry_employee_name_ar,
      device_label = EXCLUDED.device_label,
      status = 'active',
      paired_at = EXCLUDED.paired_at,
      last_seen_at = EXCLUDED.last_seen_at,
      paired_by_admin_id = EXCLUDED.paired_by_admin_id,
      replaced_at = NULL,
      removed_at = NULL,
      updated_at = EXCLUDED.updated_at,
      last_synced_at = EXCLUDED.last_synced_at,
      subscription_status = 'active'
  RETURNING d.* INTO v_device;

  IF v_device.id IS NULL THEN
    RAISE EXCEPTION 'Failed to link employee device.';
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

  INSERT INTO onesignal_subscriptions AS sub (
    employee_id,
    onesignal_player_id,
    device,
    laundry_employee_id,
    updated_at,
    is_valid,
    last_verified_at
  )
  VALUES (
    p_paired_by_admin_id,
    v_session.onesignal_player_id,
    v_session.device_label,
    p_laundry_employee_id,
    v_now,
    true,
    v_now
  )
  ON CONFLICT (onesignal_player_id) DO UPDATE
  SET employee_id = EXCLUDED.employee_id,
      device = EXCLUDED.device,
      laundry_employee_id = EXCLUDED.laundry_employee_id,
      updated_at = EXCLUDED.updated_at,
      is_valid = true,
      last_verified_at = EXCLUDED.last_verified_at;

  RETURN QUERY
  SELECT
    v_device.id,
    v_device.laundry_employee_id,
    v_device.laundry_employee_name_en,
    v_device.laundry_employee_name_ar,
    v_device.onesignal_player_id,
    v_device.device_label,
    v_device.status::text,
    v_device.paired_at,
    v_device.last_seen_at,
    v_device.paired_by_admin_id,
    v_device.replaced_at,
    v_device.removed_at;
END;
$$;

GRANT EXECUTE ON FUNCTION pair_employee_device(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
