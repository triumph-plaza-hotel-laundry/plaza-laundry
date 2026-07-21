-- Allow updating the matching Under Execution history snapshot when an
-- active record is edited. Does not change existing data.
-- Clear-history remains via admin_clear_inventory_under_execution_history only
-- (no DELETE policy added here).

DROP POLICY IF EXISTS inventory_under_execution_history_update
  ON public.inventory_under_execution_history;

CREATE POLICY inventory_under_execution_history_update
  ON public.inventory_under_execution_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
