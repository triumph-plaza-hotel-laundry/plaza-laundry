-- Dedicated department column for Under Execution.
-- Safe additive change: existing rows get department = ''.
-- Does not modify supplier, supplier_name, or any other existing data.

ALTER TABLE public.inventory_under_execution
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';

ALTER TABLE public.inventory_under_execution_history
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';
