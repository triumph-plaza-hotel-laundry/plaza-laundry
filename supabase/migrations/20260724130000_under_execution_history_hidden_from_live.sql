-- Soft-hide for live Under Execution History only.
-- Rows stay in place for monthly archive capture; archive ignores this flag.

ALTER TABLE public.inventory_under_execution_history
  ADD COLUMN IF NOT EXISTS hidden_from_live BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_under_execution_history_hidden_from_live
  ON public.inventory_under_execution_history (hidden_from_live);
