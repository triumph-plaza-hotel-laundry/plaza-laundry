-- Production hardening for notification device links.
-- Fixes:
-- 1) claim: clear inactive rows holding the same player_id (UNIQUE collision)
-- 2) refresh: require expected_player_id (blocks blind steal without ownership proof)
-- 3) issue ticket: invalidate prior open tickets for the same employee
-- 4) mark invalid: operate on employee_notification_devices (not dropped legacy tables)

BEGIN;

-- ---------------------------------------------------------------------------
-- claim_notification_device
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_notification_device(
  p_token TEXT,
  p_player_id TEXT,
  p_device_id TEXT DEFAULT 'web',
  p_device_name TEXT DEFAULT NULL,
  p_device_model TEXT DEFAULT NULL,
  p_operating_system TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS TABLE (employee_id TEXT, player_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket employee_notification_link_tickets%ROWTYPE;
  v_employee_id TEXT;
  v_player_id TEXT;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'token is required';
  END IF;
  IF p_player_id IS NULL OR trim(p_player_id) = '' THEN
    RAISE EXCEPTION 'player_id is required';
  END IF;

  v_player_id := trim(p_player_id);

  SELECT * INTO v_ticket
  FROM employee_notification_link_tickets AS t
  WHERE t.token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pairing ticket';
  END IF;
  IF v_ticket.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'pairing ticket already used';
  END IF;
  IF v_ticket.expires_at <= now() THEN
    RAISE EXCEPTION 'pairing ticket expired';
  END IF;

  v_employee_id := trim(v_ticket.employee_id);

  -- Free UNIQUE(player_id): drop inactive rows that still hold this subscription.
  DELETE FROM employee_notification_devices AS d
  WHERE d.player_id = v_player_id
    AND d.status <> 'active';

  -- Same player still active for another employee → unlink that owner
  UPDATE employee_notification_devices AS d
  SET status = 'unlinked', updated_at = now()
  WHERE d.player_id = v_player_id
    AND d.status = 'active'
    AND d.employee_id <> v_employee_id;

  -- After unlink, delete the now-inactive row so UNIQUE allows the new active row.
  DELETE FROM employee_notification_devices AS d
  WHERE d.player_id = v_player_id
    AND d.status <> 'active';

  -- Upsert single active row for this employee
  IF EXISTS (
    SELECT 1
    FROM employee_notification_devices AS d
    WHERE d.employee_id = v_employee_id
      AND d.status = 'active'
  ) THEN
    UPDATE employee_notification_devices AS d
    SET
      player_id = v_player_id,
      device_id = COALESCE(NULLIF(trim(p_device_id), ''), 'web'),
      device_name = p_device_name,
      device_model = p_device_model,
      operating_system = p_operating_system,
      browser = p_browser,
      app_version = p_app_version,
      linked_at = now(),
      updated_at = now()
    WHERE d.employee_id = v_employee_id
      AND d.status = 'active';
  ELSE
    INSERT INTO employee_notification_devices (
      employee_id, player_id, device_id, device_name, device_model,
      operating_system, browser, app_version, status, linked_at
    ) VALUES (
      v_employee_id,
      v_player_id,
      COALESCE(NULLIF(trim(p_device_id), ''), 'web'),
      p_device_name,
      p_device_model,
      p_operating_system,
      p_browser,
      p_app_version,
      'active',
      now()
    );
  END IF;

  UPDATE employee_notification_link_tickets AS t
  SET consumed_at = now()
  WHERE t.id = v_ticket.id;

  INSERT INTO notification_audit_log (action, actor_admin_id, target_employee_id, detail, result)
  VALUES (
    'claim_device',
    v_ticket.created_by_admin_id,
    v_employee_id,
    jsonb_build_object('player_id', v_player_id),
    'ok'
  );

  RETURN QUERY
  SELECT v_employee_id, v_player_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- refresh_notification_player_id — expected id REQUIRED (ownership proof)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_notification_player_id(
  p_employee_id TEXT,
  p_new_player_id TEXT,
  p_expected_player_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row employee_notification_devices%ROWTYPE;
BEGIN
  IF p_employee_id IS NULL OR trim(p_employee_id) = '' THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;
  IF p_new_player_id IS NULL OR trim(p_new_player_id) = '' THEN
    RAISE EXCEPTION 'new_player_id is required';
  END IF;
  IF p_expected_player_id IS NULL OR trim(p_expected_player_id) = '' THEN
    RAISE EXCEPTION 'expected_player_id is required';
  END IF;

  SELECT * INTO v_row
  FROM employee_notification_devices
  WHERE employee_id = trim(p_employee_id)
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Caller must prove they still own the active subscription (pre-rotation id).
  IF v_row.player_id <> trim(p_expected_player_id) THEN
    RAISE EXCEPTION 'player_id mismatch — device was replaced; re-pair required';
  END IF;

  IF v_row.player_id = trim(p_new_player_id) THEN
    UPDATE employee_notification_devices
    SET updated_at = now()
    WHERE id = v_row.id;
    RETURN TRUE;
  END IF;

  DELETE FROM employee_notification_devices
  WHERE player_id = trim(p_new_player_id)
    AND status <> 'active';

  IF EXISTS (
    SELECT 1 FROM employee_notification_devices
    WHERE player_id = trim(p_new_player_id)
      AND status = 'active'
      AND employee_id <> trim(p_employee_id)
  ) THEN
    RAISE EXCEPTION 'player_id already linked to another employee';
  END IF;

  UPDATE employee_notification_devices
  SET player_id = trim(p_new_player_id), updated_at = now()
  WHERE id = v_row.id;

  INSERT INTO notification_audit_log (action, target_employee_id, detail, result)
  VALUES (
    'refresh_player_id',
    trim(p_employee_id),
    jsonb_build_object(
      'from', v_row.player_id,
      'to', trim(p_new_player_id)
    ),
    'ok'
  );

  RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- issue_notification_link_ticket — one open ticket per employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_notification_link_ticket(
  p_employee_id TEXT,
  p_admin_id TEXT,
  p_ttl_minutes INT DEFAULT 15
)
RETURNS TABLE (token TEXT, employee_id TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_ttl INT;
BEGIN
  IF p_employee_id IS NULL OR trim(p_employee_id) = '' THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;
  IF p_admin_id IS NULL OR trim(p_admin_id) = '' THEN
    RAISE EXCEPTION 'admin_id is required';
  END IF;

  v_ttl := GREATEST(COALESCE(p_ttl_minutes, 15), 1);
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(mins => v_ttl);

  -- Invalidate any prior unused tickets for this employee (single live QR).
  UPDATE employee_notification_link_tickets AS t
  SET consumed_at = now()
  WHERE t.employee_id = trim(p_employee_id)
    AND t.consumed_at IS NULL;

  INSERT INTO employee_notification_link_tickets (
    employee_id, token, created_by_admin_id, expires_at
  ) VALUES (
    trim(p_employee_id), v_token, trim(p_admin_id), v_expires
  );

  INSERT INTO notification_audit_log (action, actor_admin_id, target_employee_id, detail, result)
  VALUES (
    'issue_link_ticket',
    trim(p_admin_id),
    trim(p_employee_id),
    jsonb_build_object('expires_at', v_expires),
    'ok'
  );

  RETURN QUERY SELECT v_token, trim(p_employee_id), v_expires;
END;
$$;

-- ---------------------------------------------------------------------------
-- mark_notification_device_invalid — cutover-safe invalidation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_device_invalid(
  p_player_id TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id TEXT;
BEGIN
  IF p_player_id IS NULL OR trim(p_player_id) = '' THEN
    RAISE EXCEPTION 'player_id is required';
  END IF;

  UPDATE employee_notification_devices AS d
  SET status = 'unlinked', updated_at = now()
  WHERE d.player_id = trim(p_player_id)
    AND d.status = 'active'
  RETURNING d.employee_id INTO v_employee_id;

  IF v_employee_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO notification_audit_log (action, target_employee_id, detail, result)
  VALUES (
    'mark_device_invalid',
    v_employee_id,
    jsonb_build_object(
      'player_id', trim(p_player_id),
      'reason', COALESCE(p_reason, 'invalid_subscription')
    ),
    'ok'
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_notification_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_notification_player_id(TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_notification_link_ticket(TEXT, TEXT, INT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_device_invalid(TEXT, TEXT)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
