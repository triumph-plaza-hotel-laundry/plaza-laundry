-- Soft-hide flag for live Receiving / Issue history only.
-- Does not delete rows; monthly archive continues to read all transactions.

ALTER TABLE public.inventory_receipts
  ADD COLUMN IF NOT EXISTS hidden_from_live BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.inventory_issues
  ADD COLUMN IF NOT EXISTS hidden_from_live BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_receipts_hidden_from_live
  ON public.inventory_receipts (hidden_from_live);

CREATE INDEX IF NOT EXISTS idx_inventory_issues_hidden_from_live
  ON public.inventory_issues (hidden_from_live);
