-- Add dedicated department column to inventory_issues.
-- Safe for existing rows: DEFAULT '' backfills all current records.
-- Does not modify reason or any other columns/data.

ALTER TABLE public.inventory_issues
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';
