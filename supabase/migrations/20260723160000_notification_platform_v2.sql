-- Notification Platform V2: events, delivery attempts, health columns,
-- atomic pairing + subscription rotation RPCs, DB guardian cleanup.
-- Fully additive and backward compatible with existing push/pairing tables.

-- ---------------------------------------------------------------------------
-- 1A. Schema additions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  laundry_employee_id TEXT,
  onesignal_player_id TEXT,
  device_label TEXT,
  payload JSONB,
  recovery_action TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  final_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_platform_events_created
  ON notification_platform_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_platform_events_category
  ON notification_platform_events (category, created_at DESC);

ALTER TABLE notification_platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_platform_events_all ON notification_platform_events;
CREATE POLICY notification_platform_events_all ON notification_platform_events
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON public.notification_platform_events TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id UUID REFERENCES push_notification_history (id) ON DELETE SET NULL,
  onesignal_player_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  http_status INTEGER,
  recipients INTEGER,
  onesignal_notification_id TEXT,
  response_body JSONB,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  recovery_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_history
  ON notification_delivery_attempts (history_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_player
  ON notification_delivery_attempts (onesignal_player_id, created_at DESC);

ALTER TABLE notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_delivery_attempts_all ON notification_delivery_attempts;
CREATE POLICY notification_delivery_attempts_all ON notification_delivery_attempts
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.notification_delivery_attempts TO anon, authenticated, service_role;

ALTER TABLE employee_linked_devices
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employee_linked_devices_subscription_status_check'
  ) THEN
    ALTER TABLE employee_linked_devices
      ADD CONSTRAINT employee_linked_devices_subscription_status_check
      CHECK (subscription_status IN ('active', 'invalid', 'unknown'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_linked_devices_subscription_status
  ON employee_linked_devices (subscription_status);

ALTER TABLE onesignal_subscriptions
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_valid BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_is_valid
  ON onesignal_subscriptions (is_valid);

-- Allow controlled subscription heal on primary admin device via RPC only.
ALTER TABLE primary_admin_device
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP POLICY IF EXISTS primary_admin_device_update_subscription ON primary_admin_device;
-- No open UPDATE for clients; SECURITY DEFINER RPCs bypass RLS.

-- ---------------------------------------------------------------------------
-- 1B. Atomic pairing RPC
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 1C. Subscription rotation RPC
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

  IF p_old_id IS NOT NULL AND length(trim(p_old_id)) > 0 THEN
    -- Prefer rewriting the active row for old_id. If new_id already exists,
    -- mark old as replaced and refresh the new_id row.
    IF EXISTS (
      SELECT 1 FROM employee_linked_devices
      WHERE onesignal_player_id = p_new_id
    ) THEN
      UPDATE employee_linked_devices
      SET status = 'replaced',
          replaced_at = v_now,
          updated_at = v_now
      WHERE onesignal_player_id = p_old_id
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
      WHERE onesignal_player_id = p_old_id
        AND status = 'active';
      GET DIAGNOSTICS v_linked_updated = ROW_COUNT;
    END IF;

    UPDATE employee_device_pairing_sessions
    SET onesignal_player_id = p_new_id
    WHERE onesignal_player_id = p_old_id
      AND status = 'pending';

    -- Move subscription row: delete old after upserting new.
    SELECT employee_id, laundry_employee_id
    INTO v_employee_id, v_laundry_id
    FROM onesignal_subscriptions
    WHERE onesignal_player_id = p_old_id
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

      DELETE FROM onesignal_subscriptions
      WHERE onesignal_player_id = p_old_id;
    END IF;

    IF p_primary_admin_device_id IS NOT NULL
       AND length(trim(p_primary_admin_device_id)) > 0 THEN
      UPDATE primary_admin_device
      SET onesignal_subscription_id = p_new_id,
          updated_at = v_now
      WHERE device_id = p_primary_admin_device_id
        AND onesignal_subscription_id = p_old_id;
      GET DIAGNOSTICS v_primary_updated = ROW_COUNT;

      -- Also heal if primary row matches device but old id already drifted.
      IF v_primary_updated = 0 THEN
        UPDATE primary_admin_device
        SET onesignal_subscription_id = p_new_id,
            updated_at = v_now
        WHERE device_id = p_primary_admin_device_id;
        GET DIAGNOSTICS v_primary_updated = ROW_COUNT;
      END IF;
    END IF;
  ELSE
    -- No old id: ensure new id is upserted when we have an admin employee id.
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
    'old_id', p_old_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_onesignal_subscription_rotation(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1D. Database guardian cleanup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notification_db_guardian_cleanup(
  p_event_retention_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_expired_sessions INTEGER := 0;
  v_dup_replaced INTEGER := 0;
  v_events_deleted INTEGER := 0;
  v_invalidated_subs INTEGER := 0;
  v_employee TEXT;
  v_keep_id UUID;
BEGIN
  UPDATE employee_device_pairing_sessions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < v_now;
  GET DIAGNOSTICS v_expired_sessions = ROW_COUNT;

  -- For each laundry employee with multiple active devices, keep newest.
  FOR v_employee IN
    SELECT laundry_employee_id
    FROM employee_linked_devices
    WHERE status = 'active'
    GROUP BY laundry_employee_id
    HAVING count(*) > 1
  LOOP
    SELECT id INTO v_keep_id
    FROM employee_linked_devices
    WHERE laundry_employee_id = v_employee
      AND status = 'active'
    ORDER BY paired_at DESC
    LIMIT 1;

    UPDATE employee_linked_devices
    SET status = 'replaced',
        replaced_at = v_now,
        updated_at = v_now
    WHERE laundry_employee_id = v_employee
      AND status = 'active'
      AND id <> v_keep_id;

    v_dup_replaced := v_dup_replaced + 1;
  END LOOP;

  -- Soft-invalidate subscription rows marked invalid already stay;
  -- mark orphaned invalid only when explicitly flagged by delivery.

  DELETE FROM notification_platform_events
  WHERE created_at < (v_now - make_interval(days => GREATEST(p_event_retention_days, 1)));
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'expired_sessions', v_expired_sessions,
    'employees_deduped', v_dup_replaced,
    'events_deleted', v_events_deleted,
    'invalidated_subs', v_invalidated_subs,
    'ran_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION notification_db_guardian_cleanup(INTEGER)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION mark_onesignal_subscription_invalid(
  p_player_id TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_player_id IS NULL OR length(trim(p_player_id)) = 0 THEN
    RETURN;
  END IF;

  UPDATE onesignal_subscriptions
  SET is_valid = false,
      updated_at = now()
  WHERE onesignal_player_id = p_player_id;

  UPDATE employee_linked_devices
  SET subscription_status = 'invalid',
      updated_at = now()
  WHERE onesignal_player_id = p_player_id
    AND status = 'active';

  INSERT INTO notification_platform_events (
    category, severity, message, onesignal_player_id, recovery_action, final_status
  )
  VALUES (
    'delivery',
    'warning',
    COALESCE(p_reason, 'Subscription marked invalid'),
    p_player_id,
    'mark_invalid',
    'invalid'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION mark_onesignal_subscription_invalid(TEXT, TEXT)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
