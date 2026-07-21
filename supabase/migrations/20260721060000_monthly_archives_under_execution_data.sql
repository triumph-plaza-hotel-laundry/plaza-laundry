-- Monthly Under Execution snapshot column for Admin Inventory archives.
-- Additive only: existing archive rows get an empty default payload.
-- Does not modify inventory_data, plan_data, or any live operational tables.

ALTER TABLE public.inventory_monthly_archives
  ADD COLUMN IF NOT EXISTS under_execution_data JSONB NOT NULL DEFAULT '{"records":[],"history":[],"capturedAt":""}'::jsonb;
