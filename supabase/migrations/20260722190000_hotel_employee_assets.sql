-- Hotel Employee Assets (عهدة موظفي الفندق)
-- Completely isolated. Does not alter existing business tables.

CREATE TABLE IF NOT EXISTS asset_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  next_employee_seq INTEGER NOT NULL DEFAULT 1 CHECK (next_employee_seq >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_items_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS asset_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES asset_departments (id) ON DELETE CASCADE,
  employee_number INTEGER NOT NULL CHECK (employee_number >= 1),
  employee_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_employees_dept_number_unique UNIQUE (department_id, employee_number)
);

CREATE INDEX IF NOT EXISTS idx_asset_employees_department_id
  ON asset_employees (department_id);

CREATE TABLE IF NOT EXISTS asset_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES asset_employees (id) ON DELETE CASCADE,
  receipt_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_receipts_employee_id
  ON asset_receipts (employee_id);

CREATE INDEX IF NOT EXISTS idx_asset_receipts_receipt_date
  ON asset_receipts (receipt_date DESC);

CREATE TABLE IF NOT EXISTS asset_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES asset_receipts (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES asset_items (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_asset_receipt_items_receipt_id
  ON asset_receipt_items (receipt_id);

ALTER TABLE asset_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_departments_all ON asset_departments;
DROP POLICY IF EXISTS asset_items_all ON asset_items;
DROP POLICY IF EXISTS asset_employees_all ON asset_employees;
DROP POLICY IF EXISTS asset_receipts_all ON asset_receipts;
DROP POLICY IF EXISTS asset_receipt_items_all ON asset_receipt_items;

CREATE POLICY asset_departments_all ON asset_departments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY asset_items_all ON asset_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY asset_employees_all ON asset_employees
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY asset_receipts_all ON asset_receipts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY asset_receipt_items_all ON asset_receipt_items
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  asset_departments, asset_items, asset_employees, asset_receipts, asset_receipt_items
  TO anon, authenticated, service_role;

-- Atomic per-department employee number allocation (never reused on delete).
CREATE OR REPLACE FUNCTION allocate_asset_employee_number(p_department_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_number INTEGER;
BEGIN
  UPDATE asset_departments
  SET next_employee_seq = next_employee_seq + 1
  WHERE id = p_department_id
  RETURNING next_employee_seq - 1 INTO v_number;

  IF v_number IS NULL THEN
    RAISE EXCEPTION 'asset department not found';
  END IF;

  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION allocate_asset_employee_number(UUID) TO anon, authenticated, service_role;

-- One-time seed: department names (independent thereafter).
INSERT INTO asset_departments (name)
SELECT d.name
FROM (
  VALUES
    ('Directors'),
    ('Front Offices'),
    ('Personnel Affairs'),
    ('Information Technology'),
    ('Audio Engineering'),
    ('Sales'),
    ('Public Relations'),
    ('Drivers & Secretariat'),
    ('Accounts'),
    ('Food & Beverage & Banquets'),
    ('Security'),
    ('Housekeeping'),
    ('Kitchen'),
    ('Laundry'),
    ('Stewarding'),
    ('Maintenance'),
    ('Purchasing'),
    ('Gym')
) AS d(name)
WHERE NOT EXISTS (SELECT 1 FROM asset_departments LIMIT 1);

-- One-time seed: asset item names (independent thereafter).
INSERT INTO asset_items (name)
SELECT i.name
FROM (
  VALUES
    ('Black Suit'),
    ('Navy Suit'),
    ('Grey Suit'),
    ('Women''s Suit'),
    ('Balman Suit'),
    ('White Shirt'),
    ('Beige Shirt'),
    ('Striped Shirt'),
    ('Half Collar Shirt'),
    ('Blouse'),
    ('Navy Tie'),
    ('Black Tie'),
    ('Wine Tie'),
    ('Grey Tie'),
    ('Black Pants'),
    ('Navy Pants'),
    ('White Pants'),
    ('Women''s Pants'),
    ('Wine T-Shirt (Long Sleeve)'),
    ('Wine T-Shirt (Short Sleeve)'),
    ('Navy T-Shirt (Long Sleeve)'),
    ('Navy T-Shirt (Short Sleeve)'),
    ('Grey T-Shirt (Long Sleeve)'),
    ('Grey T-Shirt (Short Sleeve)'),
    ('Black T-Shirt (Long Sleeve)'),
    ('Black T-Shirt (Short Sleeve)'),
    ('White T-Shirt (Long Sleeve)'),
    ('White T-Shirt (Short Sleeve)'),
    ('Cold Room Jacket'),
    ('Navy Jacket'),
    ('Black Jacket'),
    ('White Kitchen Jacket'),
    ('Black Kitchen Jacket'),
    ('Grey Kitchen Jacket'),
    ('White Apron'),
    ('Black Apron'),
    ('Beige Apron'),
    ('Tan Apron'),
    ('Men''s HK Kit'),
    ('Women''s HK Kit'),
    ('Head Cover'),
    ('Black Coat'),
    ('Navy Coat'),
    ('Men''s Supervision Kit'),
    ('Women''s Supervision Kit'),
    ('Men''s Workers Kit'),
    ('Women''s Workers Kit'),
    ('Black Sports Tracksuit'),
    ('Navy Sports Tracksuit'),
    ('Grey Sports Tracksuit'),
    ('Black Sports T-Shirt'),
    ('White Sports T-Shirt'),
    ('Navy Sports T-Shirt'),
    ('Grey Sports T-Shirt'),
    ('Wine Sports T-Shirt'),
    ('Black Sports Pants'),
    ('Navy Sports Pants'),
    ('Grey Sports Pants'),
    ('Black Sports Shorts'),
    ('Navy Sports Shorts'),
    ('Grey Sports Shorts')
) AS i(name)
WHERE NOT EXISTS (SELECT 1 FROM asset_items LIMIT 1);

NOTIFY pgrst, 'reload schema';
