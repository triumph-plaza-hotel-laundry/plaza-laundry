import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260711150000_department_item_categories.sql',
);
const outputPath = join(process.cwd(), 'supabase', 'manual', 'department_item_categories_setup.sql');
const body = readFileSync(migrationPath, 'utf8');

writeFileSync(
  outputPath,
  `-- Run in Supabase SQL Editor (categories-only migration)\n\n${body}\n`,
  'utf8',
);

console.log(`Wrote ${outputPath}`);
