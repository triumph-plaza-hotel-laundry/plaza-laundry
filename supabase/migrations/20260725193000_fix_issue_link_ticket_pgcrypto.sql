-- issue_notification_link_ticket used gen_random_bytes() with
-- search_path = public only. On Supabase, pgcrypto lives in extensions,
-- so the RPC failed at runtime (PostgREST surfaced it as 404).

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

NOTIFY pgrst, 'reload schema';
