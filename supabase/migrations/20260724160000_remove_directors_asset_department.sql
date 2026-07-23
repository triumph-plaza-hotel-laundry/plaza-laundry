-- Remove the Directors (الإدارة) department and all of its employees/receipts.
-- Cascades via asset_employees → asset_receipts → asset_receipt_items.
-- Does not change schema or other departments.

DELETE FROM asset_departments
WHERE name IN ('Directors', 'الإدارة');
