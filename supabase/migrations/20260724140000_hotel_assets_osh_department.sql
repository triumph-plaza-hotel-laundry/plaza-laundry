-- Add Occupational Safety and Health (OSH) to Hotel Employee Assets departments.
-- Idempotent: safe on databases that already ran the original seed.

INSERT INTO asset_departments (name)
SELECT 'Occupational Safety and Health'
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_departments
  WHERE name IN (
    'Occupational Safety and Health',
    'Occupational Safety and Health (OSH)',
    'السلامة والصحة المهنية'
  )
);
