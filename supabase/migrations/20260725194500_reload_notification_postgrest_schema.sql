-- Legacy employee_device_pairing_sessions was dropped by notification_system_v1.
-- Pairing now uses employee_notification_link_tickets + claim_notification_device.
-- Ensure PostgREST exposes the new objects (fixes stale schema-cache 404s).

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_notification_link_tickets
  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_notification_devices
  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_inbox_notifications
  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_system_settings
  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_audit_log
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.issue_notification_link_ticket(TEXT, TEXT, INT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlink_notification_device(TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_notification_link_tickets()
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_notification_player_id(TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_inbox_notification_read(UUID, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_inbox_notification(UUID, TEXT)
  TO anon, authenticated, service_role;

-- Drop leftover legacy RPCs that still referenced removed tables (if present).
DROP FUNCTION IF EXISTS public.notification_db_guardian_cleanup(INTEGER);
DROP FUNCTION IF EXISTS public.notification_db_guardian_cleanup();
DROP FUNCTION IF EXISTS public.pair_employee_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.pair_employee_device(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

NOTIFY pgrst, 'reload schema';
