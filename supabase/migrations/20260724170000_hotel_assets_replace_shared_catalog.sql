-- Hotel Employee Assets: replace the shared asset_items catalog.
-- Retires all current catalog entries from future selection lists.
-- Keeps rows still referenced by receipt history (ON DELETE RESTRICT).
-- Does not change departments, employees, receipts, quantities, or UI.

ALTER TABLE asset_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_asset_items_is_active
  ON asset_items (is_active);

-- Remove every current catalog entry from future selection lists.
UPDATE asset_items
SET is_active = false;

-- Hard-delete retired items that are not used in any receipt history.
DELETE FROM asset_items
WHERE is_active = false
  AND id NOT IN (
    SELECT DISTINCT item_id
    FROM asset_receipt_items
  );

-- Exact replacement catalog (names and order as specified).
INSERT INTO asset_items (name, is_active)
VALUES
  ('بدله رجالي', true),
  ('بدله حريمي', true),
  ('بدله بلمان', true),
  ('بلوزه', true),
  ('قميص ابيض', true),
  ('قميص امن', true),
  ('قميص مشرف هاوس', true),
  ('قميص امن صناعي', true),
  ('بنطلون ابيض', true),
  ('بنطلون اسود', true),
  ('بنطلون كحلي', true),
  ('بنطلون حريمي', true),
  ('بنطلون رياضي', true),
  ('تيشيرت رياضي', true),
  ('ترنج رياضي', true),
  ('طقم هاوس حريمي', true),
  ('طقم هاوس رجالي', true),
  ('طقم مشرف هاوس', true),
  ('طقم امن صناعي', true),
  ('طقم استيورد عمال', true),
  ('طقم استيورد مشرفين', true),
  ('طقم مطعم رئيسي', true),
  ('طقم مطعم لبناني', true),
  ('طقم كوفي شوب', true),
  ('طقم روم سيرفس', true),
  ('طقم صيانه مشرفين', true),
  ('طقم صيانه عمال', true),
  ('طقم كافتريا', true),
  ('طقم شيشه', true),
  ('طقم مخزن', true),
  ('جاكت حفالات', true),
  ('جاكت امن', true),
  ('جاكت مخازن', true),
  ('جاكت شيف عمومي', true),
  ('جاكت مساعد شيف', true),
  ('جاكت مطبخ ابيض', true),
  ('جاكت مطبخ حريمي', true),
  ('فيست', true),
  ('بالطو ابيض', true),
  ('تيشيرت ابيض نص كم', true),
  ('تيشيرت ابيض كم', true),
  ('بلوفر', true),
  ('ابرون', true),
  ('مريله جلد', true),
  ('كرافت', true),
  ('بيبيونه', true)
ON CONFLICT (name) DO UPDATE
SET is_active = EXCLUDED.is_active;

NOTIFY pgrst, 'reload schema';
