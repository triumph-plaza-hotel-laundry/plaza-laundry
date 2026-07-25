-- Final notification requirements:
-- 1) Clean cutover — empty devices (no legacy data)
-- 2) Player ID refresh updates existing row only
-- 3) In-app bell inbox (server source of truth)
-- 4) Duplicate protection

-- Wipe any previously migrated / test links (intentional re-pair for all).
TRUNCATE TABLE employee_notification_devices RESTART IDENTITY CASCADE;
TRUNCATE TABLE employee_notification_link_tickets RESTART IDENTITY CASCADE;

INSERT INTO notification_system_settings (key, value) VALUES
  ('bell_retention_days', '30'),
  ('allow_auto_player_id_refresh', 'true')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- In-app notification bell (survives dismissing the OS notification)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('sent', 'failed', 'skipped', 'pending')),
  source TEXT NOT NULL DEFAULT 'push',
  history_id UUID,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT employee_inbox_notifications_dedupe UNIQUE (employee_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS employee_inbox_notifications_employee_created
  ON employee_inbox_notifications (employee_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE employee_inbox_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_inbox_notifications_all ON employee_inbox_notifications;
CREATE POLICY employee_inbox_notifications_all ON employee_inbox_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Refresh Player ID on the SAME active link only (never create / never re-pair)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_notification_player_id(
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

  SELECT * INTO v_row
  FROM employee_notification_devices
  WHERE employee_id = trim(p_employee_id)
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_expected_player_id IS NOT NULL
     AND trim(p_expected_player_id) <> ''
     AND v_row.player_id <> trim(p_expected_player_id) THEN
    RAISE EXCEPTION 'player_id mismatch — unlink and re-pair required';
  END IF;

  IF v_row.player_id = trim(p_new_player_id) THEN
    UPDATE employee_notification_devices
    SET updated_at = now()
    WHERE id = v_row.id;
    RETURN TRUE;
  END IF;

  -- Drop inactive rows holding the new player_id so UNIQUE(player_id) allows update.
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

-- Soft-delete / mark read helpers
CREATE OR REPLACE FUNCTION mark_inbox_notification_read(
  p_id UUID,
  p_employee_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employee_inbox_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_id
    AND employee_id = trim(p_employee_id)
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION delete_inbox_notification(
  p_id UUID,
  p_employee_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employee_inbox_notifications
  SET deleted_at = now()
  WHERE id = p_id
    AND employee_id = trim(p_employee_id)
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Cron-sent history dedupe (prevents duplicate push history rows)
CREATE UNIQUE INDEX IF NOT EXISTS push_notification_history_cron_dedupe
  ON push_notification_history (
    type,
    target_date,
    laundry_employee_id,
    onesignal_player_id,
    triggered_by
  )
  WHERE status = 'sent' AND triggered_by = 'cron';
