-- Notification System v1 (from scratch).
-- One active device + one player_id per employee_id.
-- No subscription pools, no heal/rotation RPCs, no employee name columns.

-- ---------------------------------------------------------------------------
-- New core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_notification_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT 'web',
  device_name TEXT,
  device_model TEXT,
  operating_system TEXT,
  browser TEXT,
  app_version TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unlinked')),
  CONSTRAINT employee_notification_devices_player_unique UNIQUE (player_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_notification_devices_one_active
  ON employee_notification_devices (employee_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS employee_notification_devices_employee
  ON employee_notification_devices (employee_id);

CREATE INDEX IF NOT EXISTS employee_notification_devices_status
  ON employee_notification_devices (status);

ALTER TABLE employee_notification_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_notification_devices_all ON employee_notification_devices;
CREATE POLICY employee_notification_devices_all ON employee_notification_devices
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS employee_notification_link_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_by_admin_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_notification_link_tickets_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS employee_notification_link_tickets_employee
  ON employee_notification_link_tickets (employee_id);

CREATE INDEX IF NOT EXISTS employee_notification_link_tickets_expires
  ON employee_notification_link_tickets (expires_at);

ALTER TABLE employee_notification_link_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_notification_link_tickets_all
  ON employee_notification_link_tickets;
CREATE POLICY employee_notification_link_tickets_all
  ON employee_notification_link_tickets
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Settings / audit / diagnostics history / health snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_admin_id TEXT
);

ALTER TABLE notification_system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_system_settings_all ON notification_system_settings;
CREATE POLICY notification_system_settings_all ON notification_system_settings
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO notification_system_settings (key, value) VALUES
  ('qr_ticket_ttl_minutes', '15'),
  ('health_probe_interval_minutes', '15'),
  ('max_hours_since_last_send_warning', '48'),
  ('audit_retention_days', '90'),
  ('diagnostics_history_retention_days', '90'),
  ('health_snapshot_retention_days', '30'),
  ('probe_onesignal_enabled', 'true'),
  ('probe_edge_enabled', 'true'),
  ('probe_scheduled_jobs_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_admin_id TEXT,
  target_employee_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  result TEXT NOT NULL DEFAULT 'ok'
    CHECK (result IN ('ok', 'error', 'denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_audit_log_created
  ON notification_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS notification_audit_log_employee
  ON notification_audit_log (target_employee_id);
CREATE INDEX IF NOT EXISTS notification_audit_log_action
  ON notification_audit_log (action);

ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_audit_log_all ON notification_audit_log;
CREATE POLICY notification_audit_log_all ON notification_audit_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS notification_diagnostics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('healthy', 'warning', 'critical', 'info')),
  issue_code TEXT NOT NULL,
  message TEXT NOT NULL,
  target_employee_id TEXT,
  action_taken TEXT,
  verification_result TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_diagnostics_history_created
  ON notification_diagnostics_history (created_at DESC);
CREATE INDEX IF NOT EXISTS notification_diagnostics_history_component
  ON notification_diagnostics_history (component);

ALTER TABLE notification_diagnostics_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_diagnostics_history_all
  ON notification_diagnostics_history;
CREATE POLICY notification_diagnostics_history_all
  ON notification_diagnostics_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS notification_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  message TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_health_snapshots_checked
  ON notification_health_snapshots (checked_at DESC);
CREATE INDEX IF NOT EXISTS notification_health_snapshots_component
  ON notification_health_snapshots (component, checked_at DESC);

ALTER TABLE notification_health_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_health_snapshots_all
  ON notification_health_snapshots;
CREATE POLICY notification_health_snapshots_all
  ON notification_health_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Clean cutover: NO legacy migration (intentional empty start).
-- All employees must pair again via Admin QR after deployment.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION issue_notification_link_ticket(
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
  -- pgcrypto lives in extensions on Supabase (not public)
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(mins => v_ttl);

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

CREATE OR REPLACE FUNCTION claim_notification_device(
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

CREATE OR REPLACE FUNCTION unlink_notification_device(
  p_employee_id TEXT,
  p_admin_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_employee_id IS NULL OR trim(p_employee_id) = '' THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;

  UPDATE employee_notification_devices
  SET status = 'unlinked', updated_at = now()
  WHERE employee_id = trim(p_employee_id)
    AND status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO notification_audit_log (action, actor_admin_id, target_employee_id, detail, result)
  VALUES (
    'unlink_device',
    NULLIF(trim(COALESCE(p_admin_id, '')), ''),
    trim(p_employee_id),
    jsonb_build_object('rows', v_count),
    'ok'
  );

  RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION expire_stale_notification_link_tickets()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM employee_notification_link_tickets
  WHERE consumed_at IS NULL
    AND expires_at < now() - interval '1 day';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Drop legacy notification identity stack
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS pair_employee_device(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);
DROP FUNCTION IF EXISTS pair_employee_device(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);
DROP FUNCTION IF EXISTS sync_onesignal_subscription_rotation(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS sync_onesignal_subscription_rotation(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS notification_db_guardian_cleanup();

DROP TABLE IF EXISTS employee_device_pairing_sessions CASCADE;
DROP TABLE IF EXISTS employee_linked_devices CASCADE;
DROP TABLE IF EXISTS onesignal_subscriptions CASCADE;
DROP TABLE IF EXISTS primary_admin_device CASCADE;

-- Realtime for new device table (admin hub refresh)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'employee_notification_devices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_notification_devices;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.issue_notification_link_ticket(TEXT, TEXT, INT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlink_notification_device(TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_notification_link_tickets()
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
