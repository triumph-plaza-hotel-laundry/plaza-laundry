-- Allow Owner Shift Notifications UI to permanently delete ONLY
-- push_notification_history rows (notification log). Inserts/updates
-- remain service-role only so Edge Function delivery is unchanged.

GRANT DELETE ON public.push_notification_history TO anon, authenticated;

COMMENT ON TABLE public.push_notification_history IS
  'Shift notification send log. Client may DELETE (admin UI); INSERT/UPDATE via service role.';
