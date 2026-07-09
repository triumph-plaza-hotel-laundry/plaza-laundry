-- Monthly read-only snapshots for Admin Inventory + Plan (one row per month).
CREATE TABLE IF NOT EXISTS inventory_monthly_archives (
  archive_month TEXT PRIMARY KEY CHECK (archive_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  inventory_data JSONB NOT NULL,
  plan_data JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_monthly_archives_archived_at
  ON inventory_monthly_archives (archived_at DESC);

ALTER TABLE inventory_monthly_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_monthly_archives_all ON inventory_monthly_archives;

CREATE POLICY inventory_monthly_archives_all ON inventory_monthly_archives
  FOR ALL USING (true) WITH CHECK (true);
