-- Relational laundry programs and chemicals (replaces JSONB documents for these catalogs)

CREATE TABLE IF NOT EXISTS washing_programs (
  id INTEGER PRIMARY KEY,
  title_en TEXT NOT NULL DEFAULT '',
  title_ar TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS washing_program_parameters (
  program_id INTEGER PRIMARY KEY REFERENCES washing_programs(id) ON DELETE CASCADE,
  duration_min INTEGER NOT NULL DEFAULT 0,
  temp_badge_en TEXT NOT NULL DEFAULT '',
  temp_badge_ar TEXT NOT NULL DEFAULT '',
  footer_en TEXT NOT NULL DEFAULT '',
  footer_ar TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS washing_program_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id INTEGER NOT NULL REFERENCES washing_programs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  process_en TEXT NOT NULL DEFAULT '',
  process_ar TEXT NOT NULL DEFAULT '',
  water_level TEXT NOT NULL DEFAULT '',
  temperature_en TEXT NOT NULL DEFAULT '',
  temperature_ar TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT washing_program_steps_program_step_unique UNIQUE (program_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_washing_programs_sort_order
  ON washing_programs (sort_order, id);

CREATE INDEX IF NOT EXISTS idx_washing_program_steps_program_id
  ON washing_program_steps (program_id, step_number);

CREATE TABLE IF NOT EXISTS laundry_chemicals (
  id INTEGER PRIMARY KEY,
  product_code TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '/chemicals/product.svg',
  name_en TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  category_en TEXT NOT NULL DEFAULT '',
  category_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  how_it_works_en TEXT NOT NULL DEFAULT '',
  how_it_works_ar TEXT NOT NULL DEFAULT '',
  usage_en TEXT NOT NULL DEFAULT '',
  usage_ar TEXT NOT NULL DEFAULT '',
  dosage_en TEXT NOT NULL DEFAULT '',
  dosage_ar TEXT NOT NULL DEFAULT '',
  safety_en TEXT NOT NULL DEFAULT '',
  safety_ar TEXT NOT NULL DEFAULT '',
  storage_en TEXT NOT NULL DEFAULT '',
  storage_ar TEXT NOT NULL DEFAULT '',
  technical_footer_en TEXT NOT NULL DEFAULT '',
  technical_footer_ar TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '{"en":[],"ar":[]}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '{"en":[],"ar":[]}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laundry_chemicals_sort_order
  ON laundry_chemicals (sort_order, id);

CREATE TABLE IF NOT EXISTS chemical_technical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id INTEGER NOT NULL REFERENCES laundry_chemicals(id) ON DELETE CASCADE,
  row_key TEXT NOT NULL,
  label_en TEXT NOT NULL DEFAULT '',
  label_ar TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  value_ar TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT chemical_technical_info_chemical_key_unique UNIQUE (chemical_id, row_key)
);

CREATE INDEX IF NOT EXISTS idx_chemical_technical_info_chemical_id
  ON chemical_technical_info (chemical_id, sort_order);

ALTER TABLE washing_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE washing_program_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE washing_program_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_technical_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS washing_programs_all ON washing_programs;
DROP POLICY IF EXISTS washing_program_parameters_all ON washing_program_parameters;
DROP POLICY IF EXISTS washing_program_steps_all ON washing_program_steps;
DROP POLICY IF EXISTS laundry_chemicals_all ON laundry_chemicals;
DROP POLICY IF EXISTS chemical_technical_info_all ON chemical_technical_info;

CREATE POLICY washing_programs_all ON washing_programs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY washing_program_parameters_all ON washing_program_parameters
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY washing_program_steps_all ON washing_program_steps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY laundry_chemicals_all ON laundry_chemicals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY chemical_technical_info_all ON chemical_technical_info
  FOR ALL USING (true) WITH CHECK (true);
