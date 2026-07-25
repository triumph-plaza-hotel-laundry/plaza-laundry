-- Fix PL/pgSQL ambiguity: RETURNS TABLE (employee_id, player_id) makes those
-- names OUT variables that clash with unqualified table columns in WHERE/SELECT.

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

  -- Same player claimed for another employee → unlink prior owner
  UPDATE employee_notification_devices AS d
  SET status = 'unlinked', updated_at = now()
  WHERE d.player_id = v_player_id
    AND d.status = 'active'
    AND d.employee_id <> v_employee_id;

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
      updated_at = now()
    WHERE d.employee_id = v_employee_id
      AND d.status = 'active';
  ELSE
    INSERT INTO employee_notification_devices (
      employee_id, player_id, device_id, device_name, device_model,
      operating_system, browser, app_version, status
    ) VALUES (
      v_employee_id,
      v_player_id,
      COALESCE(NULLIF(trim(p_device_id), ''), 'web'),
      p_device_name,
      p_device_model,
      p_operating_system,
      p_browser,
      p_app_version,
      'active'
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

GRANT EXECUTE ON FUNCTION public.claim_notification_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
