-- Enable server-side scheduler primitives for shift-reminder.
-- NOTE: supabase/config.toml [functions.shift-reminder.schedule] does NOT
-- register a live job by itself. Hosted scheduling requires pg_cron + pg_net
-- (this migration) and a Vault-backed invoke (see setup script).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: POST mode=cron to shift-reminder using Vault secrets.
-- Required vault secrets (scripts/setup-shift-reminder-cron.mjs):
--   project_url
--   service_role_key
-- Optional:
--   shift_reminder_cron_secret  (must match Edge SHIFT_REMINDER_CRON_SECRET)

CREATE OR REPLACE FUNCTION public.invoke_shift_reminder_cron()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_cron_secret text;
  v_headers jsonb;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'shift_reminder_cron_secret'
  LIMIT 1;

  IF v_url IS NULL OR length(trim(v_url)) = 0 THEN
    RAISE EXCEPTION 'vault secret project_url is missing — run scripts/setup-shift-reminder-cron.mjs';
  END IF;
  IF v_service_key IS NULL OR length(trim(v_service_key)) = 0 THEN
    RAISE EXCEPTION 'vault secret service_role_key is missing — run scripts/setup-shift-reminder-cron.mjs';
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key,
    'apikey', v_service_key
  );

  IF v_cron_secret IS NOT NULL AND length(trim(v_cron_secret)) > 0 THEN
    v_headers := v_headers || jsonb_build_object('x-cron-secret', v_cron_secret);
  END IF;

  SELECT net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/shift-reminder',
    headers := v_headers,
    body := jsonb_build_object('mode', 'cron'),
    timeout_milliseconds := 55000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_shift_reminder_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_shift_reminder_cron() TO postgres;
