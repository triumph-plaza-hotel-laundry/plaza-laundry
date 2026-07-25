-- Safe single-device subscription rotation: only updates the active row for
-- this employee when p_old_player_id matches. Never touches other employees.

CREATE OR REPLACE FUNCTION public.rotate_notification_device_subscription(
  p_employee_id TEXT,
  p_old_player_id TEXT,
  p_new_player_id TEXT,
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
  v_employee_id TEXT;
  v_old_player_id TEXT;
  v_new_player_id TEXT;
  v_row employee_notification_devices%ROWTYPE;
BEGIN
  v_employee_id := trim(COALESCE(p_employee_id, ''));
  v_old_player_id := trim(COALESCE(p_old_player_id, ''));
  v_new_player_id := trim(COALESCE(p_new_player_id, ''));

  IF v_employee_id = '' THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;
  IF v_old_player_id = '' THEN
    RAISE EXCEPTION 'old_player_id is required';
  END IF;
  IF v_new_player_id = '' THEN
    RAISE EXCEPTION 'new_player_id is required';
  END IF;
  IF v_old_player_id = v_new_player_id THEN
    RAISE EXCEPTION 'new_player_id must differ from old_player_id';
  END IF;

  SELECT * INTO v_row
  FROM employee_notification_devices AS d
  WHERE d.employee_id = v_employee_id
    AND d.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee is not linked';
  END IF;

  -- Only the phone that currently owns this employee link may rotate.
  IF v_row.player_id <> v_old_player_id THEN
    RAISE EXCEPTION 'old_player_id does not match this employee''s active device';
  END IF;

  -- Refuse if the new subscription is already active for someone else.
  IF EXISTS (
    SELECT 1
    FROM employee_notification_devices AS d
    WHERE d.player_id = v_new_player_id
      AND d.status = 'active'
      AND d.employee_id <> v_employee_id
  ) THEN
    RAISE EXCEPTION 'new_player_id is already linked to another employee';
  END IF;

  -- Drop inactive rows holding the new player_id so UNIQUE(player_id) allows update.
  DELETE FROM employee_notification_devices AS d
  WHERE d.player_id = v_new_player_id
    AND d.status <> 'active';

  UPDATE employee_notification_devices AS d
  SET
    player_id = v_new_player_id,
    device_id = COALESCE(NULLIF(trim(p_device_id), ''), d.device_id, 'web'),
    device_name = COALESCE(p_device_name, d.device_name),
    device_model = COALESCE(p_device_model, d.device_model),
    operating_system = COALESCE(p_operating_system, d.operating_system),
    browser = COALESCE(p_browser, d.browser),
    app_version = COALESCE(p_app_version, d.app_version),
    updated_at = now()
  WHERE d.id = v_row.id;

  INSERT INTO notification_audit_log (action, target_employee_id, detail, result)
  VALUES (
    'rotate_device_subscription',
    v_employee_id,
    jsonb_build_object(
      'from', v_old_player_id,
      'to', v_new_player_id
    ),
    'ok'
  );

  RETURN QUERY
  SELECT v_employee_id, v_new_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_notification_device_subscription(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
