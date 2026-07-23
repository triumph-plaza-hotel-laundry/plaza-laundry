-- Clear retained Laundry department employees/receipts only.
-- Keeps the Laundry department and the shared asset_items catalog.
-- Resets Laundry employee numbering so the next employee is #001.

DO $$
DECLARE
  laundry_id UUID;
BEGIN
  SELECT id
  INTO laundry_id
  FROM asset_departments
  WHERE name = 'Laundry'
  LIMIT 1;

  IF laundry_id IS NULL THEN
    RAISE NOTICE 'Laundry department not found; nothing to clear.';
    RETURN;
  END IF;

  -- Cascades to asset_receipts and asset_receipt_items for these employees.
  DELETE FROM asset_employees
  WHERE department_id = laundry_id;

  UPDATE asset_departments
  SET next_employee_seq = 1
  WHERE id = laundry_id;
END $$;
