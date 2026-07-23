-- Manual twin: allow permanent delete of Shift Notifications history from admin UI.
-- Does not affect any other log tables.

GRANT DELETE ON public.push_notification_history TO anon, authenticated;
