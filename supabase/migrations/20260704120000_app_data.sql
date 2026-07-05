-- Shared application documents (catalogs, settings, schedules, etc.)
CREATE TABLE IF NOT EXISTS app_data_documents (
  document_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_data_documents_updated_at
  ON app_data_documents (updated_at DESC);

-- Admin accounts (shared across devices)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  admin_type TEXT,
  password_hash TEXT NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_username_unique UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username_lower
  ON admin_users (lower(username));

-- Shared audit trail
CREATE TABLE IF NOT EXISTS audit_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  page TEXT NOT NULL,
  old_value TEXT NOT NULL DEFAULT '',
  new_value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entries_created_at
  ON audit_log_entries (created_at DESC);

ALTER TABLE app_data_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_data_documents_all ON app_data_documents;
DROP POLICY IF EXISTS admin_users_all ON admin_users;
DROP POLICY IF EXISTS audit_log_entries_all ON audit_log_entries;

CREATE POLICY app_data_documents_all ON app_data_documents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY admin_users_all ON admin_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY audit_log_entries_all ON audit_log_entries
  FOR ALL USING (true) WITH CHECK (true);
