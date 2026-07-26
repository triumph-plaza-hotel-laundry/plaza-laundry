-- Permanent laundry Employee IDs (EMP-0001…).
-- Remaps legacy role-prefixed ids across notification / admin tables and
-- JSON documents. Deletes must never renumber; this only rewrites keys once.

BEGIN;

CREATE TEMP TABLE tmp_emp_id_map (
  legacy_id text PRIMARY KEY,
  permanent_id text NOT NULL UNIQUE
);

INSERT INTO tmp_emp_id_map (legacy_id, permanent_id) VALUES
  ('gm-01', 'EMP-0001'),
  ('dm-01', 'EMP-0002'),
  ('ws-01', 'EMP-0003'),
  ('dm-02', 'EMP-0004'),
  ('dm-03', 'EMP-0005'),
  ('wts-01', 'EMP-0006'),
  ('tl-01', 'EMP-0007'),
  ('wts-02', 'EMP-0008'),
  ('wts-03', 'EMP-0009'),
  ('ws-02', 'EMP-0010'),
  ('lw-06', 'EMP-0011'),
  ('lw-01', 'EMP-0012'),
  ('lw-02', 'EMP-0013'),
  ('lw-03', 'EMP-0014'),
  ('lw-04', 'EMP-0015'),
  ('lw-05', 'EMP-0016'),
  ('lw-07', 'EMP-0017'),
  ('lw-08', 'EMP-0018'),
  ('lw-09', 'EMP-0019'),
  ('lw-10', 'EMP-0020');

-- ---------------------------------------------------------------------------
-- Helper: rewrite a text column via map (skip if already permanent / unknown)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.remap_emp_id(p_id text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT permanent_id FROM tmp_emp_id_map WHERE legacy_id = p_id),
    p_id
  );
$$;

-- employee_notification_devices
UPDATE employee_notification_devices AS d
SET employee_id = pg_temp.remap_emp_id(d.employee_id)
WHERE EXISTS (SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = d.employee_id);

-- link tickets
UPDATE employee_notification_link_tickets AS t
SET employee_id = pg_temp.remap_emp_id(t.employee_id)
WHERE EXISTS (SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = t.employee_id);

-- inbox
UPDATE employee_inbox_notifications AS i
SET employee_id = pg_temp.remap_emp_id(i.employee_id)
WHERE EXISTS (SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = i.employee_id);

-- push history
UPDATE push_notification_history AS h
SET laundry_employee_id = pg_temp.remap_emp_id(h.laundry_employee_id)
WHERE h.laundry_employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = h.laundry_employee_id
  );

-- admin users optional link
UPDATE admin_users AS a
SET laundry_employee_id = pg_temp.remap_emp_id(a.laundry_employee_id)
WHERE a.laundry_employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = a.laundry_employee_id
  );

-- audit / diagnostics (if present)
DO $$
BEGIN
  IF to_regclass('public.notification_audit_log') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE notification_audit_log AS a
      SET target_employee_id = pg_temp.remap_emp_id(a.target_employee_id)
      WHERE a.target_employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = a.target_employee_id
        )
    $q$;
  END IF;

  IF to_regclass('public.notification_diagnostics_history') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE notification_diagnostics_history AS d
      SET target_employee_id = pg_temp.remap_emp_id(d.target_employee_id)
      WHERE d.target_employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = d.target_employee_id
        )
    $q$;
  END IF;

  IF to_regclass('public.notification_platform_events') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE notification_platform_events AS e
      SET laundry_employee_id = pg_temp.remap_emp_id(e.laundry_employee_id)
      WHERE e.laundry_employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = e.laundry_employee_id
        )
    $q$;
  END IF;

  IF to_regclass('public.onesignal_subscriptions') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE onesignal_subscriptions AS s
      SET laundry_employee_id = pg_temp.remap_emp_id(s.laundry_employee_id)
      WHERE s.laundry_employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = s.laundry_employee_id
        )
    $q$;
  END IF;

  IF to_regclass('public.employee_linked_devices') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE employee_linked_devices AS d
      SET laundry_employee_id = pg_temp.remap_emp_id(d.laundry_employee_id)
      WHERE d.laundry_employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tmp_emp_id_map m WHERE m.legacy_id = d.laundry_employee_id
        )
    $q$;
  END IF;
END $$;

-- Persist next sequence so future allocates continue at EMP-0021+
INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'laundry_employee_id_next',
  '21',
  now()
)
ON CONFLICT (key) DO UPDATE
SET
  value = CASE
    WHEN COALESCE(NULLIF(trim(app_settings.value), '')::int, 0) >= 21
      THEN app_settings.value
    ELSE '21'
  END,
  updated_at = now();

-- Note: app_data_documents (tpl-employees-v1 / tpl-shifts / tpl-leaves)
-- are remapped by the client normalize/migrate path on next hydrate+flush.
-- Edge shift-reminder manager checks now use EMP-0001 / EMP-0002.

COMMIT;
