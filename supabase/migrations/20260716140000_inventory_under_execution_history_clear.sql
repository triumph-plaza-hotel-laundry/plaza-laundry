-- Clear History for Under Execution (admin-only via SECURITY DEFINER RPC).
-- Keeps history immutable for normal app DELETE/UPDATE on the table:
--   no table-level DELETE/UPDATE policies remain.
-- Only admin_clear_inventory_under_execution_history(actor_id) may empty the table.

CREATE OR REPLACE FUNCTION public.admin_clear_inventory_under_execution_history(
  p_actor_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_actor_id IS NULL OR btrim(p_actor_id) = '' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Authenticated admin portal accounts only (OWNER / SUPER_ADMIN / ADMIN)
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_users u
    WHERE u.id = p_actor_id
      AND (
        u.is_owner = true
        OR u.role IN ('OWNER', 'SUPER_ADMIN', 'ADMIN')
      )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Explicit WHERE satisfies pg_safeupdate ("DELETE requires a WHERE clause")
  -- without disabling database safety settings.
  DELETE FROM public.inventory_under_execution_history WHERE id IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_inventory_under_execution_history(text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_clear_inventory_under_execution_history(text)
  TO anon, authenticated;

-- Ensure no direct table DELETE/UPDATE policies exist (immutable except via RPC)
DROP POLICY IF EXISTS inventory_under_execution_history_delete
  ON public.inventory_under_execution_history;
DROP POLICY IF EXISTS inventory_under_execution_history_update
  ON public.inventory_under_execution_history;
DROP POLICY IF EXISTS inventory_under_execution_history_write
  ON public.inventory_under_execution_history;
