-- Tighten push history write access without changing table schema or read behavior.
-- UI reads remain available for anon/authenticated clients.
-- Writes are handled by service role (Edge Functions).

REVOKE INSERT, UPDATE, DELETE ON public.push_notification_history
  FROM anon, authenticated;

GRANT SELECT ON public.push_notification_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_notification_history TO service_role;
